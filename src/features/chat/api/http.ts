const baseUrl = import.meta.env.BASE_URL || '/'
export const API_BASE = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/api`

export type RequestOptions = {
  timeoutMs?: number
  retry?: number
  retryDelayMs?: number
}

const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_RETRY = 2
const DEFAULT_RETRY_DELAY_MS = 500

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryableStatus = (status: number) =>
  status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RequestOptions
) => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  let timedOut = false

  if (init?.signal) {
    if (init.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    init.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (timedOut) {
      const err = new Error(`Request timeout after ${timeoutMs}ms`)
      ;(err as Error & { name?: string }).name = 'TimeoutError'
      throw err
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RequestOptions
) => {
  const maxRetry = options?.retry ?? DEFAULT_RETRY
  const retryDelay = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  let attempt = 0

  while (true) {
    try {
      const res = await fetchWithTimeout(input, init, options)
      if (!isRetryableStatus(res.status) || attempt >= maxRetry) {
        return res
      }
    } catch (error) {
      const err = error as { name?: string }
      const retryable =
        err?.name === 'TimeoutError' ||
        (err?.name !== 'AbortError' && error instanceof TypeError)
      if (!retryable || attempt >= maxRetry) {
        throw error
      }
    }

    attempt += 1
    await sleep(retryDelay * Math.pow(2, attempt - 1))
  }
}

export const request = async <T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions
): Promise<T> => {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  }, options)

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

