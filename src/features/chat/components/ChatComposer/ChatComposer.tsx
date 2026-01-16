import React from 'react'
import { Button, Input } from 'antd'
import classNames from 'classnames'
import { ArrowUpOutlined, AudioOutlined, StopOutlined } from '@ant-design/icons'
import { ChatUpload } from '../ChatUpload/ChatUpload'
import type { UploadFile } from 'antd'
import styles from './ChatComposer.module.css'

interface ChatComposerProps {
    value: string
    recording: boolean
    aiReplying: boolean
    onChange: (next: string) => void
    onSend: () => void
    onStopGenerating: () => void
    onStartRecording: () => void
    onStopRecording: () => void
    files: UploadFile[]
    onFilesChange: React.Dispatch<React.SetStateAction<UploadFile[]>>
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
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
    const chattingInputRecordingCls = classNames(
        styles.chattingInputRecording,
        recording && styles.isRecording
    )
    const chattingInputSendingCls = classNames(styles.chattingInputSending)

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey) return
        if ((event.nativeEvent as KeyboardEvent).isComposing) return
        if (recording || aiReplying) return
        event.preventDefault()
        onSend()
    }

    return (
        <div className={styles.inputArea}>
            <ChatUpload files={files} onFilesChange={onFilesChange} />

            <div className={styles.chattingInput}>
                <div>
                    <Input.TextArea
                        className={styles.chattingInputField}
                        autoSize={{ minRows: 1 }}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <div className={styles.chattingInputActions}>
                    <div className={chattingInputRecordingCls}>
                        {recording ? (
                            <Button onClick={onStopRecording}>
                                recording
                            </Button>
                        ) : (
                            <Button
                                shape="circle"
                                onClick={onStartRecording}
                                disabled={aiReplying}
                            >
                                <AudioOutlined />
                            </Button>
                        )}

                    </div>

                    <div className={chattingInputSendingCls}>
                        <Button
                            shape="circle"
                            type={aiReplying ? 'default' : 'primary'}
                            danger={aiReplying}
                            onClick={recording ? () => { } : (aiReplying ? onStopGenerating : onSend)}
                        >
                            {aiReplying ? <StopOutlined /> : <ArrowUpOutlined />}
                        </Button>

                    </div>

                </div>
            </div>
            <div className={styles.helperText}>提示：可以语音转写或直接输入文本后发送</div>
        </div>
    )
}

export default ChatComposer
