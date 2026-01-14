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
    attachments?: ChatAttachment[]
    role?: 'user' | 'assistant'
}

const API_BASE = '/api'
const AI_PROXY_URL = import.meta.env.VITE_QWEN_PROXY_URL

export type ChatCompletionContent =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }

export type ChatCompletionMessage = {
    role: 'system' | 'user' | 'assistant'
    content: string | ChatCompletionContent[]
}

const sanitizeAttachment = (file?: Partial<UploadFile | ChatAttachment>): ChatAttachment | undefined => {
    if (!file?.uid) return undefined
    const { uid, name, size, type, url } = file
    return { uid, name: name || '', size, type, url }
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
    // 204 / 空响应体时直接返回 undefined，避免 JSON 解析错误
    if (res.status === 204) return undefined as T
    const raw = await res.text()
    if (!raw) return undefined as T
    try {
        return JSON.parse(raw) as T
    } catch (error) {
        throw new Error(`Invalid JSON response: ${(error as Error).message}`)
    }
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

    const res = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        body: form,
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Upload failed ${res.status}: ${text || res.statusText}`)
    }
    const data = await res.json() as { attachments?: ChatAttachment[] }
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

const DEFAULT_QWEN_MODEL = import.meta.env.VITE_QWEN_MODEL || 'qwen-vl-plus'

export const generateAssistantReply = async (
    messages: ChatCompletionMessage[],
    model = DEFAULT_QWEN_MODEL
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
