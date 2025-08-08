import React, { useState, useRef, useEffect } from 'react'
import { ChattingUpload } from '../../components/ChattingUpload/ChattingUpload.tsx'
import { ChattingMessage } from '../../components/ChattingMassage/ChattingMessage-clt.tsx'
import Recorder from 'recorder-core'
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'

import styles from './ChattingPage.module.css'
import { Button, Input } from 'antd'
import classNames from 'classnames';
import { ArrowUpOutlined, AudioOutlined } from '@ant-design/icons';

const ChattingPage: React.FC = () => {
    const recRef= useRef<any>(null);
    const senVoiWsRef = useRef<WebSocket | null>(null);
    const [value,setValue] = useState<string>('')
    const [sending, setSending] = useState(false)
    const [recording, setRecording] = useState(false)
    const [messages, setMessages] = useState<string>('')


    useEffect(()=>{
        const senvoiws=new WebSocket('ws://127.0.0.1:8000/api/realtime/ws')
        senVoiWsRef.current=senvoiws

        senvoiws.onopen=()=>{
            console.log('WebSocket连接已打开');
        }

        senvoiws.onmessage=(event)=>{
            try{
                const message=JSON.parse(event.data)
                const text=message.data?.raw_text;

                if(text){
                    console.log('收到消息:', text)
                    setMessages(text)
                    setValue(preValue=>preValue+text)
                }
            }catch(error){
                console.error('解析消息失败:', error)
            }
        }

        return()=>{
            if(senvoiws.readyState===WebSocket.OPEN){
                senvoiws.close()
            }
        }

    },[])

    const chattingInputRecordingCls = classNames(
        styles.chattingInputRecording,
        recording && styles.isRecording
    )
    const chattingInputSendingCls = classNames(
        styles.chattingInputSending,
        sending && styles.isSending
    )

   
    const startRecording = async () => {
        recRef.current = Recorder({
            type:'mp3',
            sampleRate:16000,
            bitRate:16,
            takeoffEncodeChunk(chunkBytes:Uint8Array){
                if(senVoiWsRef.current&&senVoiWsRef.current.readyState===WebSocket.OPEN&&chunkBytes.length>0){
                    senVoiWsRef.current.send(chunkBytes.buffer)
                }
            }
        })

        if(recRef.current!==null){
            const rec = recRef.current
            rec.open(()=>{
            rec.start()
            setRecording(true)
        })
    }
}

    const stopRecording = () => {
        console.log('stopRecording')
        if (recRef.current!==null) {
            recRef.current.stop(() => {
                
            })
            recRef.current.close(() => {
                console.log('录音已停止并关闭');
                recRef.current = null
                setRecording(false)
            })
        }
    }

    const handleSend = () => {
        setSending(sending => !sending)
    }

    return (
        
        <div className={styles.chattingPage}>
            <div className={styles.chattingPageCltMessages}>

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
                            autoSize={{ minRows: 1 }}
                            value={value}
                            onChange={e=> setValue(e.target.value)}
                            >
                            </Input.TextArea>

                    </div>
                    <div className={styles.chattingInputActions}>
                        <div className={chattingInputRecordingCls}>
                            {recording ? (
                                <Button
                                    onClick={stopRecording}
                                >
                                    recording
                                </Button>
                            ) : (
                                <Button
                                    shape="circle"
                                    onClick={startRecording}
                                >
                                    <AudioOutlined />
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