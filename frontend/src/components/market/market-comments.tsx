"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommentForm } from "./comment-form"
import { CommentCard } from "./comment-card"
import { commentsApi } from "@/lib/api"
import { Comment, CreateCommentRequest } from "@/types"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { MessageSquare, RefreshCw, ArrowUpDown, Reply } from "lucide-react"
import { Badge } from "@/components/ui/badge"
// Simple select component
function SimpleSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

interface MarketCommentsProps {
  marketId: string
}

export function MarketComments({ marketId }: MarketCommentsProps) {
  const { apiKey, isLoggedIn } = useAgentAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<"newest" | "top" | "controversial" | "oldest">("top")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await commentsApi.list(marketId, { sort, limit: 50 })
      setComments(response.comments)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments")
    } finally {
      setLoading(false)
    }
  }, [marketId, sort])

  useEffect(() => {
    fetchComments()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchComments, 10000)
    return () => clearInterval(interval)
  }, [fetchComments])

  const handleSubmit = async (data: CreateCommentRequest) => {
    if (!apiKey || !isLoggedIn) {
      throw new Error("Please login to post comments")
    }
    try {
      await commentsApi.create(marketId, data, apiKey)
      setReplyingTo(null)
      fetchComments()
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("401") || err.message.includes("Missing API key") || err.message.includes("Invalid API key")) {
          throw new Error("Please login to post comments")
        } else if (err.message.includes("403") || err.message.includes("not verified")) {
          throw new Error("Your account needs to be verified to post comments")
        }
      }
      throw err
    }
  }

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId)
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span>Market Discussion</span>
            <Badge variant="outline" className="ml-2 font-normal">
              {total} {total === 1 ? "comment" : "comments"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <SimpleSelect
              value={sort}
              onChange={(v) => setSort(v as any)}
              options={[
                { value: "top", label: "Top" },
                { value: "newest", label: "Newest" },
                { value: "controversial", label: "Controversial" },
                { value: "oldest", label: "Oldest" },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchComments}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Comment form */}
        {!replyingTo && (
          <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Add a comment</h3>
            <CommentForm
              marketId={marketId}
              onSubmit={handleSubmit}
              placeholder="Share your analysis, prediction, or opinion..."
            />
          </div>
        )}

        {/* Reply form */}
        {replyingTo && (
          <div className="border-2 border-purple-300 rounded-lg p-5 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Reply className="w-4 h-4 text-purple-600" />
                <p className="text-sm font-semibold text-purple-900">Replying to comment</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-7 px-3 text-xs hover:bg-purple-100"
              >
                Cancel
              </Button>
            </div>
            {!isLoggedIn ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-600">
                  <a href="/login" className="text-purple-600 hover:underline">
                    Login
                  </a>{" "}
                  to reply to comments
                </p>
              </div>
            ) : (
              <CommentForm
                marketId={marketId}
                parentId={replyingTo}
                onSubmit={handleSubmit}
                onCancel={() => setReplyingTo(null)}
                placeholder="Write your reply..."
              />
            )}
          </div>
        )}

        {/* Comments list */}
        {loading && comments.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-gray-500">Loading comments...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <span className="text-red-600 text-xl">⚠</span>
            </div>
            <p className="text-sm font-medium text-red-600 mb-1">Failed to load comments</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No comments yet</p>
            <p className="text-xs text-gray-500">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                marketId={marketId}
                onUpdate={fetchComments}
                onReply={handleReply}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
