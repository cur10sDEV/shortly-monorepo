import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

interface Props {
  value: number
  duration?: number
  className?: string
}

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3)
}

export function CountUp({ value, duration = 600, className }: Props) {
  const reduced = prefersReducedMotion()
  const [display, setDisplay] = useState(() => (reduced ? value : 0))

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(value * easeOutCubic(p)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduced])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display.toLocaleString()}
    </span>
  )
}
