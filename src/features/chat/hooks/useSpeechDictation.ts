import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'

type SpeechRecognitionCtor = new () => SpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as any
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as SpeechRecognitionCtor | null
}

export function useSpeechDictation(params: {
  activeConversationId: string
  value: string
  draftsByConversation: Record<string, string>
  setValue: (next: string) => void
  setDraftsByConversation: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  const { activeConversationId, value, draftsByConversation, setValue, setDraftsByConversation } = params

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const stopRequestedRef = useRef(false)
  const speechBaseRef = useRef('')
  const speechInterimRef = useRef('')

  const [recording, setRecording] = useState(false)

  // 会话切换/组件卸载时：停止听写，避免把 A 会话的声音写进 B 会话
  useEffect(() => {
    return () => {
      try {
        stopRequestedRef.current = true
        recognitionRef.current?.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
  }, [activeConversationId])

  const startRecording = async () => {
    if (recording) return
    if (!activeConversationId) return

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      alert('当前浏览器不支持 Web Speech API。请用 Edge/Chrome 打开进行演示。')
      return
    }

    // base：开始录音前输入框内容；interim：中间结果（实时替换）
    speechBaseRef.current = draftsByConversation[activeConversationId] ?? value ?? ''
    speechInterimRef.current = ''
    stopRequestedRef.current = false

    const recognition = new Ctor()
    recognitionRef.current = recognition

    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let appendedFinal = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const transcript = res[0]?.transcript || ''
        if (!transcript) continue
        if (res.isFinal) appendedFinal += transcript
        else interim += transcript
      }

      if (appendedFinal) {
        speechBaseRef.current = `${speechBaseRef.current}${appendedFinal}`
      }
      speechInterimRef.current = interim

      const merged = `${speechBaseRef.current}${speechInterimRef.current}`
      setValue(merged)
      setDraftsByConversation((prev) => ({
        ...prev,
        [activeConversationId]: merged,
      }))
    }

    recognition.onerror = (e: any) => {
      console.error('SpeechRecognition error:', e)
      message.error('语音识别出错，请重试')
      setRecording(false)
    }

    recognition.onend = () => {
      // 某些情况下浏览器会自动结束；如果用户没点停止，就自动重启，提升 demo 稳定性
      if (!stopRequestedRef.current) {
        try {
          recognition.start()
          return
        } catch {
          // start 可能抛 InvalidStateError，忽略即可
        }
      }
      setRecording(false)
    }

    try {
      recognition.start()
      setRecording(true)
    } catch (e) {
      console.error('SpeechRecognition start failed:', e)
      message.error('语音识别启动失败，请重试')
      setRecording(false)
    }
  }

  const stopRecording = () => {
    stopRequestedRef.current = true
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    speechInterimRef.current = ''
    setRecording(false)
  }

  return {
    recording,
    startRecording,
    stopRecording,
  }
}

