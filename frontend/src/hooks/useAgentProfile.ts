import { useState, useEffect, useCallback } from "react"
import { agentsApi } from "@/lib/api"
import { AgentProfile } from "@/types"

interface UseAgentProfileResult {
  profile: AgentProfile | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAgentProfile(agentId: string | null): UseAgentProfileResult {
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!agentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await agentsApi.getProfile(agentId)
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile")
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}
