const baseUrl = import.meta.env.BASE_URL || '/'
export const API_BASE = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/api`

export const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
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

