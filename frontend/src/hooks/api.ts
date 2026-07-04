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

export function useBidStack() {
  return useQuery({
    queryKey: ['bid-stack'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/bid-stack')
      if (error) throw error
      return data
    },
  })
}

export function useGenerationHistory(hours = 24) {
  return useQuery({
    queryKey: ['generation', hours],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/generation', {
        params: { query: { hours } },
      })
      if (error) throw error
      return data
    },
  })
}

export function useAcceptedActions() {
  return useQuery({
    queryKey: ['accepted-actions'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/accepted-actions')
      if (error) throw error
      return data
    },
  })
}

export function useProfile(
  metric: 'demand' | 'generation' | 'carbon' | 'price',
  days: number,
) {
  return useQuery({
    queryKey: ['profile', metric, days],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/profile', {
        params: { query: { metric, days } },
      })
      if (error) throw error
      return data
    },
  })
}

export function useTimeseries(
  metric: 'demand' | 'generation' | 'carbon' | 'price',
  granularity: 'sp' | 'hour' | 'day',
  hours: number,
) {
  return useQuery({
    queryKey: ['timeseries', metric, granularity, hours],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/timeseries', {
        params: { query: { metric, granularity, hours } },
      })
      if (error) throw error
      return data
    },
  })
}
