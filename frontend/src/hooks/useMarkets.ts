"use client"

import { useState, useEffect, useCallback } from "react"
import { Market } from "@/types"
import { marketsApi } from "@/lib/api"

interface UseMarketsOptions {
  status?: string
  creator_id?: string
  limit?: number
}

interface UseMarketsResult {
  markets: Market[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMarkets(options?: UseMarketsOptions): UseMarketsResult {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await marketsApi.list(options)
      setMarkets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch markets")
    } finally {
      setLoading(false)
    }
  }, [options?.status, options?.creator_id, options?.limit])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  return { markets, loading, error, refetch: fetchMarkets }
}
