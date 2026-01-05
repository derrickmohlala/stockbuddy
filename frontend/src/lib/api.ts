const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const resolveApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export const apiFetch = (path: string, options?: RequestInit) => {
  const url = resolveApiUrl(path)
  const token = localStorage.getItem('stockbuddy_token')

  // Log API calls in development or if there's an issue
  if (import.meta.env.DEV || !import.meta.env.VITE_API_BASE_URL) {
    console.log('API Fetch:', {
      path,
      resolvedUrl: url,
      hasApiBaseUrl: !!import.meta.env.VITE_API_BASE_URL,
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'not set'
    })
  }

  const headers = new Headers(options?.headers)

  // Set Content-Type if not already set
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Add Authorization header if token exists and not already set
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
    console.log('Attaching auth token:', token.substring(0, 10) + '...')
  } else if (!token) {
    console.warn('No auth token found in localStorage')
  }

  // Add timeout for Render backend (free tier can be slow)
  const isRenderBackend = import.meta.env.VITE_API_BASE_URL?.includes('onrender.com')
  const timeout = isRenderBackend ? 60000 : 30000 // 60s for Render, 30s for local

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  return fetch(url, {
    ...options,
    headers,
    signal: controller.signal
  })
    .then(response => {
      clearTimeout(timeoutId)
      return response
    })
    .catch(error => {
      clearTimeout(timeoutId)

      // Handle timeout/abort errors
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout. The server is taking too long to respond.')
        timeoutError.name = 'TimeoutError'
        throw timeoutError
      }

      // Log fetch errors for debugging
      console.error('Fetch error:', {
        url,
        error: error.message,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'not set',
        path
      })
      throw error
    })
}
