import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Button, message } from 'antd'
import { CopyOutlined, SoundOutlined, StopOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.min.css'
import styles from './AiMessage.module.css'

interface AiMessageProps {
  content: string
  attachments?: UploadFile[]
  loading?: boolean
  onStopGenerating?: () => void
}

export const AiMessage: React.FC<AiMessageProps> = ({
  content,
  attachments,
  loading = false,
  onStopGenerating,
}) => {
  // TTS（朗读）状态：SpeechSynthesis 是全局的，这里用 token 确保“只更新自己这条消息的按钮状态”
  const [speaking, setSpeaking] = useState(false)
  const speakTokenRef = useRef(0)

  const hasContent = Boolean((content || '').trim())

  const encodeBase64 = (raw: string) => {
    const bytes = new TextEncoder().encode(raw)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  const decodeBase64 = (b64: string) => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  }

  const renderedHtml = useMemo(() => {
    try {
      const renderer = new marked.Renderer()
      renderer.code = (code, infostring) => {
        const lang = (infostring || '').trim().split(/\s+/)[0]
        const hasLang = Boolean(lang) && Boolean(hljs.getLanguage(lang))

        let highlighted = ''
        let detected = lang || ''
        try {
          if (hasLang) {
            highlighted = hljs.highlight(code, { language: lang }).value
          } else {
            const auto = hljs.highlightAuto(code)
            highlighted = auto.value
            detected = auto.language || ''
          }
        } catch {
          highlighted = code
          detected = lang || ''
        }

        const displayLang = (detected || 'text').toLowerCase()
        const encoded = encodeBase64(code)
        return [
          `<div class="ys-code-block">`,
          `<div class="ys-code-header">`,
          `<span class="ys-code-lang">${displayLang}</span>`,
          `<button type="button" class="ys-code-copy" data-action="copy-code" data-code="${encoded}">复制</button>`,
          `</div>`,
          `<pre><code class="hljs language-${displayLang}">${highlighted}</code></pre>`,
          `</div>`,
        ].join('')
      }

      const parsed = marked.parse(content || '', { async: false, renderer } as never)
      if (typeof parsed === 'string') {
        return DOMPurify.sanitize(parsed, {
          ADD_TAGS: ['button'],
          ADD_ATTR: ['data-action', 'data-code', 'type', 'class'],
        })
      }
      return DOMPurify.sanitize(content || '')
    } catch {
      return DOMPurify.sanitize(content || '')
    }
  }, [content])

  const handleContentClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const btn = target?.closest?.('[data-action="copy-code"]') as HTMLElement | null
      if (!btn) return
      const b64 = btn.getAttribute('data-code')
      if (!b64) return
      const code = decodeBase64(b64)
      try {
        await navigator.clipboard.writeText(code)
        message.success('代码已复制')
      } catch {
        message.error('复制失败，请手动复制')
      }
    },
    []
  )

  const handleCopy = async () => {
    if (loading || !content) return
    try {
      await navigator.clipboard.writeText(content)
      message.success('已复制到剪贴板')
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = content
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        message.success('已复制到剪贴板')
      } catch {
        message.error('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  }

  const toSpeakText = useCallback((raw: string) => {
    // 实现思路：朗读时不需要 markdown 语法/代码块，做一个“足够好”的纯文本提取
    // 目标是 demo 体验：听起来顺滑、不读符号。
    let text = raw || ''
    // 去掉代码块
    text = text.replace(/```[\s\S]*?```/g, '')
    // 去掉行内 code `x`
    text = text.replace(/`([^`]+)`/g, '$1')
    // 链接 [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 去掉标题符号、列表符号
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '')
    text = text.replace(/^\s*[-*+]\s+/gm, '')
    text = text.replace(/^\s*\d+\.\s+/gm, '')
    // 合并多余空白
    text = text.replace(/\s+/g, ' ').trim()
    return text
  }, [])

  const pickZhVoice = useCallback(() => {
    const synth = window.speechSynthesis
    if (!synth) return null
    const voices = synth.getVoices?.() || []
    // 优先中文普通话，其次任何 zh 语音
    return (
      voices.find(v => /zh-CN/i.test(v.lang)) ||
      voices.find(v => /^zh/i.test(v.lang)) ||
      null
    )
  }, [])

  const handleSpeakToggle = useCallback(() => {
    if (loading || !content) return

    const synth = window.speechSynthesis
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      message.warning('当前浏览器不支持朗读（SpeechSynthesis）')
      return
    }

    // 如果正在朗读，点击即停止
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }

    const text = toSpeakText(content)
    if (!text) {
      message.info('没有可朗读的文本（可能全是代码块）')
      return
    }

    // 先停止其它正在播放的朗读，避免多条同时出声
    synth.cancel()

    const token = ++speakTokenRef.current
    const utter = new SpeechSynthesisUtterance(text)
    const voice = pickZhVoice()
    if (voice) utter.voice = voice
    utter.lang = 'zh-CN'
    utter.rate = 1
    utter.pitch = 1

    utter.onend = () => {
      if (speakTokenRef.current === token) setSpeaking(false)
    }
    utter.onerror = () => {
      if (speakTokenRef.current === token) setSpeaking(false)
      message.error('朗读失败，请重试')
    }

    setSpeaking(true)
    synth.speak(utter)
  }, [content, loading, pickZhVoice, speaking, toSpeakText])

  return (
    <div className={styles.wrapper}>
      <div className={styles.message}>
        <div
          className={styles.content}
          aria-busy={loading ? 'true' : undefined}
          aria-live="polite"
          onClick={handleContentClick}
        >
          {loading && (
            <div className={styles.loadingRow}>
              <span className={styles.loadingLabel}>AI 正在生成</span>
              <span className={styles.loadingDots} aria-hidden="true">
                <span className={styles.loadingDot} />
                <span className={styles.loadingDot} />
                <span className={styles.loadingDot} />
              </span>
            </div>
          )}

          {hasContent && <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />}
        </div>

        {attachments && attachments.length > 0 && (
          <div className={styles.attachments}>
            <ul className={styles.attachmentsList}>
              {attachments.map((attachment) => (
                <li key={attachment.uid} className={styles.attachmentsItem}>
                  <span className={styles.attachmentsName}>{attachment.name}</span>
                  <span className={styles.attachmentsSize}>
                    {attachment.size !== undefined ? `${(attachment.size / 1024).toFixed(2)} KB` : '未知大小'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          {loading && (
            <Button
              danger
              size="small"
              shape="circle"
              className={styles.stopGenButton}
              onClick={onStopGenerating}
              title="停止生成"
              disabled={!onStopGenerating}
            >
              <StopOutlined />
            </Button>
          )}
          <Button
            size="small"
            shape="circle"
            className={styles.ttsButton}
            onClick={handleSpeakToggle}
            title={speaking ? '停止朗读' : '朗读回复'}
            disabled={loading || !content}
          >
            {speaking ? <StopOutlined /> : <SoundOutlined />}
          </Button>
          <Button
            type="primary"
            size="small"
            shape="circle"
            className={styles.copyButton}
            onClick={handleCopy}
            title="复制消息"
            disabled={loading || !content}
          >
            <CopyOutlined />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AiMessage

