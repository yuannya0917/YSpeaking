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
}

interface SendMessagePayload {
    text: string
    attachments?: UploadFile[]
    role?: 'user' | 'assistant'
}

const API_BASE = '/api'

const sanitizeAttachment = (file: UploadFile): ChatAttachment => {
    const { uid, name, size, type, url } = file
    return { uid, name, size, type, url }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
        ...init,
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Request failed ${res.status}: ${text || res.statusText}`)
    }
    return res.json() as Promise<T>
}

export const listConversations = () => request<Conversation[]>('/conversations')

export const createConversation = (title?: string) =>
    request<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
    })

export const listMessages = (conversationId: string) =>
    request<ChatMessageModel[]>(`/conversations/${conversationId}/messages`)

export const sendMessage = (conversationId: string, payload: SendMessagePayload) =>
    request<ChatMessageModel>(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
            text: payload.text,
            attachments: payload.attachments?.map(sanitizeAttachment),
            role: payload.role ?? 'user',
        }),
    })
