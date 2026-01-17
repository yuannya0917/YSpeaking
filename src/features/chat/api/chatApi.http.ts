import type { UploadFile } from 'antd'
import type { ChatAttachment, ChatMessageModel, Conversation } from '../model/chatTypes'
import { API_BASE, fetchWithRetry, request } from './http'

interface SendMessagePayload {
  text: string
  attachments?: ChatAttachment[]
  role?: 'user' | 'assistant'
}

const sanitizeAttachment = (file?: Partial<UploadFile | ChatAttachment>): ChatAttachment | undefined => {
  if (!file?.uid) return undefined
  const { uid, name, size, type, url } = file
  return { uid, name: name || '', size, type, url }
}

export const listConversations = () => request<Conversation[]>('/conversations')

export const createConversation = (title?: string) =>
  request<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })

export const deleteConversation = (id: string) =>
  request<void>(`/conversations/${id}`, {
    method: 'DELETE',
  })

export const renameConversation = (id: string, title: string) =>
  request<Conversation>(`/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })

export const listMessages = (conversationId: string) =>
  request<ChatMessageModel[]>(`/conversations/${conversationId}/messages`)

/**
 * 上传聊天附件，返回带 url 的精简附件信息。
 * - 以 FormData 方式提交，避免一次性把二进制塞进 JSON。
 */
export const uploadAttachments = async (files: UploadFile[]): Promise<ChatAttachment[]> => {
  if (!files.length) return []

  const form = new FormData()
  const meta = files.map((file) => ({
    uid: file.uid,
    name: file.name,
    size: file.size,
    type: file.type,
  }))

  meta.forEach((info, index) => {
    const origin = files[index]?.originFileObj
    if (origin) {
      form.append('files', origin, info.name)
    }
  })
  form.append('meta', JSON.stringify(meta))

  const res = await fetchWithRetry(`${API_BASE}/uploads`, {
    method: 'POST',
    body: form,
  }, {
    timeoutMs: 20_000,
    retry: 1,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upload failed ${res.status}: ${text || res.statusText}`)
  }
  const data = (await res.json()) as { attachments?: ChatAttachment[] }
  return (data.attachments || [])
    .map(sanitizeAttachment)
    .filter((x): x is ChatAttachment => Boolean(x))
}

export const sendMessage = (conversationId: string, payload: SendMessagePayload) =>
  request<ChatMessageModel>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      text: payload.text,
      attachments: payload.attachments
        ?.map(sanitizeAttachment)
        .filter((x): x is ChatAttachment => Boolean(x)),
      role: payload.role ?? 'user',
    }),
  })

