import React, { useState } from 'react'
import { ChattingUpload } from '../../components/ChattingUpload/ChattingUpload.tsx'
import { ChattingMessage } from '../../components/ChattingMassage/ChattingMessage-clt.tsx'
import styles from './ChattingPage.module.css'
import { Button, Input } from 'antd'
import classNames from 'classnames';
import { ArrowUpOutlined, AudioOutlined } from '@ant-design/icons';

const ChattingPage: React.FC = () => {
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

        <div className={styles.chattingPage}>
            <div className={styles.chattingPageCltMessages}>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
                <ChattingMessage
                    content='这是一个测试消息'
                ></ChattingMessage>
            </div>

            
            
            <div className={styles.chattingPageInput}>
                <div >
                    <ChattingUpload />
                </div>

                {/*这里是输入框部分 */}
                <div className={styles.chattingInput}>
                    <div>
                        <Input.TextArea
                            className={styles.chattingInputField}
                            autoSize={{ minRows: 1 }} />

                    </div>
                    <div className={styles.chattingInputActions}>
                        <div className={chattingInputRecordingCls}>
                            {recording ? (
                                <Button
                                    shape="circle"
                                    onClick={handleRecording}
                                >
                                    <AudioOutlined />
                                </Button>
                            ) : (
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

            </div>

            <div></div>

        </div>
    )
}

export default ChattingPage