import React from 'react'
import { Button, Input } from 'antd'
import classNames from 'classnames'
import { ArrowUpOutlined, AudioOutlined } from '@ant-design/icons'
import { ChatUpload } from '../ChatUpload/ChatUpload'
import type { UploadFile } from 'antd'
import styles from './ChatComposer.module.css'

interface ChatComposerProps {
    value: string
    recording: boolean
    onChange: (next: string) => void
    onSend: () => void
    onStartRecording: () => void
    onStopRecording: () => void
    files: UploadFile[]
    onFilesChange: React.Dispatch<React.SetStateAction<UploadFile[]>>
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
    value,
    recording,
    onChange,
    onSend,
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
                            >
                                <AudioOutlined />
                            </Button>
                        )}

                    </div>

                    <div className={chattingInputSendingCls}>
                        <Button
                            shape="circle"
                            type="primary"
                            onClick={recording ? () => { } : onSend}
                        >
                            <ArrowUpOutlined />
                        </Button>

                    </div>

                </div>
            </div>
            <div className={styles.helperText}>提示：可以语音转写或直接输入文本后发送</div>
        </div>
    )
}

export default ChatComposer
