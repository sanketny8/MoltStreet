"use client"

import { useState, useEffect, useCallback } from "react"
import { ModeratorReward } from "@/types"
import { moderatorApi } from "@/lib/api"

interface UseModeratorRewardsResult {
  rewards: ModeratorReward[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useModeratorRewards(
  moderatorId: string | null,
  limit: number = 50,
  offset: number = 0
): UseModeratorRewardsResult {
  const [rewards, setRewards] = useState<ModeratorReward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRewards = useCallback(async () => {
    if (!moderatorId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await moderatorApi.getRewards(moderatorId, limit, offset)
      setRewards(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch moderator rewards")
    } finally {
      setLoading(false)
    }
  }, [moderatorId, limit, offset])

  useEffect(() => {
    fetchRewards()
  }, [fetchRewards])

  return { rewards, loading, error, refetch: fetchRewards }
}
