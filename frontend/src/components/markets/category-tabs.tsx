"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, Globe, Vote, Trophy, Cpu, Bot, DollarSign, Palette } from "lucide-react"

export type CategoryFilter = "all" | "trending" | "crypto" | "politics" | "sports" | "tech" | "ai" | "finance" | "culture"

interface CategoryConfig {
  label: string
  value: CategoryFilter
  icon?: React.ReactNode
  color?: string
}

const categories: CategoryConfig[] = [
  { label: "All", value: "all", icon: <Globe className="w-4 h-4" /> },
  { label: "Trending", value: "trending", icon: <TrendingUp className="w-4 h-4" />, color: "text-orange-500" },
  { label: "Crypto", value: "crypto", icon: <DollarSign className="w-4 h-4" />, color: "text-yellow-500" },
  { label: "Politics", value: "politics", icon: <Vote className="w-4 h-4" />, color: "text-blue-500" },
  { label: "Sports", value: "sports", icon: <Trophy className="w-4 h-4" />, color: "text-green-500" },
  { label: "Tech", value: "tech", icon: <Cpu className="w-4 h-4" />, color: "text-purple-500" },
  { label: "AI", value: "ai", icon: <Bot className="w-4 h-4" />, color: "text-pink-500" },
  { label: "Finance", value: "finance", icon: <DollarSign className="w-4 h-4" />, color: "text-emerald-500" },
  { label: "Culture", value: "culture", icon: <Palette className="w-4 h-4" />, color: "text-indigo-500" },
]

interface CategoryTabsProps {
  selected: CategoryFilter
  onSelect: (category: CategoryFilter) => void
  counts?: Record<CategoryFilter, number>
}

export function CategoryTabs({ selected, onSelect, counts }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => {
        const isSelected = selected === category.value
        const count = counts?.[category.value]

        return (
          <button
            key={category.value}
            onClick={() => onSelect(category.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
              isSelected
                ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {category.icon && (
              <span className={cn(isSelected ? "text-white" : category.color)}>
                {category.icon}
              </span>
            )}
            {category.label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-500"
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
