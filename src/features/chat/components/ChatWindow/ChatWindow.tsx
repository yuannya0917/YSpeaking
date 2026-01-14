import React, { useEffect, useMemo, useRef, useState } from 'react'
import { UserMessage } from '../UserMessage/UserMessage'
import { AiMessage } from '../AiMessage/AiMessage'
import { ChatComposer } from '../ChatComposer/ChatComposer'
import type { UploadFile } from 'antd'
import styles from './ChatWindow.module.css'
import type { ChatAttachment, ChatMessageModel } from '../../api/mockChatApi'


interface ChatWindowProps {
    title?: string
    messages: ChatMessageModel[]
    value: string
    recording: boolean
    onChange: (next: string) => void
    onSend: () => void | Promise<void>
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
    onChange,
    onSend,
    onStartRecording,
    onStopRecording,
    files,
    onFilesChange,
    attachments,
}) => {
    const headerRef = useRef<HTMLDivElement | null>(null)
    const [headerHeight, setHeaderHeight] = useState(0)
    const composerDockRef = useRef<HTMLDivElement | null>(null)
    const [composerHeight, setComposerHeight] = useState(0)

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
                    </div>
                </div>

                <div className={styles.messagesScrollArea} style={messagesStyle}>
                    <div className={styles.messagesContent}>
                        {messages && messages.length === 0 ? (
                            <div className={styles.emptyState}>开始新的对话，支持文字/语音输入</div>
                        ) : (
                            messages.map((record, index) => (
                                record.role === 'assistant' ? (
                                    <AiMessage
                                        key={`${index}-${record.text.slice(0, 8)}`}
                                        content={record.text}
                                        attachments={record.attachments}
                                    />
                                ) : (
                                    <UserMessage
                                        key={`${index}-${record.text.slice(0, 8)}`}
                                        content={record.text}
                                        attachments={record.attachments}
                                    />
                                )
                            ))
                        )}

                        {attachments && attachments.length > 0 && (
                            <div className={styles.attachmentsPanel}>
                                <div className={styles.attachmentsTitle}>已发送文件</div>
                                <ul className={styles.attachmentsList}>
                                    {attachments.map((file) => (
                                        <li key={file.uid} className={styles.attachmentsItem}>
                                            <span className={styles.attachmentsName}>{file.name}</span>
                                            <span className={styles.attachmentsSize}>
                                                {file.size !== undefined ? `${(file.size / 1024).toFixed(2)} KB` : '未知大小'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div ref={composerDockRef} className={styles.composerDock}>
                    <div className={styles.composerInner}>
                        <ChatComposer
                            value={value}
                            recording={recording}
                            onChange={onChange}
                            onSend={onSend}
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
