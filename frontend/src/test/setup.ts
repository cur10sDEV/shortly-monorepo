import '@testing-library/jest-dom/vitest'

// jsdom lacks matchMedia — needed by useTheme/motion utils
const jsdomWindow = window as Omit<Window, 'matchMedia' | 'ResizeObserver'> & {
  matchMedia?: typeof window.matchMedia
  ResizeObserver?: typeof ResizeObserver
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
