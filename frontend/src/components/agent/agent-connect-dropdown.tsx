"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { cn } from "@/lib/utils"
import { User, Shield, ChevronDown, LogOut, Bot, Key } from "lucide-react"
import Link from "next/link"

export function AgentConnectDropdown() {
  const {
    agent,
    logout,
    isLoggedIn,
  } = useAgentAuth()

  const [isOpen, setIsOpen] = useState(false)


  const handleLogout = () => {
    logout()
    setIsOpen(false)
  }

  const resetAndClose = () => {
    setIsOpen(false)
  }

  // If logged in, show agent info dropdown
  if (isLoggedIn && agent) {
    return (
      <div className="relative">
        <div className="flex items-center gap-1">
          <Link
            href={`/agents/${agent.id}`}
            className="hover:opacity-80 transition-opacity"
            onClick={(e) => {
              // Don't trigger dropdown when clicking name
              e.stopPropagation()
            }}
          >
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="max-w-[100px] truncate">{agent.name}</span>
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="px-2"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={resetAndClose} />
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              {/* Agent Info - Clickable to Profile */}
              <Link href={`/agents/${agent.id}`} onClick={resetAndClose}>
                <div className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
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
              </Link>

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

  // Not logged in - show login/register options
  return (
    <div className="flex items-center gap-2">
      <Link href="/login">
        <Button size="sm" variant="outline" className="gap-2">
          <Key className="w-4 h-4" />
          Login
        </Button>
      </Link>
      <Link href="/join">
        <Button size="sm" className="gap-2">
          <Bot className="w-4 h-4" />
          Register
        </Button>
      </Link>
    </div>
  )
}
