import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency, formatTimeRemaining } from "@/lib/utils"
import { Market, MarketCategory } from "@/types"
import { Clock, DollarSign, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

const categoryColors: Record<MarketCategory, string> = {
  crypto: "bg-yellow-100 text-yellow-800 border-yellow-200",
  politics: "bg-blue-100 text-blue-800 border-blue-200",
  sports: "bg-green-100 text-green-800 border-green-200",
  tech: "bg-purple-100 text-purple-800 border-purple-200",
  ai: "bg-pink-100 text-pink-800 border-pink-200",
  finance: "bg-emerald-100 text-emerald-800 border-emerald-200",
  culture: "bg-indigo-100 text-indigo-800 border-indigo-200",
}

interface MarketCardProps {
  market: Market
}

export function MarketCard({ market }: MarketCardProps) {
  const yesPercent = Math.round(market.yes_price * 100)
  const noPercent = Math.round((market.no_price ?? (1 - market.yes_price)) * 100)

  // Check if market has ended (deadline passed or not open status)
  const isEnded = market.status !== "open" || new Date(market.deadline) < new Date()
  const isResolved = market.status === "resolved"
  const isClosed = market.status === "closed"

  return (
    <Link href={`/markets/${market.id}`}>
      <Card className={cn(
        "transition-all cursor-pointer hover:-translate-y-0.5 relative overflow-hidden",
        isEnded
          ? "opacity-75 hover:opacity-90 bg-gray-50 border-gray-300"
          : "hover:shadow-lg"
      )}>
        {/* Status Banner for ended markets */}
        {isResolved && (
          <div className={cn(
            "absolute top-0 left-0 right-0 py-1.5 px-3 text-xs font-medium text-center text-white",
            market.outcome === "YES" ? "bg-green-500" : "bg-red-500"
          )}>
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Resolved: {market.outcome}
            </div>
          </div>
        )}
        {isClosed && !isResolved && (
          <div className="absolute top-0 left-0 right-0 py-1.5 px-3 text-xs font-medium text-center text-white bg-gray-500">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3" />
              Closed
            </div>
          </div>
        )}
        {!isResolved && !isClosed && isEnded && (
          <div className="absolute top-0 left-0 right-0 py-1.5 px-3 text-xs font-medium text-center text-white bg-orange-500">
            <div className="flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Awaiting Resolution
            </div>
          </div>
        )}

        <CardHeader className={cn("pb-3", isEnded && "pt-10")}>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={cn(
                "capitalize text-xs font-medium border",
                market.category && categoryColors[market.category]
                  ? categoryColors[market.category]
                  : "bg-gray-100 text-gray-800 border-gray-200"
              )}
            >
              {market.category || "general"}
            </Badge>
            {!isEnded && (
              <Badge variant="yes" className="animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 inline-block"></span>
                Live
              </Badge>
            )}
          </div>
          <h3 className={cn(
            "font-semibold text-base leading-snug line-clamp-2",
            isEnded && "text-gray-600"
          )}>
            {market.question}
          </h3>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Yes/No Price Display */}
          <div className="flex gap-2 mb-4">
            <div className={cn(
              "flex-1 rounded-lg p-3 text-center border",
              isEnded
                ? "bg-gray-100 border-gray-200"
                : "bg-green-50 border-green-100",
              isResolved && market.outcome === "YES" && "ring-2 ring-green-500 bg-green-100"
            )}>
              <span className={cn(
                "font-bold text-xl",
                isEnded ? "text-gray-500" : "text-green-600",
                isResolved && market.outcome === "YES" && "text-green-600"
              )}>
                {yesPercent}%
              </span>
              <p className={cn(
                "text-xs font-medium mt-0.5",
                isEnded ? "text-gray-400" : "text-green-600",
                isResolved && market.outcome === "YES" && "text-green-600"
              )}>YES</p>
            </div>
            <div className={cn(
              "flex-1 rounded-lg p-3 text-center border",
              isEnded
                ? "bg-gray-100 border-gray-200"
                : "bg-red-50 border-red-100",
              isResolved && market.outcome === "NO" && "ring-2 ring-red-500 bg-red-100"
            )}>
              <span className={cn(
                "font-bold text-xl",
                isEnded ? "text-gray-500" : "text-red-600",
                isResolved && market.outcome === "NO" && "text-red-600"
              )}>
                {noPercent}%
              </span>
              <p className={cn(
                "text-xs font-medium mt-0.5",
                isEnded ? "text-gray-400" : "text-red-600",
                isResolved && market.outcome === "NO" && "text-red-600"
              )}>NO</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{formatCurrency(market.volume)} Vol</span>
            </div>
            <div className={cn(
              "flex items-center gap-1",
              isEnded && "text-orange-600 font-medium"
            )}>
              <Clock className="w-3 h-3" />
              <span>{formatTimeRemaining(market.deadline)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
