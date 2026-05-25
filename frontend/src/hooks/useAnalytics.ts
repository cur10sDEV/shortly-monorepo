import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'

export function useAnalyticsSummary(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'summary', linkId],
    queryFn: () => analyticsApi.summary(linkId),
  })
}

export function useAnalyticsTimeline(
  linkId: number,
  params?: { from?: string; to?: string; bucket?: string }
) {
  return useQuery({
    queryKey: ['analytics', 'timeline', linkId, params],
    queryFn: () => analyticsApi.timeline(linkId, params),
  })
}

export function useAnalyticsReferrers(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'referrers', linkId],
    queryFn: () => analyticsApi.referrers(linkId),
  })
}

export function useAnalyticsDevices(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'devices', linkId],
    queryFn: () => analyticsApi.devices(linkId),
  })
}

export function useAnalyticsLocations(linkId: number) {
  return useQuery({
    queryKey: ['analytics', 'locations', linkId],
    queryFn: () => analyticsApi.locations(linkId),
  })
}
