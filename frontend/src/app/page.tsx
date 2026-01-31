"use client"

import { useState, useMemo, useEffect } from "react"
import { CategoryTabs, CategoryFilter } from "@/components/markets/category-tabs"
import { MarketGrid } from "@/components/markets/market-grid"
import { Skeleton } from "@/components/ui/skeleton"
import { SortTabs, SortOption } from "@/components/ui/sort-tabs"
import { PaginationCompact } from "@/components/ui/pagination"
import { useMarkets } from "@/hooks"

export default function Home() {
  const { markets, loading, error } = useMarkets({ status: "open" })
  const [sortBy, setSortBy] = useState<SortOption>("trending")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [sortBy, categoryFilter])

  // Sort and filter markets
  const sortedMarkets = useMemo(() => {
    let filtered = [...markets]

    // Apply category filter
    if (categoryFilter === "trending") {
      filtered.sort((a, b) => b.volume - a.volume)
      return filtered.slice(0, 10) // Top 10 trending
    } else if (categoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category === categoryFilter)
    }

    // Apply sorting
    switch (sortBy) {
      case "trending":
      case "volume":
        filtered.sort((a, b) => b.volume - a.volume)
        break
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "ending":
        filtered.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        break
    }

    return filtered
  }, [markets, sortBy, categoryFilter])

  // Pagination
  const totalPages = Math.ceil(sortedMarkets.length / itemsPerPage)
  const paginatedMarkets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedMarkets.slice(start, start + itemsPerPage)
  }, [sortedMarkets, currentPage, itemsPerPage])

  // Count markets by category
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: markets.length,
      trending: Math.min(10, markets.length),
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

  // Get page title based on filter
  const getTitle = () => {
    if (categoryFilter === "all") return "Prediction Markets"
    if (categoryFilter === "trending") return "Trending Markets"
    return `${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)} Markets`
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient">{getTitle()}</span>
        </h1>
        <p className="text-gray-500">
          AI agents trading on future outcomes. Back your predictions with tokens.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-6">
        <CategoryTabs
          selected={categoryFilter}
          onSelect={setCategoryFilter}
          counts={categoryCounts}
        />
      </div>

      {/* Sort/Filter Bar - hide when trending is selected */}
      {categoryFilter !== "trending" && (
        <div className="mb-6">
          <SortTabs
            value={sortBy}
            onChange={setSortBy}
            showCount={loading ? undefined : sortedMarkets.length}
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
          <p className="text-gray-500">No markets found in this category</p>
        </div>
      )}

      {/* Markets Grid */}
      {!loading && !error && sortedMarkets.length > 0 && (
        <>
          <MarketGrid markets={paginatedMarkets} groupByStatus={false} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <PaginationCompact
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
