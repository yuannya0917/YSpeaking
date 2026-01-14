import React, { useState, useRef, useEffect } from 'react'
import type { UploadFile } from 'antd'
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
    generateAssistantReply,
    type Conversation,
    type ChatMessageModel,
    type ChatAttachment,
    type ChatCompletionMessage,
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

    // 发送文本与附件（模拟后端保存）
    const handleSend = async () => {
        if (aiReplying) return
        const text = value.trim()
        const hasFiles = uploadedFiles.length > 0
        if (!text && !hasFiles) return
        if (!activeConversationId) return

        setAiReplying(true)
        try {
            const savedMessage = await sendMessage(activeConversationId, {
                text,
                attachments: hasFiles ? uploadedFiles : undefined,
                role: 'user',
            })

            setConversationMessages(prev => {
                const current = prev[activeConversationId] || []
                return {
                    ...prev,
                    [activeConversationId]: [...current, savedMessage],
                }
            })

            if (hasFiles && savedMessage.attachments && savedMessage.attachments.length > 0) {
                const attachmentsToAppend = savedMessage.attachments
                setConversationAttachments(prev => {
                    const current = prev[activeConversationId] || []
                    return {
                        ...prev,
                        [activeConversationId]: [...current, ...attachmentsToAppend],
                    }
                })
            }

            // 调用 Qwen 生成回复
            const history = [...(conversationMessages[activeConversationId] || []), savedMessage]
            const llmMessages: ChatCompletionMessage[] = history.map(msg => ({
                role: msg.role ?? 'user',
                content: msg.text,
            }))
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
        } catch (error) {
            console.error('发送或生成回复失败', error)
        } finally {
            setValue('')
            setDraftsByConversation(prev => ({
                ...prev,
                [activeConversationId]: ''
            }))
            setUploadedFiles([])
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

    return (
        <div className={styles.layout}>
            <ChatSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelect={setActiveConversationId}
                onCreate={handleCreateConversation}
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