import { MarketCard } from "./market-card"
import { Market } from "@/types"
import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS_PER_PAGE = 12

interface MarketGridProps {
  markets: Market[]
  groupByStatus?: boolean
}

export function MarketGrid({ markets, groupByStatus = true }: MarketGridProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Separate live and ended markets
  const { liveMarkets, endedMarkets } = useMemo(() => {
    const now = new Date()
    const live: Market[] = []
    const ended: Market[] = []

    markets.forEach((market) => {
      const isEnded = market.status !== "open" || new Date(market.deadline) < now
      if (isEnded) {
        ended.push(market)
      } else {
        live.push(market)
      }
    })

    return { liveMarkets: live, endedMarkets: ended }
  }, [markets])

  // Pagination logic
  const totalPages = Math.ceil(markets.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedMarkets = markets.slice(startIndex, endIndex)

  // Reset to page 1 when markets change
  useMemo(() => {
    if (currentPage > Math.ceil(markets.length / ITEMS_PER_PAGE)) {
      setCurrentPage(1)
    }
  }, [markets.length, currentPage])

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No markets found</p>
      </div>
    )
  }

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-end gap-2 mt-6">
        <span className="text-sm text-gray-500">
          {startIndex + 1}-{Math.min(endIndex, markets.length)} of {markets.length}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={cn(
            "p-1.5 rounded-lg border transition-colors",
            currentPage === 1
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors",
                currentPage === page
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className={cn(
            "p-1.5 rounded-lg border transition-colors",
            currentPage === totalPages
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // If not grouping, show paginated grid
  if (!groupByStatus) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
        <Pagination />
      </div>
    )
  }

  // For grouped view, paginate within each section
  const paginatedLive = liveMarkets.slice(startIndex, endIndex)
  const remainingSlots = ITEMS_PER_PAGE - paginatedLive.length
  const endedStartIndex = Math.max(0, startIndex - liveMarkets.length)
  const paginatedEnded = remainingSlots > 0 && startIndex >= liveMarkets.length
    ? endedMarkets.slice(endedStartIndex, endedStartIndex + ITEMS_PER_PAGE)
    : remainingSlots > 0
      ? endedMarkets.slice(0, remainingSlots)
      : []

  return (
    <div>
      <div className="space-y-8">
        {/* Live Markets Section */}
        {paginatedLive.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-semibold text-gray-900">
                Live Markets
              </h2>
              <span className="text-sm text-gray-500">({liveMarkets.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedLive.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </section>
        )}

        {/* Ended Markets Section */}
        {paginatedEnded.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <h2 className="text-lg font-semibold text-gray-600">
                Ended Markets
              </h2>
              <span className="text-sm text-gray-500">({endedMarkets.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedEnded.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </section>
        )}

        {/* Show message if only ended markets exist */}
        {liveMarkets.length === 0 && endedMarkets.length > 0 && currentPage === 1 && (
          <div className="text-center py-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-sm">
              No live markets available. Check back later or create a new market.
            </p>
          </div>
        )}
      </div>
      <Pagination />
    </div>
  )
}
