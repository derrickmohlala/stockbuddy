import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'

interface User {
  user_id: number
  email: string
  first_name: string
  is_admin: boolean
  is_onboarded: boolean
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, first_name: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
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
    if (token && !user) {
      refreshUser()
    } else if (!token) {
      setUser(null)
    }
  }, [token])

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      return
    }

    try {
      const response = await apiFetch('/api/auth/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser({
          user_id: data.user_id,
          email: data.email,
          first_name: data.first_name,
          is_admin: data.is_admin,
          is_onboarded: data.is_onboarded
        })
      } else {
        // Token invalid, clear it
        setToken(null)
        localStorage.removeItem('stockbuddy_token')
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      setToken(null)
      localStorage.removeItem('stockbuddy_token')
      setUser(null)
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
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    setToken(data.access_token)
    localStorage.setItem('stockbuddy_token', data.access_token)
    localStorage.setItem('stockbuddy_user_id', data.user_id.toString())
    
    // Set user immediately, then refresh for onboarding status
    const newUser = {
      user_id: data.user_id,
      email: data.email,
      first_name: data.first_name,
      is_admin: data.is_admin,
      is_onboarded: false
    }
    setUser(newUser)
    
    // Refresh to get onboarding status
    try {
      const currentResponse = await apiFetch('/api/auth/current', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      })
      if (currentResponse.ok) {
        const currentData = await currentResponse.json()
        setUser({
          ...newUser,
          is_onboarded: currentData.is_onboarded
        })
      }
    } catch {
      // If refresh fails, keep the initial user data
    }
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
    setToken(data.access_token)
    localStorage.setItem('stockbuddy_token', data.access_token)
    localStorage.setItem('stockbuddy_user_id', data.user_id.toString())
    
    const newUser = {
      user_id: data.user_id,
      email: data.email,
      first_name: data.first_name,
      is_admin: data.is_admin,
      is_onboarded: false
    }
    setUser(newUser)
    
    // Refresh to get onboarding status if available
    try {
      const currentResponse = await apiFetch('/api/auth/current', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      })
      if (currentResponse.ok) {
        const currentData = await currentResponse.json()
        setUser({
          ...newUser,
          is_onboarded: currentData.is_onboarded
        })
      }
    } catch {
      // If refresh fails, keep the initial user data
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('stockbuddy_token')
    localStorage.removeItem('stockbuddy_user_id')
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
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

