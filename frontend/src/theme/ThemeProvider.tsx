import React, { createContext, useContext, useEffect, useMemo } from 'react'

type ThemeMode = 'light'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
  hasExplicitPreference: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove('dark')
    root.dataset.theme = 'light'
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: 'light',
      toggleTheme: () => {},
      setTheme: () => {},
      hasExplicitPreference: true
    }),
    []
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
