"use client"

import { useState, useEffect, useCallback } from "react"
import { PendingMarket } from "@/types"
import { moderatorApi } from "@/lib/api"

interface UsePendingMarketsResult {
  markets: PendingMarket[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePendingMarkets(limit: number = 50): UsePendingMarketsResult {
  const [markets, setMarkets] = useState<PendingMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await moderatorApi.getPendingMarkets(limit)
      setMarkets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pending markets")
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  return { markets, loading, error, refetch: fetchMarkets }
}
