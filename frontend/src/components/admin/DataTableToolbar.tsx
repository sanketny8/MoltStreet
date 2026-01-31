"use client"

import { Search, X, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FilterOption {
  value: string
  label: string
}

interface Filter {
  key: string
  label: string
  options: FilterOption[]
  value?: string
  onChange: (value: string | undefined) => void
}

interface ActiveFilter {
  key: string
  label: string
  value: string
  displayValue: string
  onRemove: () => void
}

interface DataTableToolbarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: Filter[]
  activeFilters?: ActiveFilter[]
  onRefresh?: () => void
  loading?: boolean
  children?: React.ReactNode
}

export function DataTableToolbar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  activeFilters = [],
  onRefresh,
  loading,
  children,
}: DataTableToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-9"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        {filters.map((filter) => (
          <select
            key={filter.key}
            value={filter.value || ""}
            onChange={(e) => filter.onChange(e.target.value || undefined)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}

        {/* Custom actions */}
        {children}
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {filter.label}: {filter.displayValue}
              <button
                onClick={filter.onRemove}
                className="ml-1 rounded-full p-0.5 hover:bg-gray-300"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={() => activeFilters.forEach((f) => f.onRemove())}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
