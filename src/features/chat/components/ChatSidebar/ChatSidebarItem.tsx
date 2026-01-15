import React, { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import classNames from 'classnames'
import styles from './ChatSidebar.module.css'
import type { Conversation } from '../../model/chatTypes'

interface ChatSidebarItemProps {
    conversation: Conversation
    isActive: boolean
    onSelect: (id: string) => void
    onDelete: (id: string) => void
    onRename: (id: string, title: string) => void | Promise<void>
}

export const ChatSidebarItem: React.FC<ChatSidebarItemProps> = ({
    conversation,
    isActive,
    onSelect,
    onDelete,
    onRename,
}) => {
    const [editing, setEditing] = useState(false)
    const [draftTitle, setDraftTitle] = useState(conversation.title)

    useEffect(() => {
        setDraftTitle(conversation.title)
    }, [conversation.title])

    const commitRename = async () => {
        const next = draftTitle.trim()
        if (!next) {
            setDraftTitle(conversation.title)
            setEditing(false)
            return
        }
        if (next !== conversation.title) {
            await onRename(conversation.id, next)
        }
        setEditing(false)
    }

    const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            await commitRename()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            setDraftTitle(conversation.title)
            setEditing(false)
        }
    }

    return (
        <div
            className={classNames(
                styles.conversationItem,
                isActive && styles.activeConversation,
                editing && styles.editing
            )}
            onClick={() => {
                if (editing) return
                onSelect(conversation.id)
            }}
        >
            <span className={styles.conversationTitle}>
                {editing ? (
                    <input
                        className={styles.renameInput}
                        value={draftTitle}
                        autoFocus
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={commitRename}
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    conversation.title
                )}
            </span>
            <button
                type="button"
                className={classNames(styles.actionButton, styles.renameButton)}
                onClick={(e) => {
                    e.stopPropagation()
                    setDraftTitle(conversation.title)
                    setEditing(true)
                }}
                aria-label="重命名对话"
                title="重命名对话"
            >
                ✎
            </button>
            <button
                type="button"
                className={classNames(styles.actionButton, styles.deleteButton)}
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conversation.id)
                }}
                aria-label="删除对话"
                title="删除对话"
            >
                ×
            </button>
        </div>
    )
}

export default ChatSidebarItem
