import React from 'react'
import { ChatMessage } from '../ChatMessage/ChatMessage'
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
    return (
        <main className={styles.chatPane}>
            <div className={styles.chatHeader}>
                <div className={styles.chatTitle}>{title}</div>
            </div>

            <div className={styles.chattingPageCltMessages}>
                {messages && messages.length === 0 ? (
                    <div className={styles.emptyState}>开始新的对话，支持文字/语音输入</div>
                ) : (
                    messages.map((record, index) => (
                        <ChatMessage key={`${index}-${record.text.slice(0, 8)}`} content={record.text} attachments={record.attachments} />
                    ))
                )}
            </div>

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
        </main>
    )
}

export default ChatWindow
