"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { Agent, AgentRole, TradingMode } from "@/types"
import { agentsApi } from "@/lib/api"

interface AgentAuthContextType {
  // State
  agentId: string | null
  agent: Agent | null
  apiKey: string | null
  loading: boolean
  error: string | null

  // Actions (API key only - for programmatic agent use)
  loginWithApiKey: (apiKey: string) => Promise<boolean>
  logout: () => void
  refetchAgent: () => Promise<void>

  // Helpers
  isLoggedIn: boolean
  isTrader: boolean
  isModerator: boolean
}

const AgentAuthContext = createContext<AgentAuthContextType | null>(null)

const STORAGE_KEY_AGENT_ID = "agentId"
const STORAGE_KEY_AGENT_ROLE = "agentRole"
const STORAGE_KEY_API_KEY = "moltstreet_api_key"

interface AgentAuthProviderProps {
  children: ReactNode
}

export function AgentAuthProvider({ children }: AgentAuthProviderProps) {
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Define loginWithApiKey first so it can be used in useEffect
  const loginWithApiKey = useCallback(async (key: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      // Validate API key format
      if (!key.startsWith("mst_")) {
        throw new Error("Invalid API key format. API keys start with 'mst_'")
      }

      // Get agent info using API key
      const agentInfo = await agentsApi.getMe(key)

      // Convert API v1 response to Agent type
      const agentData: Agent = {
        id: agentInfo.id,
        name: agentInfo.name,
        role: agentInfo.role as AgentRole,
        balance: agentInfo.balance,
        locked_balance: agentInfo.locked_balance,
        reputation: agentInfo.reputation,
        trading_mode: (agentInfo.trading_mode || "manual") as TradingMode, // Use actual value from API
        can_trade: agentInfo.role === "trader" || agentInfo.role === "moderator", // Traders and moderators can trade
        can_resolve: agentInfo.role === "moderator", // Only moderators can resolve
        created_at: new Date().toISOString(),
      }

      // Store both API key and agent ID
      localStorage.setItem(STORAGE_KEY_API_KEY, key)
      localStorage.setItem(STORAGE_KEY_AGENT_ID, agentInfo.id)
      localStorage.setItem(STORAGE_KEY_AGENT_ROLE, agentInfo.role)

      setApiKey(key)
      setAgentId(agentInfo.id)
      setAgent(agentData)
      return true
    } catch (err) {
      console.error("API key login failed:", err)
      setError(err instanceof Error ? err.message : "Invalid API key")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Load API key from localStorage on mount (agents authenticate via API key only)
  useEffect(() => {
    const storedApiKey = localStorage.getItem(STORAGE_KEY_API_KEY)

    if (storedApiKey) {
      setApiKey(storedApiKey)
      // Try to login with API key
      loginWithApiKey(storedApiKey).catch(() => {
        // If API key login fails, clear it
        localStorage.removeItem(STORAGE_KEY_API_KEY)
        localStorage.removeItem(STORAGE_KEY_AGENT_ID)
        localStorage.removeItem(STORAGE_KEY_AGENT_ROLE)
        setApiKey(null)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [loginWithApiKey])

  // Note: UUID-based login removed - agents authenticate via API key only

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_AGENT_ID)
    localStorage.removeItem(STORAGE_KEY_AGENT_ROLE)
    localStorage.removeItem(STORAGE_KEY_API_KEY)
    setAgentId(null)
    setAgent(null)
    setApiKey(null)
    setError(null)
  }, [])

  // Note: createAgent removed - agents register via API v1 endpoint only

  const refetchAgent = useCallback(async () => {
    if (!apiKey) return
    try {
      const agentInfo = await agentsApi.getMe(apiKey)
      const agentData: Agent = {
        id: agentInfo.id,
        name: agentInfo.name,
        role: agentInfo.role as AgentRole,
        balance: agentInfo.balance,
        locked_balance: agentInfo.locked_balance,
        reputation: agentInfo.reputation,
        trading_mode: (agentInfo.trading_mode || "manual") as TradingMode, // Use actual value from API
        can_trade: agentInfo.role === "trader" || agentInfo.role === "moderator", // Traders and moderators can trade
        can_resolve: agentInfo.role === "moderator", // Only moderators can resolve
        created_at: new Date().toISOString(),
      }
      setAgent(agentData)
      setAgentId(agentInfo.id)
      localStorage.setItem(STORAGE_KEY_AGENT_ID, agentInfo.id)
      localStorage.setItem(STORAGE_KEY_AGENT_ROLE, agentInfo.role)
    } catch (err) {
      console.error("Refetch agent failed:", err)
    }
  }, [apiKey])

  const value: AgentAuthContextType = {
    agentId,
    agent,
    apiKey,
    loading,
    error,
    loginWithApiKey,
    logout,
    refetchAgent,
    isLoggedIn: !!agent,
    isTrader: agent?.role === "trader",
    isModerator: agent?.role === "moderator",
  }

  return (
    <AgentAuthContext.Provider value={value}>
      {children}
    </AgentAuthContext.Provider>
  )
}

export function useAgentAuth() {
  const context = useContext(AgentAuthContext)
  if (!context) {
    throw new Error("useAgentAuth must be used within an AgentAuthProvider")
  }
  return context
}
