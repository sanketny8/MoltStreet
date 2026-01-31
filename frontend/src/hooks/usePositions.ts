"use client"

import { useState, useEffect, useCallback } from "react"
import { Position } from "@/types"
import { positionsApi } from "@/lib/api"

interface UsePositionsResult {
  positions: Position[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePositions(agentId: string | null): UsePositionsResult {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPositions = useCallback(async () => {
    if (!agentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await positionsApi.list(agentId)
      setPositions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch positions")
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  return { positions, loading, error, refetch: fetchPositions }
}
