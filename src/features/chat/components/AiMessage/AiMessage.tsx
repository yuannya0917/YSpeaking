import React, { useMemo } from 'react'
import { Button, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import styles from './AiMessage.module.css'

interface AiMessageProps {
  content: string
  attachments?: UploadFile[]
}

export const AiMessage: React.FC<AiMessageProps> = ({ content, attachments }) => {
  const renderedHtml = useMemo(() => {
    try {
      const html = marked.parse(content || '')
      return DOMPurify.sanitize(html)
    } catch {
      return DOMPurify.sanitize(content || '')
    }
  }, [content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      message.success('已复制到剪贴板')
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = content
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        message.success('已复制到剪贴板')
      } catch {
        message.error('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.message}>
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />

        {attachments && attachments.length > 0 && (
          <div className={styles.attachments}>
            <ul className={styles.attachmentsList}>
              {attachments.map((attachment) => (
                <li key={attachment.uid} className={styles.attachmentsItem}>
                  <span className={styles.attachmentsName}>{attachment.name}</span>
                  <span className={styles.attachmentsSize}>
                    {attachment.size !== undefined ? `${(attachment.size / 1024).toFixed(2)} KB` : '未知大小'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            type="primary"
            size="small"
            shape="circle"
            className={styles.copyButton}
            onClick={handleCopy}
            title="复制消息"
          >
            <CopyOutlined />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AiMessage

