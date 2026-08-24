import '@testing-library/jest-dom/vitest'

// jsdom lacks matchMedia — needed by useTheme/motion utils
const jsdomWindow = window as Omit<Window, 'matchMedia' | 'ResizeObserver' | 'requestAnimationFrame' | 'cancelAnimationFrame'> & {
  matchMedia?: typeof window.matchMedia
  ResizeObserver?: typeof ResizeObserver
  requestAnimationFrame?: typeof window.requestAnimationFrame
  cancelAnimationFrame?: typeof window.cancelAnimationFrame
}

if (!jsdomWindow.matchMedia) {
  jsdomWindow.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (!jsdomWindow.ResizeObserver) {
  jsdomWindow.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// jsdom lacks requestAnimationFrame — needed by animation components
if (!jsdomWindow.requestAnimationFrame) {
  jsdomWindow.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number
  jsdomWindow.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
}
