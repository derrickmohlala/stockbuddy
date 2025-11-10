const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const resolveApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

export const apiFetch = (path: string, options?: RequestInit) => {
  const url = resolveApiUrl(path)
  return fetch(url, options)
}
