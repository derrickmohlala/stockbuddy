import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'

interface User {
  user_id: number
  email: string
  first_name: string
  is_admin: boolean
  is_onboarded: boolean
  is_profile_complete: boolean
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, first_name: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setAuthFromToken: (token: string, userData: { user_id: number; email: string; first_name: string; is_admin: boolean; is_onboarded: boolean; is_profile_complete: boolean }) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('stockbuddy_token')
    if (savedToken) {
      setToken(savedToken)
    }
    setLoading(false)
  }, [])

  // Fetch current user when token is available
  useEffect(() => {
    const fetchUser = async () => {
      const currentToken = token || localStorage.getItem('stockbuddy_token')
      if (currentToken && currentToken !== token) {
        setToken(currentToken)
      }

      if (currentToken) {
        // Only refresh if we don't already have a user (to avoid unnecessary calls)
        // The login/register functions already set the user, so we don't need to refresh immediately
        if (!user) {
          await refreshUser()
        }
      } else {
        setUser(null)
      }
    }

    // Add a small delay to avoid race conditions after signup/login
    const timeoutId = setTimeout(() => {
      fetchUser()
    }, 100)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const refreshUser = useCallback(async () => {
    // Get token from state or localStorage
    const currentToken = token || localStorage.getItem('stockbuddy_token')
    if (!currentToken) {
      setUser(null)
      return
    }

    // If token in state is different from localStorage, sync it
    if (currentToken !== token) {
      setToken(currentToken)
    }

    try {
      const response = await apiFetch('/api/auth/current', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser({
          user_id: data.user_id,
          email: data.email,
          first_name: data.first_name,
          is_admin: data.is_admin,
          is_onboarded: data.is_onboarded,
          is_profile_complete: data.is_profile_complete || false
        })
      } else {
        // Only clear if we get a 401/403 - don't clear on other errors
        if (response.status === 401 || response.status === 403) {
          setToken(null)
          localStorage.removeItem('stockbuddy_token')
          localStorage.removeItem('stockbuddy_user_id')
          setUser(null)
        } else {
          // For other errors, log but don't clear user - might be temporary
          console.error('Error fetching current user:', response.status, response.statusText)
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      // Only clear on network errors if we're sure the token is invalid
      // Don't clear on temporary network issues
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setToken(null)
        localStorage.removeItem('stockbuddy_token')
        localStorage.removeItem('stockbuddy_user_id')
        setUser(null)
      }
    }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      let errorMessage = 'Login failed'
      try {
        const text = await response.text()
        if (text) {
          try {
            const errorData = JSON.parse(text)
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch {
            errorMessage = text || errorMessage
          }
        }
      } catch {
        errorMessage = response.statusText || `Server error (${response.status})`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    const accessToken = data.access_token

    setToken(accessToken)
    localStorage.setItem('stockbuddy_token', accessToken)
    localStorage.setItem('stockbuddy_user_id', data.user_id.toString())

    // Set user with onboarding status from login response
    setUser({
      user_id: data.user_id,
      email: data.email,
      first_name: data.first_name,
      is_admin: data.is_admin,
      is_onboarded: data.is_onboarded || false,
      is_profile_complete: data.is_profile_complete || false
    })
  }, [])

  const register = useCallback(async (email: string, password: string, first_name: string) => {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, first_name })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const data = await response.json()
    const accessToken = data.access_token

    setToken(accessToken)
    localStorage.setItem('stockbuddy_token', accessToken)
    localStorage.setItem('stockbuddy_user_id', data.user_id.toString())

    // Fetch full user data with onboarding status
    try {
      const currentResponse = await apiFetch('/api/auth/current', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (currentResponse.ok) {
        const currentData = await currentResponse.json()
        setUser({
          user_id: currentData.user_id,
          email: currentData.email,
          first_name: currentData.first_name,
          is_admin: currentData.is_admin,
          is_onboarded: currentData.is_onboarded,
          is_profile_complete: currentData.is_profile_complete || false
        })
      } else {
        // Fallback to registration data
        setUser({
          user_id: data.user_id,
          email: data.email,
          first_name: data.first_name,
          is_admin: data.is_admin,
          is_onboarded: data.is_onboarded || false,
          is_profile_complete: data.is_profile_complete || false
        })
      }
    } catch {
      // Fallback to registration data if refresh fails
      setUser({
        user_id: data.user_id,
        email: data.email,
        first_name: data.first_name,
        is_admin: data.is_admin,
        is_onboarded: data.is_onboarded || false,
        is_profile_complete: data.is_profile_complete || false
      })
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('stockbuddy_token')
    localStorage.removeItem('stockbuddy_user_id')
  }, [])

  const setAuthFromToken = useCallback((token: string, userData: { user_id: number; email: string; first_name: string; is_admin: boolean; is_onboarded: boolean; is_profile_complete: boolean }) => {
    setToken(token)
    localStorage.setItem('stockbuddy_token', token)
    localStorage.setItem('stockbuddy_user_id', userData.user_id.toString())
    setUser({
      user_id: userData.user_id,
      email: userData.email,
      first_name: userData.first_name,
      is_admin: userData.is_admin,
      is_onboarded: userData.is_onboarded,
      is_profile_complete: userData.is_profile_complete
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, setAuthFromToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

