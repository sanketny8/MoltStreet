"use client"

import { useMemo } from "react"
import { Trade } from "@/types"

interface PriceChartProps {
  trades?: Trade[]
  loading?: boolean
}

export function PriceChart({ trades = [], loading }: PriceChartProps) {
  // Process trades into chart data points
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return []

    // Filter out invalid trades and sort by time (oldest first for chart)
    const sortedTrades = [...trades]
      .filter((trade) => trade && trade.price != null && trade.created_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Convert to chart points with safe price parsing
    return sortedTrades.map((trade) => {
      // Ensure price is a number (defensive programming)
      const price = typeof trade.price === 'number' ? trade.price : parseFloat(String(trade.price)) || 0
      return {
        time: new Date(trade.created_at).getTime(),
        price: price * 100, // Convert to cents
        side: trade.side,
      }
    })
  }, [trades])

  // Generate SVG path for the price line
  const { path, areaPath, points } = useMemo(() => {
    if (chartData.length === 0) {
      return { path: "", areaPath: "", points: [] }
    }

    const width = 400
    const height = 120
    const padding = { top: 10, bottom: 10, left: 0, right: 0 }

    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Find min/max for scaling
    const prices = chartData.map((d) => d.price)
    const minPrice = Math.max(0, Math.min(...prices) - 5)
    const maxPrice = Math.min(100, Math.max(...prices) + 5)
    const priceRange = maxPrice - minPrice || 1

    const minTime = chartData[0].time
    const maxTime = chartData[chartData.length - 1].time
    const timeRange = maxTime - minTime || 1

    // Scale functions
    const scaleX = (time: number) =>
      padding.left + ((time - minTime) / timeRange) * chartWidth
    const scaleY = (price: number) =>
      padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight

    // Generate points
    const scaledPoints = chartData.map((d) => ({
      x: scaleX(d.time),
      y: scaleY(d.price),
      price: d.price,
      side: d.side,
    }))

    // Create smooth line path
    let linePath = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`
    for (let i = 1; i < scaledPoints.length; i++) {
      linePath += ` L ${scaledPoints[i].x} ${scaledPoints[i].y}`
    }

    // Create area path (closed polygon for gradient fill)
    const lastPoint = scaledPoints[scaledPoints.length - 1]
    const firstPoint = scaledPoints[0]
    const area =
      linePath +
      ` L ${lastPoint.x} ${height - padding.bottom}` +
      ` L ${firstPoint.x} ${height - padding.bottom}` +
      ` Z`

    return { path: linePath, areaPath: area, points: scaledPoints }
  }, [chartData])

  if (loading) {
    return (
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center animate-pulse">
        <p className="text-sm text-gray-400">Loading chart...</p>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            {/* Placeholder wave */}
            <svg viewBox="0 0 400 120" className="w-full h-32 opacity-30">
              <defs>
                <linearGradient id="placeholderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#9CA3AF" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 60 Q 100 50, 200 60 T 400 60 L 400 120 L 0 120 Z"
                fill="url(#placeholderGradient)"
              />
              <path
                d="M 0 60 Q 100 50, 200 60 T 400 60"
                fill="none"
                stroke="#9CA3AF"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No trading activity yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Chart will show price history when trades occur
          </p>
        </div>
      </div>
    )
  }

  // Determine trend color (compare first and last price)
  const firstPrice = chartData[0].price
  const lastPrice = chartData[chartData.length - 1].price
  const isUptrend = lastPrice >= firstPrice
  const trendColor = isUptrend ? "#22C55E" : "#EF4444"

  return (
    <div className="h-64 bg-gray-50 rounded-lg p-4">
      {/* Price labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>
          Start: <span className="font-medium">{firstPrice.toFixed(0)}¢</span>
        </span>
        <span className={isUptrend ? "text-green-600" : "text-red-600"}>
          Current: <span className="font-medium">{lastPrice.toFixed(0)}¢</span>
          {isUptrend ? " ↑" : " ↓"}
        </span>
      </div>

      {/* Chart SVG */}
      <svg viewBox="0 0 400 120" className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1="0" y1="30" x2="400" y2="30" stroke="#E5E7EB" strokeWidth="1" />
        <line x1="0" y1="60" x2="400" y2="60" stroke="#E5E7EB" strokeWidth="1" />
        <line x1="0" y1="90" x2="400" y2="90" stroke="#E5E7EB" strokeWidth="1" />

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGradient)" />

        {/* Price line */}
        <path d={path} fill="none" stroke={trendColor} strokeWidth="2" strokeLinecap="round" />

        {/* Current price dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill={trendColor}
          />
        )}
      </svg>

      {/* Trade count */}
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{chartData.length} trades</span>
        <span>
          {new Date(chartData[0].time).toLocaleDateString()} -{" "}
          {new Date(chartData[chartData.length - 1].time).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
