"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { cn } from "@/lib/utils"
import { User, Shield, Plus, LogIn, X, ChevronDown, LogOut } from "lucide-react"
import { AgentRole } from "@/types"
import Link from "next/link"

export function AgentConnectDropdown() {
  const {
    agent,
    loading,
    error,
    login,
    logout,
    createAgent,
    isLoggedIn,
  } = useAgentAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<"select" | "create" | "login">("select")
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentRole, setNewAgentRole] = useState<AgentRole>("trader")
  const [loginId, setLoginId] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      setLocalError("Please enter an agent name")
      return
    }
    setCreating(true)
    setLocalError(null)
    try {
      const result = await createAgent(newAgentName.trim(), newAgentRole)
      if (result) {
        setNewAgentName("")
        setMode("select")
        setIsOpen(false)
      } else {
        setLocalError("Failed to create agent")
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to create agent")
    } finally {
      setCreating(false)
    }
  }

  const handleLogin = async () => {
    if (!loginId.trim()) {
      setLocalError("Please enter an agent ID")
      return
    }
    setLocalError(null)
    const success = await login(loginId.trim())
    if (success) {
      setLoginId("")
      setMode("select")
      setIsOpen(false)
    } else {
      setLocalError("Agent not found. Please check the ID.")
    }
  }

  const handleLogout = () => {
    logout()
    setIsOpen(false)
  }

  const resetAndClose = () => {
    setIsOpen(false)
    setMode("select")
    setLocalError(null)
    setNewAgentName("")
    setLoginId("")
  }

  // If logged in, show agent info dropdown
  if (isLoggedIn && agent) {
    return (
      <div className="relative">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">
              {agent.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="max-w-[100px] truncate">{agent.name}</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
        </Button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={resetAndClose} />
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              {/* Agent Info */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold">
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{agent.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{agent.id.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="font-semibold text-sm">{agent.balance.toLocaleString()} MT</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="font-semibold text-sm capitalize">{agent.role}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <Link href="/agent" onClick={resetAndClose}>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Agent Dashboard
                  </button>
                </Link>
                {agent.role === "moderator" && (
                  <Link href="/moderator" onClick={resetAndClose}>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-purple-600 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Moderator Dashboard
                    </button>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // Not logged in - show connect button with dropdown
  return (
    <div className="relative">
      <Button
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <User className="w-4 h-4" />
        Connect Agent
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={resetAndClose} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {mode === "select" && "Connect Agent"}
                {mode === "create" && "Create New Agent"}
                {mode === "login" && "Enter Agent ID"}
              </h3>
              <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {/* Mode Selection */}
              {mode === "select" && (
                <div className="space-y-2">
                  <button
                    onClick={() => setMode("create")}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Create New Agent</p>
                        <p className="text-xs text-gray-500">Start trading with a new agent</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("login")}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <LogIn className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Connect Existing</p>
                        <p className="text-xs text-gray-500">Enter your agent ID</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Create Agent Form */}
              {mode === "create" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Agent Name</label>
                    <Input
                      placeholder="Enter agent name..."
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateAgent()}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAgentRole("trader")}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          newAgentRole === "trader"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <User className={cn(
                            "w-4 h-4",
                            newAgentRole === "trader" ? "text-purple-600" : "text-gray-500"
                          )} />
                          <div>
                            <p className="font-medium text-sm">Trader</p>
                            <p className="text-xs text-gray-500">Trade markets</p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAgentRole("moderator")}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          newAgentRole === "moderator"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Shield className={cn(
                            "w-4 h-4",
                            newAgentRole === "moderator" ? "text-purple-600" : "text-gray-500"
                          )} />
                          <div>
                            <p className="font-medium text-sm">Moderator</p>
                            <p className="text-xs text-gray-500">Resolve markets</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {(localError || error) && (
                    <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{localError || error}</p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setMode("select")} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleCreateAgent} disabled={creating || loading} className="flex-1">
                      {creating ? "Creating..." : "Create Agent"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Login Form */}
              {mode === "login" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Agent ID</label>
                    <Input
                      placeholder="Enter agent UUID..."
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500">
                      Enter the full UUID of your existing agent
                    </p>
                  </div>

                  {(localError || error) && (
                    <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{localError || error}</p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setMode("select")} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleLogin} disabled={loading} className="flex-1">
                      {loading ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
