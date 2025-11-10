import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
  hasExplicitPreference: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'stockbuddy_theme'

const getSystemPreference = (): ThemeMode => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getInitialTheme = (): { mode: ThemeMode; explicit: boolean } => {
  if (typeof window === 'undefined') {
    return { mode: 'dark', explicit: false }
  }
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (stored === 'light' || stored === 'dark') {
    return { mode: stored, explicit: true }
  }
  return { mode: getSystemPreference(), explicit: false }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useMemo(getInitialTheme, [])
  const [theme, setThemeState] = useState<ThemeMode>(initial.mode)
  const [hasExplicitPreference, setHasExplicitPreference] = useState<boolean>(initial.explicit)

  const applyThemeClass = useCallback(
    (mode: ThemeMode) => {
      if (typeof document === 'undefined') return
      const root = document.documentElement
      if (mode === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      root.dataset.theme = mode
      root.classList.add('theme-transition')
      window.setTimeout(() => root.classList.remove('theme-transition'), 400)
    },
    []
  )

  useEffect(() => {
    applyThemeClass(theme)
    if (typeof window === 'undefined') return
    if (hasExplicitPreference) {
      window.localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme, hasExplicitPreference, applyThemeClass])

  useEffect(() => {
    if (typeof window === 'undefined' || hasExplicitPreference) return
    const matcher = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? 'dark' : 'light')
    }
    if (typeof matcher.addEventListener === 'function') {
      matcher.addEventListener('change', handler)
      return () => matcher.removeEventListener('change', handler)
    }
    matcher.addListener(handler)
    return () => matcher.removeListener(handler)
  }, [hasExplicitPreference])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    setHasExplicitPreference(true)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
    setHasExplicitPreference(true)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      hasExplicitPreference,
    }),
    [theme, toggleTheme, setTheme, hasExplicitPreference]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
