import { ChatSidebar } from '../../features/chat/components/ChatSidebar/ChatSidebar'
import { ChatWindow } from '../../features/chat/components/ChatWindow/ChatWindow'
import { useChatController } from '../../features/chat/hooks/useChatController'

import styles from './ChatPage.module.css'

const ChatPage: React.FC = () => {
    const {
        conversations,
        activeConversationId,
        setActiveConversationId,
        activeConversation,
        messages,
        attachments,
        value,
        recording,
        startRecording,
        stopRecording,
        aiReplying,
        uploadedFiles,
        setUploadedFiles,
        onChange,
        onSend,
        onStopGenerating,
        onCreateConversation,
        onDeleteConversation,
        onRenameConversation,
    } = useChatController()

    return (
        <div className={styles.layout}>
            <ChatSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelect={setActiveConversationId}
                onCreate={onCreateConversation}
                onDelete={onDeleteConversation}
                onRename={onRenameConversation}
            />

            <ChatWindow
                title={activeConversation?.title || '当前对话'}
                messages={messages}
                value={value}
                recording={recording}
                aiReplying={aiReplying}
                onChange={onChange}
                onSend={onSend}
                onStopGenerating={onStopGenerating}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                attachments={attachments}
            />
        </div>
    )
}

export default ChatPage