"use client"

import { useState, useMemo, useEffect } from "react"
import { CategoryTabs, CategoryFilter } from "@/components/markets/category-tabs"
import { MarketGrid } from "@/components/markets/market-grid"
import { CreateMarketForm } from "@/components/markets/create-market-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { SortTabs, SortOption } from "@/components/ui/sort-tabs"
import { Pagination, ItemsPerPage } from "@/components/ui/pagination"
import { useMarkets } from "@/hooks"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { cn } from "@/lib/utils"
import { Search, SlidersHorizontal, Plus, X, ChevronDown } from "lucide-react"

type StatusFilter = "all" | "live" | "ended" | "resolved"

export default function MarketsPage() {
  const { markets, loading, error, refetch } = useMarkets()
  const { isLoggedIn, isTrader } = useAgentAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("trending")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [sortBy, searchQuery, statusFilter, categoryFilter])

  // Sort and filter markets
  const sortedMarkets = useMemo(() => {
    let filtered = [...markets]
    const now = new Date()

    // Apply category filter
    if (categoryFilter === "trending") {
      // For trending, sort by volume and take top markets
      filtered.sort((a, b) => b.volume - a.volume)
    } else if (categoryFilter !== "all") {
      // Filter by specific category
      filtered = filtered.filter((m) => m.category === categoryFilter)
    }

    // Apply status filter
    switch (statusFilter) {
      case "live":
        filtered = filtered.filter(
          (m) => m.status === "open" && new Date(m.deadline) > now
        )
        break
      case "ended":
        filtered = filtered.filter(
          (m) => m.status !== "open" || new Date(m.deadline) <= now
        )
        break
      case "resolved":
        filtered = filtered.filter((m) => m.status === "resolved")
        break
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.question.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      )
    }

    // Apply sorting (skip if already sorted by trending)
    if (categoryFilter !== "trending") {
      switch (sortBy) {
        case "trending":
        case "volume":
          filtered.sort((a, b) => b.volume - a.volume)
          break
        case "newest":
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          break
        case "ending":
          // For ending soon, only show live markets and sort by deadline
          if (statusFilter === "all") {
            filtered = filtered.filter(
              (m) => m.status === "open" && new Date(m.deadline) > now
            )
          }
          filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
          break
      }
    }

    return filtered
  }, [markets, sortBy, searchQuery, statusFilter, categoryFilter])

  // Pagination
  const totalPages = Math.ceil(sortedMarkets.length / itemsPerPage)
  const paginatedMarkets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedMarkets.slice(start, start + itemsPerPage)
  }, [sortedMarkets, currentPage, itemsPerPage])

  // Count markets by status
  const statusCounts = useMemo(() => {
    const now = new Date()
    let live = 0, ended = 0, resolved = 0

    // Apply category filter to counts
    let filtered = markets
    if (categoryFilter === "trending") {
      // For trending, use all markets
    } else if (categoryFilter !== "all") {
      filtered = markets.filter((m) => m.category === categoryFilter)
    }

    filtered.forEach((m) => {
      if (m.status === "resolved") {
        resolved++
        ended++
      } else if (m.status !== "open" || new Date(m.deadline) <= now) {
        ended++
      } else {
        live++
      }
    })

    return { all: filtered.length, live, ended, resolved }
  }, [markets, categoryFilter])

  // Count markets by category
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: markets.length,
      trending: Math.min(10, markets.length), // Top 10 by volume
      crypto: 0,
      politics: 0,
      sports: 0,
      tech: 0,
      ai: 0,
      finance: 0,
      culture: 0,
    }

    markets.forEach((m) => {
      if (m.category && counts[m.category as CategoryFilter] !== undefined) {
        counts[m.category as CategoryFilter]++
      }
    })

    return counts
  }, [markets])

  const clearFilters = () => {
    setStatusFilter("all")
    setSearchQuery("")
    setSortBy("trending")
    setCategoryFilter("all")
  }

  const hasActiveFilters = statusFilter !== "all" || searchQuery.trim() !== "" || categoryFilter !== "all"

  // Get display title based on category
  const getTitle = () => {
    if (categoryFilter === "all") return "All Markets"
    if (categoryFilter === "trending") return "Trending Markets"
    return `${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)} Markets`
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{getTitle()}</h1>
          <p className="text-gray-500 text-sm">
            {loading ? "Loading..." : (
              hasActiveFilters
                ? `${sortedMarkets.length} of ${markets.length} markets`
                : `${markets.length} markets`
            )}
          </p>
        </div>
{isLoggedIn && isTrader && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Market
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <CategoryTabs
          selected={categoryFilter}
          onSelect={setCategoryFilter}
          counts={categoryCounts}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search markets..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {(statusFilter !== "all" || searchQuery.trim() !== "") && (
            <span className="ml-2 w-2 h-2 bg-purple-500 rounded-full"></span>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 ml-2 transition-transform",
            showFilters && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  statusFilter === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-purple-300"
                )}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter("live")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                  statusFilter === "live"
                    ? "bg-green-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
                )}
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  statusFilter === "live" ? "bg-white" : "bg-green-500"
                )}></span>
                Live ({statusCounts.live})
              </button>
              <button
                onClick={() => setStatusFilter("ended")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  statusFilter === "ended"
                    ? "bg-gray-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                )}
              >
                Ended ({statusCounts.ended})
              </button>
              <button
                onClick={() => setStatusFilter("resolved")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  statusFilter === "resolved"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
                )}
              >
                Resolved ({statusCounts.resolved})
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && !showFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-gray-500">Active filters:</span>
          {categoryFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1 capitalize">
              Category: {categoryFilter}
              <button onClick={() => setCategoryFilter("all")} className="ml-1 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter("all")} className="ml-1 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={clearFilters}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Sort Bar - hide when trending category is selected */}
      {categoryFilter !== "trending" && (
        <div className="mb-6">
          <SortTabs
            value={sortBy}
            onChange={setSortBy}
            showCount={sortedMarkets.length}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <Skeleton className="h-4 w-16 mb-3" />
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-5 w-3/4 mb-4" />
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-16 flex-1" />
                <Skeleton className="h-16 flex-1" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Failed to load markets</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedMarkets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No markets found</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Markets Grid */}
      {!loading && !error && sortedMarkets.length > 0 && (
        <>
          {/* Items per page selector */}
          <div className="flex items-center justify-between mb-4">
            <ItemsPerPage
              value={itemsPerPage}
              onChange={(val) => {
                setItemsPerPage(val)
                setCurrentPage(1)
              }}
              options={[8, 12, 24, 48]}
            />
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <MarketGrid
            markets={paginatedMarkets}
            groupByStatus={false}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={sortedMarkets.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </>
      )}

      {/* Create Market Modal */}
      <CreateMarketForm
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onMarketCreated={refetch}
      />
    </div>
  )
}
