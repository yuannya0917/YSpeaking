import React, { useState } from "react";
import { Input, Button } from "antd";
import classNames from "classnames";
import styles from './ChattingInput.module.css'; // Assuming you have a CSS file for styling
import { ArrowUpOutlined, AudioOutlined } from '@ant-design/icons';
export const ChattingInput: React.FC = () => {
    const [sending, setSending] = useState(false)
    const [recording, setRecording] = useState(false)

    const chattingInputRecordingCls = classNames(
        styles.chattingInputRecording,
        recording && styles.isRecording
    )
    const chattingInputSendingCls = classNames(
        styles.chattingInputSending,
        sending && styles.isSending
    )

    const handleSend = () => {
        setSending(sending => !sending)
    }

    const handleRecording = () => {
        setRecording(recording => !recording)
    }
    return (
        <div className={styles.chattingInput}>
            <Input.TextArea
                className={styles.chattingInputField}
                autoSize={{ minRows: 1 }} />
            <div className={styles.chattingInputActions}>
                <div className={chattingInputRecordingCls}>
                    {recording?(
                        <Button
                        shape="circle"
                        onClick={handleRecording}
                    >
                        <AudioOutlined />
                    </Button>
                    ):(
                        <Button
                            onClick={handleRecording}
                        >
                            recording
                        </Button>
                    )}
                    
                </div>

                <div className={chattingInputSendingCls}>
                        <Button
                        shape="circle"
                        type="primary"
                        onClick={handleSend}
                    >
                        <ArrowUpOutlined />
                    </Button>
                    
                </div>

            </div>
        </div>
    );
};

export default ChattingInput;
