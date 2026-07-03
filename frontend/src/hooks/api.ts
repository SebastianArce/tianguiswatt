import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useSnapshot() {
  return useQuery({
    queryKey: ['snapshot'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/snapshot')
      if (error) throw error
      return data
    },
  })
}

export function useSupplyDemandHistory(hours = 12) {
  return useQuery({
    queryKey: ['supply-demand', hours],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/supply-demand', {
        params: { query: { hours } },
      })
      if (error) throw error
      return data
    },
  })
}

export function usePricesHistory(hours = 12) {
  return useQuery({
    queryKey: ['prices', hours],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/prices', {
        params: { query: { hours } },
      })
      if (error) throw error
      return data
    },
  })
}
