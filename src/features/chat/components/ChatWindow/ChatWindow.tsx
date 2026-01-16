import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'antd'
import { DownOutlined, StopOutlined } from '@ant-design/icons'
import { UserMessage } from '../UserMessage/UserMessage'
import { AiMessage } from '../AiMessage/AiMessage'
import { ChatComposer } from '../ChatComposer/ChatComposer'
import type { UploadFile } from 'antd'
import styles from './ChatWindow.module.css'
import type { ChatAttachment, ChatMessageModel } from '../../model/chatTypes'


interface ChatWindowProps {
    title?: string
    conversationId?: string
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
    conversationId,
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
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
    const [visibleStartIndex, setVisibleStartIndex] = useState(0)
    const pendingAdjustRef = useRef<{ prevHeight: number; prevTop: number } | null>(null)
    const lazyInitializedRef = useRef(false)

    const LAZY_THRESHOLD = 60
    const INITIAL_RENDER_COUNT = 40
    const LOAD_MORE_STEP = 20
    const NEAR_BOTTOM_PX = 120
    const JUMP_BOTTOM_OFFSET_PX = 40
    const LOAD_MORE_TRIGGER_PX = 80

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

    const displayedMessages = useMemo(() => {
        if (messages.length <= LAZY_THRESHOLD) return messages
        return messages.slice(visibleStartIndex)
    }, [messages, visibleStartIndex])

    useEffect(() => {
        if (!conversationId) return
        lazyInitializedRef.current = false
        if (messages.length <= LAZY_THRESHOLD) {
            setVisibleStartIndex(0)
            setAutoScrollEnabled(true)
            return
        }
        setVisibleStartIndex(Math.max(messages.length - INITIAL_RENDER_COUNT, 0))
        lazyInitializedRef.current = true
        setAutoScrollEnabled(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId])

    useEffect(() => {
        if (messages.length <= LAZY_THRESHOLD) {
            setVisibleStartIndex(0)
            lazyInitializedRef.current = false
            return
        }
        if (!lazyInitializedRef.current) {
            setVisibleStartIndex(Math.max(messages.length - INITIAL_RENDER_COUNT, 0))
            lazyInitializedRef.current = true
        }
    }, [messages.length, visibleStartIndex])

    useEffect(() => {
        const node = scrollAreaRef.current
        if (!node) return

        requestAnimationFrame(() => {
            const pending = pendingAdjustRef.current
            if (pending) {
                const nextHeight = node.scrollHeight
                node.scrollTop = pending.prevTop + (nextHeight - pending.prevHeight)
                pendingAdjustRef.current = null
                return
            }
            if (autoScrollEnabled) {
                node.scrollTop = node.scrollHeight
            }
        })
    }, [displayedMessages.length, autoScrollEnabled, visibleStartIndex])

    const handleJumpToBottom = () => {
        const node = scrollAreaRef.current
        if (!node) return
        node.scrollTop = Math.max(node.scrollHeight - node.clientHeight - JUMP_BOTTOM_OFFSET_PX, 0)
        setAutoScrollEnabled(true)
    }

    useEffect(() => {
        const node = scrollAreaRef.current
        if (!node) return

        const onScroll = () => {
            const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight
            setAutoScrollEnabled(distanceToBottom <= NEAR_BOTTOM_PX)

            if (
                messages.length > LAZY_THRESHOLD &&
                node.scrollTop <= LOAD_MORE_TRIGGER_PX &&
                visibleStartIndex > 0
            ) {
                pendingAdjustRef.current = { prevHeight: node.scrollHeight, prevTop: node.scrollTop }
                setVisibleStartIndex((prev) => Math.max(prev - LOAD_MORE_STEP, 0))
            }
        }

        node.addEventListener('scroll', onScroll)
        return () => node.removeEventListener('scroll', onScroll)
    }, [messages.length, visibleStartIndex])

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
                            displayedMessages.map((record) => (
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

                {!autoScrollEnabled && (
                    <Button
                        type="primary"
                        size="large"
                        shape="circle"
                        className={styles.jumpToBottomButton}
                        onClick={handleJumpToBottom}
                        icon={<DownOutlined />}
                        aria-label="跳到底部"
                        style={{ bottom: composerHeight + 16 }}
                    >
                    </Button>
                )}

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
