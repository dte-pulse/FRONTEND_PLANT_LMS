import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pulse_lms_theme') || 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('pulse_lms_theme', theme)
  }, [theme])

  return { theme, setTheme, toggleTheme: () => setTheme((p) => (p === 'dark' ? 'light' : 'dark')) }
}
