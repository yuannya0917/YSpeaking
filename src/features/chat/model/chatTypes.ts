import type { UploadFile } from 'antd'

export type ChatAttachment = Pick<UploadFile, 'uid' | 'name' | 'size' | 'type' | 'url'>

export interface Conversation {
  id: string
  title: string
  createdAt: string
}

export interface ChatMessageModel {
  id: string
  conversationId: string
  text: string
  attachments?: ChatAttachment[]
  role?: 'user' | 'assistant'
  createdAt: string
  /**
   * 客户端临时字段：用于展示 AI 生成中的占位消息。
   * 后端不会返回该字段。
   */
  isLoading?: boolean
}

export type ChatCompletionContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatCompletionContent[]
}

