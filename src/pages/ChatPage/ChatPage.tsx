import React, { useState, useRef, useEffect } from 'react'
import type { UploadFile } from 'antd'
import type { RcFile } from 'antd/es/upload'
import { ChatSidebar } from '../../features/chat/components/ChatSidebar/ChatSidebar'
import { ChatWindow } from '../../features/chat/components/ChatWindow/ChatWindow'
import Recorder from 'recorder-core'
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'
import {
    listConversations,
    listMessages,
    sendMessage,
    createConversation,
    deleteConversation,
    renameConversation,
    generateAssistantReply,
    uploadAttachments,
    type Conversation,
    type ChatMessageModel,
    type ChatAttachment,
    type ChatCompletionMessage,
    type ChatCompletionContent,
} from '../../features/chat/api/mockChatApi'

import styles from './ChatPage.module.css'

const ChatPage: React.FC = () => {
    // 录音实例 & 服务端回传缓存
    const recRef = useRef<any>(null) // recorder-core 实例
    const serverMessageRef = useRef<any>(null) // 最近一次 WS 回包
    const senVoiWsRef = useRef<WebSocket | null>(null) // 语音转写 WS 连接
    // 文本输入区
    const [value, setValue] = useState<string>('') // 输入框当前内容（含草稿/转写）
    const [recording, setRecording] = useState(false) // 是否录音中
    // 文件上传
    const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]) // 待发送附件
    // 语音转写返回
    const [serverMessagesIsFinal, setServerMessageIsFinal] = useState(false) // WS 是否标记最终
    const [serverMessages, setServerMessages] = useState<string>('') // WS 增量转写内容
    // 会话与消息（模拟后端）
    const [conversations, setConversations] = useState<Conversation[]>([]) // 会话列表
    const [conversationMessages, setConversationMessages] = useState<Record<string, ChatMessageModel[]>>({}) // 各会话消息
    const [conversationAttachments, setConversationAttachments] = useState<Record<string, ChatAttachment[]>>({}) // 各会话附件
    const [draftsByConversation, setDraftsByConversation] = useState<Record<string, string>>({}) // 各会话草稿
    const [activeConversationId, setActiveConversationId] = useState('') // 当前选中会话 ID
    const [aiReplying, setAiReplying] = useState(false) // AI 是否在回复中
    const activeConversation = conversations.find(c => c.id === activeConversationId)

    // 初次加载会话列表（模拟后端）
    useEffect(() => {
        let cancelled = false
        const loadConversations = async () => {
            const list = await listConversations()
            if (cancelled) return
            setConversations(list)
            setDraftsByConversation(prev => {
                const merged: Record<string, string> = { ...prev }
                list.forEach(conv => {
                    if (merged[conv.id] === undefined) merged[conv.id] = ''
                })
                return merged
            })
            if (!activeConversationId && list.length > 0) {
                setActiveConversationId(list[0].id)
            }
        }
        loadConversations()
        return () => { cancelled = true }
    }, [])

    // 切换会话时拉取消息
    useEffect(() => {
        if (!activeConversationId) return
        let cancelled = false
        const loadMessagesByConversation = async () => {
            const list = await listMessages(activeConversationId)
            if (cancelled) return
            setConversationMessages(prev => ({ ...prev, [activeConversationId]: list }))
            const attachments = list.flatMap(msg => msg.attachments || [])
            setConversationAttachments(prev => ({ ...prev, [activeConversationId]: attachments }))
        }
        loadMessagesByConversation()
        return () => { cancelled = true }
    }, [activeConversationId])

    // 初始化语音转写 WebSocket，负责把录音 mp3 分片推给后端，接收转写文本
    useEffect(() => {
        const senvoiws = new WebSocket('ws://127.0.0.1:8000/api/realtime/ws')
        senVoiWsRef.current = senvoiws

        senvoiws.onopen = () => {
            console.log('WebSocket连接已打开')
        }

        senvoiws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data)
                serverMessageRef.current = message

                const text = message.data?.raw_text

                if (text) {
                    console.log('收到消息:', text)
                    setServerMessages(text)
                    setServerMessageIsFinal(message.is_final)
                }
            } catch (error) {
                console.error('解析消息失败:', error)
            }
        }

        return () => {
            if (senvoiws.readyState === WebSocket.OPEN) {
                senvoiws.close()
            }
        }

    }, [])

    // 将转写内容实时合并到输入框，收到 is_final 时清空临时文本
    useEffect(() => {
        if (!activeConversationId) return
        // 仅在有新转写或最终标记时处理，避免与手动输入互相触发循环
        if (!serverMessages && !serverMessagesIsFinal) return
        setValue((prev) => {
            const mergedValue = prev + serverMessages
            setDraftsByConversation(drafts => ({
                ...drafts,
                [activeConversationId]: mergedValue
            }))
            if (serverMessagesIsFinal) {
                setServerMessages('')
                setServerMessageIsFinal(false)
            }
            return mergedValue
        })
    }, [serverMessages, serverMessagesIsFinal, activeConversationId])

    // 开始录音：使用 recorder-core 采集 mp3，并在回调中把分片发到 WS
    const startRecording = async () => {
        recRef.current = Recorder({
            type: 'mp3',
            sampleRate: 16000,
            bitRate: 16,
            takeoffEncodeChunk(chunkBytes: Uint8Array) {
                if (senVoiWsRef.current && senVoiWsRef.current.readyState === WebSocket.OPEN && chunkBytes.length > 0) {
                    senVoiWsRef.current.send(chunkBytes.buffer)
                }
            }
        })

        if (recRef.current !== null) {
            const rec = recRef.current
            rec.open(() => {
                rec.start()
                setRecording(true)
            })
        }
    }

    // 停止录音并关闭设备，复位状态
    const stopRecording = () => {
        console.log('stopRecording')
        if (recRef.current !== null) {
            recRef.current.stop(() => {
            })
            recRef.current.close(() => {
                console.log('录音已停止并关闭')
                recRef.current = null
                setRecording(false)
            })
        }
    }

    // 切换会话时同步草稿
    useEffect(() => {
        if (!activeConversationId) return
        const draft = draftsByConversation[activeConversationId] || ''
        setValue(draft)
    }, [activeConversationId, draftsByConversation])

    const fileToDataUrl = (file: RcFile) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(file)
    })

    const fileToArrayBuffer = (file: RcFile) => new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = (err) => reject(err)
        reader.readAsArrayBuffer(file)
    })

    const fileToText = (file: RcFile, maxLen = 4000) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const content = (reader.result as string) || ''
            resolve(content.slice(0, maxLen))
        }
        reader.onerror = (err) => reject(err)
        reader.readAsText(file)
    })

    const truncateWithNotice = (text: string, maxLen = 4000) => {
        if (text.length <= maxLen) return text
        return `${text.slice(0, maxLen)}\n\n……(已截断，原文长度约 ${text.length} 字符)`
    }

    const buildImageContents = async (files: UploadFile[]): Promise<ChatCompletionContent[]> => {
        const imageFiles = files.filter(f => f.type?.startsWith('image/') && f.originFileObj)
        const contents: ChatCompletionContent[] = []
        for (const img of imageFiles) {
            const dataUrl = await fileToDataUrl(img.originFileObj as RcFile)
            contents.push({
                type: 'image_url',
                image_url: { url: dataUrl },
            })
        }
        return contents
    }

    const buildDocumentContents = async (files: UploadFile[]): Promise<ChatCompletionContent[]> => {
        const docs = files.filter(f => !f.type?.startsWith('image/') && f.originFileObj)
        const contents: ChatCompletionContent[] = []
        const textLike = docs.filter(f => {
            const name = f.name?.toLowerCase() || ''
            const extText = /\.(txt|md|log|csv|tsv|yaml|yml|ini|conf|cfg)$/i.test(name)
            return (
                f.type?.startsWith('text/') ||
                f.type === 'application/json' ||
                (!f.type && extText)
            )
        })
        for (const doc of textLike) {
            try {
                const text = await fileToText(doc.originFileObj as RcFile)
                contents.push({
                    type: 'text',
                    text: `【文件:${doc.name}】\n${truncateWithNotice(text)}`,
                })
            } catch {
                contents.push({
                    type: 'text',
                    text: `【文件:${doc.name}】无法读取内容（前端解析失败）`,
                })
            }
        }

        const docxLike = docs.filter(f =>
            f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            f.name.toLowerCase().endsWith('.docx')
        )
        if (docxLike.length > 0) {
            const mammoth = await import('mammoth/mammoth.browser.js') as typeof import('mammoth/mammoth.browser.js')
            for (const doc of docxLike) {
                try {
                    const buffer = await fileToArrayBuffer(doc.originFileObj as RcFile)
                    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
                    const raw = (result.value || '').replace(/\s+/g, ' ').trim()
                    const text = raw ? truncateWithNotice(raw) : '【内容为空或无法提取】'
                    contents.push({
                        type: 'text',
                        text: `【文件:${doc.name}】\n${text}`,
                    })
                } catch {
                    contents.push({
                        type: 'text',
                        text: `【文件:${doc.name}】无法读取内容（docx 解析失败）`,
                    })
                }
            }
        }
        return contents
    }

    const buildAttachmentSummary = (
        files: UploadFile[],
        uploaded: ChatAttachment[] | undefined
    ): ChatCompletionContent[] => {
        if (!files.length) return []
        const summaries: ChatCompletionContent[] = []
        files.forEach(file => {
            const url = uploaded?.find(a => a.uid === file.uid)?.url
            const size = file.size ? `${(file.size / 1024).toFixed(1)} KB` : '未知大小'
            const type = file.type || '未知类型'
            summaries.push({
                type: 'text',
                text: `【附件:${file.name}】类型:${type} 大小:${size}${url ? ` 地址:${url}` : ''}`,
            })
        })
        return summaries
    }

    // 发送文本与附件（模拟后端保存 + 传给 AI）
    const handleSend = async () => {
        if (aiReplying) return
        const text = value.trim()
        const hasFiles = uploadedFiles.length > 0
        if (!text && !hasFiles) return
        if (!activeConversationId) return

        setAiReplying(true)
        try {
            let attachmentsToSend: ChatAttachment[] | undefined
            if (hasFiles) {
                attachmentsToSend = await uploadAttachments(uploadedFiles)
                if (!attachmentsToSend || attachmentsToSend.length === 0) {
                    throw new Error('上传附件失败或未返回文件信息')
                }
            }

            const textToSend = text
                || (attachmentsToSend?.length
                    ? `发送了附件：${attachmentsToSend.map(a => a.name || '未命名附件').join('、')}`
                    : '')

            const imageContents = hasFiles ? await buildImageContents(uploadedFiles) : []
            const docContents = hasFiles ? await buildDocumentContents(uploadedFiles) : []
            const summaryContents = hasFiles ? buildAttachmentSummary(uploadedFiles, attachmentsToSend) : []
            const userContentChunks: ChatCompletionContent[] = []
            if (textToSend) {
                userContentChunks.push({ type: 'text', text: textToSend })
            }
            userContentChunks.push(...summaryContents, ...imageContents, ...docContents)

            const savedMessage = await sendMessage(activeConversationId, {
                text: textToSend,
                attachments: attachmentsToSend,
                role: 'user',
            })

            setConversationMessages(prev => {
                const current = prev[activeConversationId] || []
                return {
                    ...prev,
                    [activeConversationId]: [...current, savedMessage],
                }
            })

            if (savedMessage.attachments && savedMessage.attachments.length > 0) {
                setConversationAttachments(prev => {
                    const current = prev[activeConversationId] || []
                    return {
                        ...prev,
                        [activeConversationId]: [...current, ...savedMessage.attachments!],
                    }
                })
            }

            // 调用 Qwen 生成回复（携带图片为多模态输入）
            const history = [...(conversationMessages[activeConversationId] || []), savedMessage]
            const llmMessages: ChatCompletionMessage[] = history.map(msg => {
                const role = msg.role ?? 'user'
                if (msg.id === savedMessage.id && userContentChunks.length > 0) {
                    // 当前消息，使用多模态内容（文本+图片）
                    if (userContentChunks.length === 1 && userContentChunks[0].type === 'text') {
                        return { role, content: (userContentChunks[0] as Extract<ChatCompletionContent, { type: 'text' }>).text }
                    }
                    return { role, content: userContentChunks }
                }

                const attachmentNote = msg.attachments?.length
                    ? `\n[附件] ${msg.attachments.map(a => a.name || a.uid).join('、')}`
                    : ''
                return {
                    role,
                    content: `${msg.text}${attachmentNote}`,
                }
            })
            const aiText = await generateAssistantReply(llmMessages)
            const aiMessage = await sendMessage(activeConversationId, {
                text: aiText,
                role: 'assistant',
            })
            setConversationMessages(prev => {
                const current = prev[activeConversationId] || []
                return {
                    ...prev,
                    [activeConversationId]: [...current, aiMessage],
                }
            })

            setValue('')
            setDraftsByConversation(prev => ({
                ...prev,
                [activeConversationId]: ''
            }))
            setUploadedFiles([])
        } catch (error) {
            console.error('发送或生成回复失败', error)
        } finally {
            setAiReplying(false)
        }
    }

    const handleInputChange = (nextValue: string) => {
        setValue(nextValue)
        setDraftsByConversation(prev => ({
            ...prev,
            [activeConversationId]: nextValue
        }))
    }

    const handleCreateConversation = async () => {
        const newConv = await createConversation()
        setConversations(prev => [newConv, ...prev])
        setConversationMessages(prev => ({ ...prev, [newConv.id]: [] }))
        setConversationAttachments(prev => ({ ...prev, [newConv.id]: [] }))
        setDraftsByConversation(prev => ({ ...prev, [newConv.id]: '' }))
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

        const nextConversations = prevConversations.filter(conv => conv.id !== id)
        const removedIndex = prevConversations.findIndex(conv => conv.id === id)
        const fallback = nextConversations[removedIndex] || nextConversations[removedIndex - 1] || nextConversations[0]
        const nextActive = prevActiveId === id ? (fallback?.id || '') : prevActiveId

        // 乐观更新 UI，先移除列表
        setConversations(nextConversations)
        setConversationMessages(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        setConversationAttachments(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        setDraftsByConversation(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        setActiveConversationId(nextActive)
        if (!nextActive) {
            setValue('')
        }

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
            setConversations(prev =>
                prev.map(conv => (conv.id === id ? { ...conv, title: updated.title } : conv))
            )
        } catch (error) {
            console.error('重命名失败', error)
        }
    }

    return (
        <div className={styles.layout}>
            <ChatSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelect={setActiveConversationId}
                onCreate={handleCreateConversation}
                onDelete={handleDeleteConversation}
                onRename={handleRenameConversation}
            />

            <ChatWindow
                title={activeConversation?.title || '当前对话'}
                messages={conversationMessages[activeConversationId] || []}
                value={value}
                recording={recording}
                onChange={handleInputChange}
                onSend={handleSend}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                attachments={conversationAttachments[activeConversationId] || []}
            />
        </div>
    )
}

export default ChatPage