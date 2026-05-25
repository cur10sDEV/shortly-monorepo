import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { linksApi } from '../lib/api'

export function useLinks(cursor?: number) {
  return useQuery({
    queryKey: ['links', cursor],
    queryFn: () => linksApi.list(cursor),
  })
}

export function useCreateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: linksApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useUpdateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; long_url?: string; password?: string }) =>
      linksApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  })
}

export function useDeleteLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: linksApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  })
}
