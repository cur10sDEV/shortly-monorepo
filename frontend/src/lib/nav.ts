const LINK_STATS_PATTERN = /^\/links\/[^/]+\/analytics/

export function isNavActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  if (LINK_STATS_PATTERN.test(pathname)) return to === '/analytics'
  return pathname.startsWith(to)
}
