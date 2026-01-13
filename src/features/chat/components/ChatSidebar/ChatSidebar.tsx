import React from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import styles from './ChatSidebar.module.css'
import { ChatSidebarItem } from './ChatSidebarItem'
import type { Conversation } from '../../api/mockChatApi'

interface ChatSidebarProps {
    conversations: Conversation[]
    activeConversationId: string
    onSelect: (id: string) => void
    onCreate: () => void
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    conversations,
    activeConversationId,
    onSelect,
    onCreate,
}) => {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <div className={styles.brand}>YSpeaking</div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    block
                    onClick={onCreate}
                >
                    新建对话
                </Button>
            </div>
            <div className={styles.conversationList}>
                {conversations.map((conv) => (
                    <ChatSidebarItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onSelect={onSelect}
                    />
                ))}
            </div>
        </aside>
    )
}

export default ChatSidebar
