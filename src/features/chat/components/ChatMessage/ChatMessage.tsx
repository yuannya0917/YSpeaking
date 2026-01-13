import React from "react";
import { Button, message } from "antd";
import styles from './ChatMessage.module.css';
import { CopyOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

interface ChatMessageProps {
  // 消息内容（当前仅文本，后续可扩展角色/状态）
  content: string;
  attachments?: UploadFile[];

}
export const ChatMessage: React.FC<ChatMessageProps> = ({ content, attachments }) => {
  // 复制消息文本，优先使用 Clipboard API，降级到 textarea 方案
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      message.success('已复制到剪贴板');
    } catch (error) {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        message.success('已复制到剪贴板');
      } catch (err) {
        message.error('复制失败，请手动复制');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={styles.cltChattingMessageWrapper}>
      <div className={styles.cltChattingMessage}>
        <div className={styles.cltChattingMessageContent}> {content} </div>

        {attachments && attachments.length > 0 && (
          <div className={styles.cltChattingMessageAttachments}>
            <ul className={styles.cltChattingMessageAttachmentsList}>
              {attachments.map((attachment) => (
                <li key={attachment.uid} className={styles.cltChattingMessageAttachmentsItem}>
                  <span className={styles.cltChattingMessageAttachmentsName}>{attachment.name}</span>
                  <span className={styles.cltChattingMessageAttachmentsSize}>
                    {attachment.size !== undefined ? `${(attachment.size / 1024).toFixed(2)} KB` : '未知大小'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.cltChattingMessageActions}>
          <Button
            type="primary"
            size="small"
            shape="circle"
            className={styles.cltChattingMessageCopyButton}
            onClick={handleCopy}
            title="复制消息"
          >
            <CopyOutlined />
          </Button>
        </div>
      </div>

    </div>

  );
};

export default ChatMessage;
