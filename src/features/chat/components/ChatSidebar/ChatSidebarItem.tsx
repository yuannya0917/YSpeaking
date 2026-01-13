import React from 'react'
import classNames from 'classnames'
import styles from './ChatSidebar.module.css'
import type { Conversation } from '../../api/mockChatApi'

interface ChatSidebarItemProps {
    conversation: Conversation
    isActive: boolean
    onSelect: (id: string) => void
}

export const ChatSidebarItem: React.FC<ChatSidebarItemProps> = ({
    conversation,
    isActive,
    onSelect,
}) => {
    return (
        <div
            className={classNames(
                styles.conversationItem,
                isActive && styles.activeConversation
            )}
            onClick={() => onSelect(conversation.id)}
        >
            {conversation.title}
        </div>
    )
}

export default ChatSidebarItem
