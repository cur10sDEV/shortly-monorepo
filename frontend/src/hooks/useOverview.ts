import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../lib/api'

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: () => analyticsApi.overview(),
    staleTime: 60_000,
    retry: 1,
  })
}
