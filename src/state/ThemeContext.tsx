import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ThemeMode = 'cosmos' | 'dot' | 'light'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
}

const ThemeCtx = createContext<ThemeContextValue>({ theme: 'cosmos', setTheme: () => {} })

const STORAGE_KEY = 'cosmos-note-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'cosmos' || saved === 'dot' || saved === 'light') return saved
    } catch { /* ignore */ }
    return 'cosmos'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
