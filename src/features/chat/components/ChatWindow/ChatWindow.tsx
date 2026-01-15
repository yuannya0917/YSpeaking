import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'antd'
import { StopOutlined } from '@ant-design/icons'
import { UserMessage } from '../UserMessage/UserMessage'
import { AiMessage } from '../AiMessage/AiMessage'
import { ChatComposer } from '../ChatComposer/ChatComposer'
import type { UploadFile } from 'antd'
import styles from './ChatWindow.module.css'
import type { ChatAttachment, ChatMessageModel } from '../../model/chatTypes'


interface ChatWindowProps {
    title?: string
    messages: ChatMessageModel[]
    value: string
    recording: boolean
    aiReplying: boolean
    onChange: (next: string) => void
    onSend: () => void | Promise<void>
    onStopGenerating: () => void
    onStartRecording: () => void
    onStopRecording: () => void
    files: UploadFile[]
    onFilesChange: React.Dispatch<React.SetStateAction<UploadFile[]>>
    attachments: ChatAttachment[]
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
    title = '当前对话',
    messages,
    value,
    recording,
    aiReplying,
    onChange,
    onSend,
    onStopGenerating,
    onStartRecording,
    onStopRecording,
    files,
    onFilesChange,
}) => {
    const headerRef = useRef<HTMLDivElement | null>(null)
    const [headerHeight, setHeaderHeight] = useState(0)
    const composerDockRef = useRef<HTMLDivElement | null>(null)
    const [composerHeight, setComposerHeight] = useState(0)
    const scrollAreaRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const el = composerDockRef.current
        if (!el) return

        const update = () => {
            // 取整数，避免小数导致滚动抖动
            setComposerHeight(Math.ceil(el.getBoundingClientRect().height))
        }

        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const messagesStyle = useMemo<React.CSSProperties>(() => {
        // 24 是消息区默认 padding
        return { paddingTop: 24 + headerHeight, paddingBottom: 24 + composerHeight }
    }, [composerHeight, headerHeight])

    // 自动滚动：仅在用户“接近底部”时才跟随（避免抢滚动）
    useEffect(() => {
        const el = scrollAreaRef.current
        if (!el) return
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        if (distanceToBottom < 120) {
            requestAnimationFrame(() => {
                const node = scrollAreaRef.current
                if (!node) return
                node.scrollTop = node.scrollHeight
            })
        }
    }, [messages])

    useEffect(() => {
        const el = headerRef.current
        if (!el) return

        const update = () => {
            setHeaderHeight(Math.ceil(el.getBoundingClientRect().height))
        }

        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    return (
        <main className={styles.chatPane}>
            <div className={styles.chatMain}>
                <div ref={headerRef} className={styles.chatHeader}>
                    <div className={styles.chatHeaderInner}>
                        <div className={styles.chatTitle}>{title}</div>
                        {aiReplying && (
                            <Button
                                danger
                                size="small"
                                className={styles.stopGeneratingButton}
                                onClick={onStopGenerating}
                                icon={<StopOutlined />}
                            >
                                中断
                            </Button>
                        )}
                    </div>
                </div>

                <div ref={scrollAreaRef} className={styles.messagesScrollArea} style={messagesStyle}>
                    <div className={styles.messagesContent}>
                        {messages && messages.length === 0 ? (
                            <div className={styles.emptyState}>开始新的对话，支持文字/语音输入</div>
                        ) : (
                            messages.map((record) => (
                                record.role === 'assistant' ? (
                                    <AiMessage
                                        key={record.id}
                                        content={record.text}
                                        attachments={record.attachments}
                                        loading={Boolean(record.isLoading)}
                                        onStopGenerating={record.isLoading ? onStopGenerating : undefined}
                                    />
                                ) : (
                                    <UserMessage
                                        key={record.id}
                                        content={record.text}
                                        attachments={record.attachments}
                                    />
                                )
                            ))
                        )}
                    </div>
                </div>

                <div ref={composerDockRef} className={styles.composerDock}>
                    <div className={styles.composerInner}>
                        <ChatComposer
                            value={value}
                            recording={recording}
                            aiReplying={aiReplying}
                            onChange={onChange}
                            onSend={onSend}
                            onStopGenerating={onStopGenerating}
                            onStartRecording={onStartRecording}
                            onStopRecording={onStopRecording}
                            files={files}
                            onFilesChange={onFilesChange}
                        />
                    </div>
                </div>
            </div>
        </main>
    )
}

export default ChatWindow
