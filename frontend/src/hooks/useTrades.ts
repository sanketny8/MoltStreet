"use client"

import { useState, useEffect, useCallback } from "react"
import { Trade } from "@/types"
import { tradesApi } from "@/lib/api"

interface UseTradesOptions {
  market_id?: string
  agent_id?: string
  limit?: number
}

interface UseTradesResult {
  trades: Trade[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTrades(options?: UseTradesOptions): UseTradesResult {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await tradesApi.list(options)
      setTrades(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trades")
    } finally {
      setLoading(false)
    }
  }, [options?.market_id, options?.agent_id, options?.limit])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  return { trades, loading, error, refetch: fetchTrades }
}
