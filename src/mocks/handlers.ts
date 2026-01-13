import { http, HttpResponse, delay } from 'msw'
import type { Conversation, ChatAttachment, ChatMessageModel } from '../features/chat/api/mockChatApi'

const nowIso = () => new Date().toISOString()

const CACHE_NAME = 'yspeaking-mock-chat-cache-v1'
const CACHE_KEY = new Request('/__msw-cache/mock-chat')

const defaultStore: {
    conversations: Conversation[]
    messages: Record<string, ChatMessageModel[]>
} = {
    conversations: [
        { id: 'conv-1', title: '新对话 1', createdAt: nowIso() },
        { id: 'conv-2', title: '项目需求讨论', createdAt: nowIso() },
        { id: 'conv-3', title: '语音测试', createdAt: nowIso() },
    ],
    messages: {
        'conv-1': [
            {
                id: 'msg-1',
                conversationId: 'conv-1',
                text: '你好，我是你的语音助手，有什么可以帮你的吗？',
                role: 'assistant',
                createdAt: nowIso(),
            },
        ],
        'conv-2': [
            {
                id: 'msg-2',
                conversationId: 'conv-2',
                text: '我们需要整理一下新需求文档，方便评审。',
                role: 'user',
                createdAt: nowIso(),
            },
        ],
        'conv-3': [],
    },
}

let store: typeof defaultStore = JSON.parse(JSON.stringify(defaultStore))
let storeLoaded = false

const persistStore = async () => {
    try {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(
            CACHE_KEY,
            new Response(JSON.stringify(store), {
                headers: { 'Content-Type': 'application/json' },
            })
        )
    } catch (error) {
        console.warn('persist mock store failed', error)
    }
}

const loadStore = async () => {
    try {
        const cache = await caches.open(CACHE_NAME)
        const res = await cache.match(CACHE_KEY)
        if (!res) return
        const data = await res.json()
        store = {
            conversations: Array.isArray(data?.conversations) ? data.conversations : defaultStore.conversations,
            messages: { ...defaultStore.messages, ...(data?.messages || {}) },
        }
    } catch (error) {
        console.warn('load mock store failed, fallback to default', error)
        store = JSON.parse(JSON.stringify(defaultStore))
    }
}

const ensureStoreLoaded = async () => {
    if (storeLoaded) return
    await loadStore()
    storeLoaded = true
}

const sanitizeAttachment = (att?: Partial<ChatAttachment>): ChatAttachment | undefined => {
    if (!att?.uid) return undefined
    return {
        uid: att.uid,
        name: att.name || '',
        size: att.size,
        type: att.type,
        url: att.url,
    }
}

type Scenario = 'error' | 'timeout' | 'unauthorized' | null

const getScenario = (url: string): Scenario => {
    try {
        const search = new URL(url).searchParams.get('scenario')
        if (search === 'error') return 'error'
        if (search === 'timeout') return 'timeout'
        if (search === '401') return 'unauthorized'
    } catch {
        // ignore parse errors
    }
    return null
}

const maybeSimulate = async (scenario: Scenario) => {
    if (scenario === 'timeout') {
        // 模拟超时：长延迟
        await delay(6000)
    }
}

const scenarioResponse = (scenario: Scenario) => {
    if (scenario === 'error') {
        return HttpResponse.json({ message: 'Mocked 500' }, { status: 500 })
    }
    if (scenario === 'unauthorized') {
        return HttpResponse.json({ message: 'Mocked 401' }, { status: 401 })
    }
    return null
}

export const handlers = [
    http.get('/api/conversations', async ({ request }) => {
        await ensureStoreLoaded()
        const scenario = getScenario(request.url)
        await maybeSimulate(scenario)
        const resp = scenarioResponse(scenario)
        if (resp) return resp
        await delay(120)
        return HttpResponse.json(store.conversations)
    }),

    http.post('/api/conversations', async ({ request }) => {
        await ensureStoreLoaded()
        const scenario = getScenario(request.url)
        await maybeSimulate(scenario)
        const resp = scenarioResponse(scenario)
        if (resp) return resp
        await delay(120)
        const body = await request.json().catch(() => ({})) as { title?: string }
        const newConv: Conversation = {
            id: `conv-${Date.now()}`,
            title: body.title?.trim() || `新对话 ${store.conversations.length + 1}`,
            createdAt: nowIso(),
        }
        store.conversations = [newConv, ...store.conversations]
        store.messages[newConv.id] = []
        await persistStore()
        return HttpResponse.json(newConv, { status: 201 })
    }),

    http.get('/api/conversations/:id/messages', async ({ params, request }) => {
        await ensureStoreLoaded()
        const scenario = getScenario(request.url)
        await maybeSimulate(scenario)
        const resp = scenarioResponse(scenario)
        if (resp) return resp
        await delay(100)
        const convId = params.id as string
        const list = store.messages[convId] || []
        return HttpResponse.json(
            [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        )
    }),

    http.post('/api/conversations/:id/messages', async ({ params, request }) => {
        await ensureStoreLoaded()
        const scenario = getScenario(request.url)
        await maybeSimulate(scenario)
        const resp = scenarioResponse(scenario)
        if (resp) return resp
        await delay(80)
        const convId = params.id as string
        if (!convId) {
            return HttpResponse.json({ message: 'conversationId required' }, { status: 400 })
        }
        const body = await request.json().catch(() => ({})) as {
            text?: string
            attachments?: ChatAttachment[]
            role?: 'user' | 'assistant'
        }
        const text = (body.text || '').trim()
        if (!text) {
            return HttpResponse.json({ message: 'text required' }, { status: 400 })
        }
        if (!store.messages[convId]) {
            store.messages[convId] = []
            if (!store.conversations.find(c => c.id === convId)) {
                store.conversations.unshift({
                    id: convId,
                    title: `对话 ${convId}`,
                    createdAt: nowIso(),
                })
            }
        }

        const message: ChatMessageModel = {
            id: `msg-${Date.now()}`,
            conversationId: convId,
            text,
            attachments: body.attachments
                ?.map(sanitizeAttachment)
                .filter((x): x is ChatAttachment => Boolean(x)),
            role: body.role ?? 'user',
            createdAt: nowIso(),
        }
        store.messages[convId].push(message)
        await persistStore()
        return HttpResponse.json(message, { status: 201 })
    }),
]
