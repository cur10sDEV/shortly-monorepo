import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

function apply(choice: ThemeChoice): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effective = choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  })

  useEffect(() => {
    apply(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((choice: ThemeChoice) => {
    localStorage.setItem('theme', choice)
    setThemeState(choice)
  }, [])

  return { theme, setTheme }
}
