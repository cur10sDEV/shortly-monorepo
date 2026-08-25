import confetti from 'canvas-confetti'
import { prefersReducedMotion } from '../../lib/motion'

export function celebrate(originEl?: HTMLElement | null): void {
  if (prefersReducedMotion()) return

  let origin: { x: number; y: number } | undefined
  if (originEl) {
    const rect = originEl.getBoundingClientRect()
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    }
  }

  confetti({
    particleCount: 14,
    spread: 70,
    startVelocity: 28,
    scalar: 0.9,
    ticks: 120,
    colors: ['#4F46E5', '#14B8A6', '#B45309', '#DC2626'],
    disableForReducedMotion: true,
    ...(origin ? { origin } : {}),
  })
}
