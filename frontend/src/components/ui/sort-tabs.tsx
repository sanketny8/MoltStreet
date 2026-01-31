"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, BarChart3, Clock, Timer, Flame } from "lucide-react"

export type SortOption = "trending" | "volume" | "newest" | "ending"

interface SortTabsProps {
  value: SortOption
  onChange: (value: SortOption) => void
  showCount?: number
  className?: string
}

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "trending", label: "Trending", icon: <Flame className="w-4 h-4" /> },
  { value: "volume", label: "Volume", icon: <BarChart3 className="w-4 h-4" /> },
  { value: "newest", label: "Newest", icon: <Clock className="w-4 h-4" /> },
  { value: "ending", label: "Ending Soon", icon: <Timer className="w-4 h-4" /> },
]

export function SortTabs({ value, onChange, showCount, className }: SortTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-gray-100 rounded-xl", className)}>
      {sortOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            value === option.value
              ? "bg-white text-purple-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <span className={cn(
            "transition-colors",
            value === option.value ? "text-purple-500" : "text-gray-400"
          )}>
            {option.icon}
          </span>
          {option.label}
        </button>
      ))}
      {showCount !== undefined && (
        <span className="ml-auto pr-3 text-sm text-gray-500">
          {showCount} markets
        </span>
      )}
    </div>
  )
}

// Alternative compact version
export function SortTabsCompact({ value, onChange, className }: Omit<SortTabsProps, 'showCount'>) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 p-1 bg-gray-100 rounded-lg", className)}>
      {sortOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
            value === option.value
              ? "bg-white text-purple-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <span className={cn(
            "transition-colors",
            value === option.value ? "text-purple-500" : "text-gray-400"
          )}>
            {option.icon}
          </span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
