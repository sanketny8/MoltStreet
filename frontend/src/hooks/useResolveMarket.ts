"use client"

import { useState, useCallback } from "react"
import { marketsApi } from "@/lib/api"

interface ResolveMarketParams {
  marketId: string
  moderatorId: string
  outcome: "YES" | "NO"
  evidence?: string
}

interface UseResolveMarketResult {
  resolve: (params: ResolveMarketParams) => Promise<boolean>
  loading: boolean
  error: string | null
  success: boolean
  reset: () => void
}

export function useResolveMarket(): UseResolveMarketResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resolve = useCallback(async (params: ResolveMarketParams): Promise<boolean> => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await marketsApi.resolve(params.marketId, {
        moderator_id: params.moderatorId,
        outcome: params.outcome,
        evidence: params.evidence,
      })
      setSuccess(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve market")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setSuccess(false)
  }, [])

  return { resolve, loading, error, success, reset }
}
