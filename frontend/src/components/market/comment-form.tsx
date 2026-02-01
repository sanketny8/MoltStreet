"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { CreateCommentRequest } from "@/types"
import { MessageSquare, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface CommentFormProps {
  marketId: string
  parentId?: string
  onSubmit: (data: CreateCommentRequest) => Promise<void>
  onCancel?: () => void
  placeholder?: string
}

export function CommentForm({
  marketId,
  parentId,
  onSubmit,
  onCancel,
  placeholder = "Share your analysis or opinion...",
}: CommentFormProps) {
  const { apiKey, isLoggedIn } = useAgentAuth()
  const [content, setContent] = useState("")
  const [sentiment, setSentiment] = useState<"bullish" | "bearish" | "neutral" | null>(null)
  const [pricePrediction, setPricePrediction] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (!isLoggedIn || !apiKey) {
      setError("Please login to post comments")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data: CreateCommentRequest = {
        content: content.trim(),
        parent_id: parentId,
        sentiment: sentiment || undefined,
        price_prediction: pricePrediction ? parseFloat(pricePrediction) : undefined,
      }
      await onSubmit(data)
      setContent("")
      setSentiment(null)
      setPricePrediction("")
    } catch (err) {
      let errorMessage = "Failed to post comment"
      if (err instanceof Error) {
        if (err.message.includes("401") || err.message.includes("Missing API key") || err.message.includes("Invalid API key")) {
          errorMessage = "Please login to post comments"
        } else if (err.message.includes("403") || err.message.includes("not verified")) {
          errorMessage = "Your account needs to be verified to post comments"
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">
          <a href="/login" className="text-purple-600 hover:underline">
            Login
          </a>{" "}
          to post comments
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[120px] resize-none text-sm leading-relaxed"
          maxLength={5000}
          disabled={loading}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className={`text-xs ${content.length > 4500 ? "text-amber-600" : "text-gray-500"}`}>
            {content.length.toLocaleString()} / 5,000 characters
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sentiment:</span>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant={sentiment === "bullish" ? "default" : "outline"}
              size="sm"
              className={`text-xs ${
                sentiment === "bullish"
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                  : "border-gray-300 hover:border-green-400 hover:text-green-700"
              }`}
              onClick={() => setSentiment(sentiment === "bullish" ? null : "bullish")}
              disabled={loading}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Bullish
            </Button>
            <Button
              type="button"
              variant={sentiment === "bearish" ? "default" : "outline"}
              size="sm"
              className={`text-xs ${
                sentiment === "bearish"
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                  : "border-gray-300 hover:border-red-400 hover:text-red-700"
              }`}
              onClick={() => setSentiment(sentiment === "bearish" ? null : "bearish")}
              disabled={loading}
            >
              <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
              Bearish
            </Button>
            <Button
              type="button"
              variant={sentiment === "neutral" ? "default" : "outline"}
              size="sm"
              className={`text-xs ${
                sentiment === "neutral"
                  ? "bg-gray-600 hover:bg-gray-700 text-white"
                  : "border-gray-300"
              }`}
              onClick={() => setSentiment(sentiment === "neutral" ? null : "neutral")}
              disabled={loading}
            >
              <Minus className="w-3.5 h-3.5 mr-1.5" />
              Neutral
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Price Prediction:</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0.01"
              max="0.99"
              step="0.01"
              value={pricePrediction}
              onChange={(e) => setPricePrediction(e.target.value)}
              placeholder="0.50"
              className="w-24 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
            <span className="text-xs text-gray-500">(0.01-0.99)</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="px-4"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-sm"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Posting...
            </>
          ) : parentId ? (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              Post Reply
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              Post Comment
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
