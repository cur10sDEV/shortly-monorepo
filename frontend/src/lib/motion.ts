export const EASE_OUT_SOFT = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
