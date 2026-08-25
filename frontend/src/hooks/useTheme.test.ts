import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('dark'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('defaults to system and does not force dark class', () => {
    // stubbed matchMedia reports dark-preferred
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
  })

  it("setTheme('light') removes the dark class and persists", () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it("setTheme('dark') adds the dark class and persists", () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
