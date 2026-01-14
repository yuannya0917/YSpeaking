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
const AI_PROXY_URL = import.meta.env.VITE_QWEN_PROXY_URL

export type ChatCompletionMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string
}

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

export const generateAssistantReply = async (
    messages: ChatCompletionMessage[],
    model = 'qwen-turbo'
): Promise<string> => {
    if (!AI_PROXY_URL) {
        throw new Error('缺少 Qwen 代理地址，请设置 VITE_QWEN_PROXY_URL')
    }

    const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            stream: false,
            messages,
        }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`AI 请求失败 ${res.status}: ${text || res.statusText}`)
    }

    const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('AI 返回内容为空')
    return content
}
