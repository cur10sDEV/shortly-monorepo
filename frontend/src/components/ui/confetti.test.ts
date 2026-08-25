import { describe, expect, it, vi } from 'vitest'
import { celebrate } from './confetti'

const { confettiMock } = vi.hoisted(() => ({ confettiMock: vi.fn() }))
vi.mock('canvas-confetti', () => ({ default: confettiMock }))

describe('celebrate', () => {
  it('fires exactly once with palette colors', () => {
    confettiMock.mockReset()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    celebrate()
    expect(confettiMock).toHaveBeenCalledTimes(1)
    const opts = confettiMock.mock.calls[0][0]
    expect(opts.particleCount).toBeLessThanOrEqual(16)
    expect(opts.colors).toContain('#4F46E5')
  })

  it('does nothing when reduced motion preferred', () => {
    confettiMock.mockReset()
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    celebrate()
    expect(confettiMock).not.toHaveBeenCalled()
  })
})
