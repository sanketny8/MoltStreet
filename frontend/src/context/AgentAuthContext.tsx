"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { Agent, AgentRole } from "@/types"
import { agentsApi } from "@/lib/api"

interface AgentAuthContextType {
  // State
  agentId: string | null
  agent: Agent | null
  loading: boolean
  error: string | null

  // Actions
  login: (agentId: string) => Promise<boolean>
  logout: () => void
  createAgent: (name: string, role: AgentRole) => Promise<Agent | null>
  refetchAgent: () => Promise<void>

  // Helpers
  isLoggedIn: boolean
  isTrader: boolean
  isModerator: boolean
}

const AgentAuthContext = createContext<AgentAuthContextType | null>(null)

const STORAGE_KEY_AGENT_ID = "agentId"
const STORAGE_KEY_AGENT_ROLE = "agentRole"

interface AgentAuthProviderProps {
  children: ReactNode
}

export function AgentAuthProvider({ children }: AgentAuthProviderProps) {
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load agent ID from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY_AGENT_ID)
    if (storedId) {
      setAgentId(storedId)
    } else {
      setLoading(false)
    }
  }, [])

  // Fetch agent data when agentId changes
  useEffect(() => {
    if (!agentId) {
      setAgent(null)
      setLoading(false)
      return
    }

    const fetchAgent = async () => {
      setLoading(true)
      setError(null)
      try {
        const agentData = await agentsApi.get(agentId)
        setAgent(agentData)
        // Update role in localStorage for quick access
        localStorage.setItem(STORAGE_KEY_AGENT_ROLE, agentData.role)
      } catch (err) {
        console.error("Failed to fetch agent:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch agent")
        setAgent(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [agentId])

  const login = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      // Verify the agent exists
      const agentData = await agentsApi.get(id)
      localStorage.setItem(STORAGE_KEY_AGENT_ID, id)
      localStorage.setItem(STORAGE_KEY_AGENT_ROLE, agentData.role)
      setAgentId(id)
      setAgent(agentData)
      return true
    } catch (err) {
      console.error("Login failed:", err)
      setError(err instanceof Error ? err.message : "Agent not found")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_AGENT_ID)
    localStorage.removeItem(STORAGE_KEY_AGENT_ROLE)
    setAgentId(null)
    setAgent(null)
    setError(null)
  }, [])

  const createAgent = useCallback(async (name: string, role: AgentRole): Promise<Agent | null> => {
    setLoading(true)
    setError(null)
    try {
      const newAgent = await agentsApi.create({ name, role })
      localStorage.setItem(STORAGE_KEY_AGENT_ID, newAgent.id)
      localStorage.setItem(STORAGE_KEY_AGENT_ROLE, newAgent.role)
      setAgentId(newAgent.id)
      setAgent(newAgent)
      return newAgent
    } catch (err) {
      console.error("Create agent failed:", err)
      setError(err instanceof Error ? err.message : "Failed to create agent")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const refetchAgent = useCallback(async () => {
    if (!agentId) return
    try {
      const agentData = await agentsApi.get(agentId)
      setAgent(agentData)
      localStorage.setItem(STORAGE_KEY_AGENT_ROLE, agentData.role)
    } catch (err) {
      console.error("Refetch agent failed:", err)
    }
  }, [agentId])

  const value: AgentAuthContextType = {
    agentId,
    agent,
    loading,
    error,
    login,
    logout,
    createAgent,
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
