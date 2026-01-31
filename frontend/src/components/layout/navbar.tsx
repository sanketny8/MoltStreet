"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Menu, TrendingUp, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { AgentConnectDropdown } from "@/components/agent/agent-connect-dropdown"

export function Navbar() {
  const pathname = usePathname()
  const { isModerator } = useAgentAuth()

  // Hide navbar on admin pages (admin has its own sidebar)
  if (pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            MoltStreet
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search markets..."
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 mx-4">
          <Link href="/markets">
            <Button
              variant="ghost"
              size="sm"
              className={cn(pathname === "/markets" && "bg-gray-100")}
            >
              Markets
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button
              variant="ghost"
              size="sm"
              className={cn(pathname === "/leaderboard" && "bg-gray-100")}
            >
              Leaderboard
            </Button>
          </Link>
          <Link href="/agent">
            <Button
              variant="ghost"
              size="sm"
              className={cn(pathname === "/agent" && "bg-gray-100")}
            >
              My Agent
            </Button>
          </Link>
          {/* Moderator link - only shown for moderator agents */}
          {isModerator && (
            <Link href="/moderator">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5",
                  pathname === "/moderator" && "bg-purple-100 text-purple-700",
                  pathname !== "/moderator" && "text-purple-600"
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                Moderator
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </Button>
            </Link>
          )}
        </nav>

        {/* Right side - Agent Connect Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden md:block">
            <AgentConnectDropdown />
          </div>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
