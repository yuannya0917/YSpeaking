import { useEffect, useRef, useState } from 'react'
import type { UploadFile } from 'antd'
import {
  createConversation,
  deleteConversation,
  generateAssistantReply,
  generateAssistantReplyStream,
  listConversations,
  listMessages,
  renameConversation,
  sendMessage,
  uploadAttachments,
} from '../api/chatApi'
import type { ChatAttachment, ChatMessageModel, Conversation } from '../model/chatTypes'
import { buildUserContentChunks } from '../services/attachments'
import { buildLlmMessages } from '../services/llm'
import { useSpeechDictation } from './useSpeechDictation'

export function useChatController() {
  const [value, setValue] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationMessages, setConversationMessages] = useState<Record<string, ChatMessageModel[]>>({})
  const [conversationAttachments, setConversationAttachments] = useState<Record<string, ChatAttachment[]>>({})
  const [draftsByConversation, setDraftsByConversation] = useState<Record<string, string>>({})
  const [activeConversationId, setActiveConversationId] = useState('')

  const [aiReplying, setAiReplying] = useState(false)
  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // 用 ref 记录当前占位消息 id，失败时便于清理（避免闭包拿错）
  const lastLoadingIdRef = useRef<string | null>(null)
  // 当前流式请求控制器（用于在组件卸载时取消）
  const activeStreamAbortRef = useRef<AbortController | null>(null)
  // 当前流属于哪个会话（防止用户切换会话后把 delta 写错地方）
  const activeStreamConversationIdRef = useRef<string | null>(null)
  const lastDraftRef = useRef<{ value: string; files: UploadFile[] } | null>(null)

  // 初次加载会话列表
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const list = await listConversations()
      if (cancelled) return
      setConversations(list)
      setDraftsByConversation((prev) => {
        const merged: Record<string, string> = { ...prev }
        list.forEach((conv) => {
          if (merged[conv.id] === undefined) merged[conv.id] = ''
        })
        return merged
      })
      if (!activeConversationId && list.length > 0) {
        setActiveConversationId(list[0].id)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 切换会话时拉取消息
  useEffect(() => {
    if (!activeConversationId) return
    let cancelled = false
    const load = async () => {
      const list = await listMessages(activeConversationId)
      if (cancelled) return
      setConversationMessages((prev) => ({ ...prev, [activeConversationId]: list }))
      const attachments = list.flatMap((msg) => msg.attachments || [])
      setConversationAttachments((prev) => ({ ...prev, [activeConversationId]: attachments }))
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeConversationId])

  // 组件卸载时终止可能仍在进行的流式请求
  useEffect(() => {
    return () => {
      activeStreamAbortRef.current?.abort()
      activeStreamAbortRef.current = null
    }
  }, [])

  const userStoppedRef = useRef(false)

  const stopGenerating = () => {
    userStoppedRef.current = true
    // 立刻让 UI 退出“生成中”（按钮/状态更跟手），实际中断由 abort 完成
    setAiReplying(false)

    // 先把 UI 状态收敛到“停止生成”，避免用户感觉没响应
    const loadingId = lastLoadingIdRef.current
    const conversationId = activeStreamConversationIdRef.current || activeConversationId
    if (loadingId && conversationId) {
      setConversationMessages((prev) => {
        const current = prev[conversationId] || []
        const next = current.map((m) => (m.id === loadingId ? { ...m, isLoading: false } : m))
        return { ...prev, [conversationId]: next }
      })
    }

    activeStreamAbortRef.current?.abort()
    activeStreamAbortRef.current = null

    const lastDraft = lastDraftRef.current
    if (lastDraft) {
      setValue(lastDraft.value)
      setDraftsByConversation((prev) => ({
        ...prev,
        [activeConversationId]: lastDraft.value,
      }))
      setUploadedFiles(lastDraft.files)
    }
  }

  // 切换会话时同步草稿到输入框
  useEffect(() => {
    if (!activeConversationId) return
    setValue(draftsByConversation[activeConversationId] || '')
  }, [activeConversationId, draftsByConversation])

  const { recording, startRecording, stopRecording } = useSpeechDictation({
    activeConversationId,
    value,
    draftsByConversation,
    setValue,
    setDraftsByConversation,
  })

  const handleInputChange = (nextValue: string) => {
    setValue(nextValue)
    setDraftsByConversation((prev) => ({
      ...prev,
      [activeConversationId]: nextValue,
    }))
  }

  const handleCreateConversation = async () => {
    const newConv = await createConversation()
    setConversations((prev) => [newConv, ...prev])
    setConversationMessages((prev) => ({ ...prev, [newConv.id]: [] }))
    setConversationAttachments((prev) => ({ ...prev, [newConv.id]: [] }))
    setDraftsByConversation((prev) => ({ ...prev, [newConv.id]: '' }))
    setActiveConversationId(newConv.id)
    setValue('')
  }

  const handleDeleteConversation = async (id: string) => {
    const prevConversations = conversations
    const prevMessages = conversationMessages
    const prevAttachments = conversationAttachments
    const prevDrafts = draftsByConversation
    const prevActiveId = activeConversationId
    const prevValue = value

    const nextConversations = prevConversations.filter((conv) => conv.id !== id)
    const removedIndex = prevConversations.findIndex((conv) => conv.id === id)
    const fallback =
      nextConversations[removedIndex] ||
      nextConversations[removedIndex - 1] ||
      nextConversations[0]
    const nextActive = prevActiveId === id ? fallback?.id || '' : prevActiveId

    // 乐观更新 UI
    setConversations(nextConversations)
    setConversationMessages((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setConversationAttachments((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setDraftsByConversation((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setActiveConversationId(nextActive)
    if (!nextActive) setValue('')

    try {
      await deleteConversation(id)
    } catch (error) {
      console.error('删除会话失败', error)
      // 回滚
      setConversations(prevConversations)
      setConversationMessages(prevMessages)
      setConversationAttachments(prevAttachments)
      setDraftsByConversation(prevDrafts)
      setActiveConversationId(prevActiveId)
      setValue(prevValue)
    }
  }

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      const updated = await renameConversation(id, title)
      setConversations((prev) =>
        prev.map((conv) => (conv.id === id ? { ...conv, title: updated.title } : conv))
      )
    } catch (error) {
      console.error('重命名失败', error)
    }
  }

  const handleSend = async () => {
    if (aiReplying) return
    const text = value.trim()
    const valueToRestore = value
    const filesToSend = uploadedFiles
    const hasFiles = filesToSend.length > 0
    if (!text && !hasFiles) return
    if (!activeConversationId) return
    const conversationId = activeConversationId

    userStoppedRef.current = false
    lastDraftRef.current = { value: valueToRestore, files: filesToSend }
    setAiReplying(true)
    const loadingMessageId = `loading-${Date.now()}-${Math.random().toString(16).slice(2)}`
    lastLoadingIdRef.current = loadingMessageId
    const abortController = new AbortController()
    activeStreamAbortRef.current = abortController
    activeStreamConversationIdRef.current = conversationId

    try {
      let attachmentsToSend: ChatAttachment[] | undefined
      if (hasFiles) {
        attachmentsToSend = await uploadAttachments(filesToSend)
        if (!attachmentsToSend || attachmentsToSend.length === 0) {
          throw new Error('上传附件失败或未返回文件信息')
        }
      }

      const textToSend =
        text ||
        (attachmentsToSend?.length
          ? `发送了附件：${attachmentsToSend.map((a) => a.name || '未命名附件').join('、')}`
          : '')

      const userContentChunks = await buildUserContentChunks({
        textToSend,
        uploadedFiles: filesToSend,
      })

      const savedMessage = await sendMessage(conversationId, {
        text: textToSend,
        attachments: attachmentsToSend,
        role: 'user',
      })

      setValue('')
      setDraftsByConversation((prev) => ({
        ...prev,
        [activeConversationId]: '',
      }))
      setUploadedFiles([])

      setConversationMessages((prev) => {
        const current = prev[conversationId] || []
        return {
          ...prev,
          [conversationId]: [...current, savedMessage],
        }
      })

      const loadingMessage: ChatMessageModel = {
        id: loadingMessageId,
        conversationId,
        role: 'assistant',
        text: '',
        createdAt: new Date().toISOString(),
        isLoading: true,
      }

      setConversationMessages((prev) => {
        const current = prev[conversationId] || []
        return {
          ...prev,
          [conversationId]: [...current, loadingMessage],
        }
      })

      if (savedMessage.attachments && savedMessage.attachments.length > 0) {
        setConversationAttachments((prev) => {
          const current = prev[conversationId] || []
          return {
            ...prev,
            [conversationId]: [...current, ...savedMessage.attachments!],
          }
        })
      }

      const history = [...(conversationMessages[conversationId] || []), savedMessage].filter(
        (msg) => !msg.isLoading
      )

      const llmMessages = buildLlmMessages({
        history,
        currentUserMessageId: savedMessage.id,
        currentUserContentChunks: userContentChunks,
      })

      // 流式：边接收边把内容追加到 loading 消息
      let aiText = ''
      try {
        aiText = await generateAssistantReplyStream(llmMessages, {
          signal: abortController.signal,
          onDelta: (delta) => {
            if (abortController.signal.aborted) return
            setConversationMessages((prev) => {
              const current = prev[conversationId] || []
              const next = current.map((m) =>
                m.id === loadingMessageId ? { ...m, text: `${m.text || ''}${delta}` } : m
              )
              return { ...prev, [conversationId]: next }
            })
          },
          onError: (err) => {
            // 某些上游会发非 JSON 的 data 行，这里只做 debug，不中断主流程
            console.debug('stream chunk parse error', err)
          },
        })
      } catch (error) {
        const err = error as { name?: string }
        const aborted = err?.name === 'AbortError'
        if (aborted || userStoppedRef.current) throw error
        console.warn('stream failed, fallback to non-stream', error)
        aiText = await generateAssistantReply(llmMessages)
      }
      const aiMessage = await sendMessage(conversationId, {
        text: aiText,
        role: 'assistant',
      })

      const analyzedAttachments = savedMessage.attachments || attachmentsToSend
      const aiMessageWithAttachments: ChatMessageModel = analyzedAttachments?.length
        ? { ...aiMessage, attachments: analyzedAttachments }
        : aiMessage

      setConversationMessages((prev) => {
        const current = prev[conversationId] || []
        const hasLoading = current.some((m) => m.id === loadingMessageId)
        return {
          ...prev,
          [conversationId]: hasLoading
            ? current.map((m) => (m.id === loadingMessageId ? aiMessageWithAttachments : m))
            : [...current, aiMessageWithAttachments],
        }
      })

    } catch (error) {
      const err = error as { name?: string; message?: string }
      const aborted = err?.name === 'AbortError'
      if (aborted && userStoppedRef.current) {
        // 用户主动停止生成：保留已生成部分，把 loading 状态置为 false
        const loadingId = lastLoadingIdRef.current
        if (loadingId) {
          setConversationMessages((prev) => {
            const current = prev[conversationId] || []
            const next = current.map((m) => (m.id === loadingId ? { ...m, isLoading: false } : m))
            return { ...prev, [conversationId]: next }
          })
        }
      } else {
        console.error('发送或生成回复失败', error)
        const errorText = `AI 回复失败${err?.message ? `：${err.message}` : '，请稍后重试。'}`
        const loadingId = lastLoadingIdRef.current
        setConversationMessages((prev) => {
          const current = prev[conversationId] || []
          const loadingIndex = loadingId
            ? current.findIndex((m) => m.id === loadingId)
            : -1
          if (loadingIndex >= 0) {
            const next = [...current]
            next[loadingIndex] = {
              ...next[loadingIndex],
              role: 'assistant',
              text: errorText,
              isLoading: false,
            }
            return { ...prev, [conversationId]: next }
          }

          const errorMessage: ChatMessageModel = {
            id: `error-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            conversationId,
            role: 'assistant',
            text: errorText,
            createdAt: new Date().toISOString(),
          }
          return { ...prev, [conversationId]: [...current, errorMessage] }
        })

        const lastDraft = lastDraftRef.current
        if (lastDraft) {
          setValue(lastDraft.value)
          setDraftsByConversation((prev) => ({
            ...prev,
            [activeConversationId]: lastDraft.value,
          }))
          setUploadedFiles(lastDraft.files)
        }
      }
    } finally {
      lastLoadingIdRef.current = null
      activeStreamAbortRef.current = null
      activeStreamConversationIdRef.current = null
      lastDraftRef.current = null
      setAiReplying(false)
    }
  }

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,

    messages: conversationMessages[activeConversationId] || [],
    attachments: conversationAttachments[activeConversationId] || [],

    value,
    recording,
    startRecording,
    stopRecording,

    aiReplying,
    uploadedFiles,
    setUploadedFiles,

    onChange: handleInputChange,
    onSend: handleSend,
    onStopGenerating: stopGenerating,
    onCreateConversation: handleCreateConversation,
    onDeleteConversation: handleDeleteConversation,
    onRenameConversation: handleRenameConversation,
  }
}

