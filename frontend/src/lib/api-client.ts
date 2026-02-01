/**
 * Enhanced API client with retry logic, error handling, and timeout management.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

export interface ApiError {
  status: number
  message: string
  details?: any
  path?: string
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any,
    public path?: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }

  static fromResponse(response: Response, data?: any): ApiClientError {
    const message = data?.error || data?.message || response.statusText || 'An error occurred'
    return new ApiClientError(
      response.status,
      message,
      data?.details || data,
      data?.path
    )
  }

  static networkError(): ApiClientError {
    return new ApiClientError(0, 'Network error. Please check your connection.', { type: 'network' })
  }

  static timeout(): ApiClientError {
    return new ApiClientError(0, 'Request timed out. Please try again.', { type: 'timeout' })
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
  skipRetryOn?: number[] // Status codes to skip retry on
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if status code is retryable
 */
function isRetryableStatus(status: number, skipRetryOn?: number[]): boolean {
  // Don't retry client errors (4xx) except 408, 429
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false
  }

  // Don't retry if explicitly skipped
  if (skipRetryOn?.includes(status)) {
    return false
  }

  // Retry server errors (5xx) and specific client errors
  return status >= 500 || status === 408 || status === 429 || status === 0
}

/**
 * Make an API request with timeout and retry logic
 */
async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    retryDelay = RETRY_DELAY,
    skipRetryOn,
    ...fetchOptions
  } = options

  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= retries) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // If response is ok or not retryable, return it
        if (response.ok || !isRetryableStatus(response.status, skipRetryOn)) {
          return response
        }

        // Store response for potential retry
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

        // If this is the last attempt, return the response
        if (attempt === retries) {
          return response
        }
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    } catch (error) {
      lastError = error as Error

      // Check if error is abort (timeout)
      if ((error as Error).name === 'AbortError') {
        if (attempt === retries) {
          throw ApiClientError.timeout()
        }
      }
      // Network error
      else if (error instanceof TypeError) {
        if (attempt === retries) {
          throw ApiClientError.networkError()
        }
      }
      // Other errors
      else if (attempt === retries) {
        throw error
      }
    }

    // Wait before retrying (exponential backoff)
    if (attempt < retries) {
      const delay = retryDelay * Math.pow(2, attempt)
      await sleep(delay)
    }

    attempt++
  }

  // This should never be reached, but just in case
  throw lastError || new Error('Request failed after retries')
}

/**
 * Main API client function
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // Set default headers
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body && typeof options.body !== 'string') {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
      body: options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
    })

    // Parse response
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    let data: any
    if (isJson) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // Handle error responses
    if (!response.ok) {
      throw ApiClientError.fromResponse(response, data)
    }

    return data as T
  } catch (error) {
    // Re-throw ApiClientError as is
    if (error instanceof ApiClientError) {
      throw error
    }

    // Wrap other errors
    throw new ApiClientError(
      0,
      error instanceof Error ? error.message : 'Unknown error occurred'
    )
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
}
