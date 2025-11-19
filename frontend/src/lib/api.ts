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
  
  const headers = new Headers(options?.headers)
  
  // Set Content-Type if not already set
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  
  // Add Authorization header if token exists and not already set
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}
