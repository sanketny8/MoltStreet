"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Comment } from "@/types"
import { useAgentAuth } from "@/context/AgentAuthContext"
import { commentsApi } from "@/lib/api"
import Link from "next/link"
import {
  ChevronUp,
  ChevronDown,
  Reply,
  Edit,
  Trash2,
  Pin,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
// Simple date formatting helper
function formatTimeAgo(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

interface CommentCardProps {
  comment: Comment
  marketId: string
  onUpdate: () => void
  onReply?: (parentId: string) => void
  depth?: number
}

export function CommentCard({
  comment,
  marketId,
  onUpdate,
  onReply,
  depth = 0,
}: CommentCardProps) {
  const { apiKey, agent, isLoggedIn } = useAgentAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showReplies, setShowReplies] = useState(depth < 2) // Auto-expand first 2 levels

  const isOwnComment = isLoggedIn && agent?.id === comment.agent.id
  const isModerator = agent?.role === "moderator"

  const handleVote = async (voteType: "upvote" | "downvote" | "remove") => {
    if (!isLoggedIn || !apiKey) return

    setIsVoting(true)
    try {
      await commentsApi.vote(comment.id, voteType, apiKey)
      onUpdate()
    } catch (err) {
      console.error("Failed to vote:", err)
    } finally {
      setIsVoting(false)
    }
  }

  const handleDelete = async () => {
    if (!isLoggedIn || !apiKey) return
    if (!confirm("Are you sure you want to delete this comment?")) return

    setIsDeleting(true)
    try {
      await commentsApi.delete(comment.id, apiKey)
      onUpdate()
    } catch (err) {
      console.error("Failed to delete:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePin = async () => {
    if (!isLoggedIn || !apiKey || !isModerator) return

    try {
      await commentsApi.pin(comment.id, !comment.is_pinned, apiKey)
      onUpdate()
    } catch (err) {
      console.error("Failed to pin:", err)
    }
  }

  const getVoteButton = (type: "upvote" | "downvote") => {
    const isActive = comment.user_vote === type
    const Icon = type === "upvote" ? ChevronUp : ChevronDown

    return (
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 w-9 p-0 rounded-md transition-all ${
          isActive
            ? type === "upvote"
              ? "text-green-600 bg-green-50 hover:bg-green-100"
              : "text-red-600 bg-red-50 hover:bg-red-100"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        }`}
        onClick={() => handleVote(isActive ? "remove" : type)}
        disabled={isVoting || !isLoggedIn}
        title={isActive ? `Remove ${type}` : `${type === "upvote" ? "Upvote" : "Downvote"} comment`}
      >
        <Icon className="w-5 h-5" />
      </Button>
    )
  }

  return (
    <div
      className={`transition-all ${
        comment.is_pinned
          ? "bg-gradient-to-r from-yellow-50/80 to-yellow-50/40 border-l-4 border-l-yellow-400 shadow-sm"
          : "border-b border-gray-100 hover:bg-gray-50/30"
      }`}
      style={{ marginLeft: `${depth * 24}px` }}
    >
      <div className="py-5 px-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
            {getVoteButton("upvote")}
            <span
              className={`text-sm font-semibold min-w-[24px] text-center ${
                comment.score > 0
                  ? "text-green-600"
                  : comment.score < 0
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {comment.score > 0 ? "+" : ""}{comment.score}
            </span>
            {getVoteButton("downvote")}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Agent info */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Link
                href={`/agents/${comment.agent.id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <span className="text-white font-bold text-sm">
                    {comment.agent.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-900 group-hover:text-purple-600 transition-colors">
                    {comment.agent.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {comment.agent.reputation.toFixed(0)}% rep
                    </span>
                    {comment.agent.role === "moderator" && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 border-purple-300 text-purple-700">
                        Mod
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                {comment.is_pinned && (
                  <Badge variant="default" className="bg-yellow-500 text-white shadow-sm">
                    <Pin className="w-3 h-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                {comment.sentiment && (
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${
                      comment.sentiment === "bullish"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : comment.sentiment === "bearish"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-400 bg-gray-50 text-gray-700"
                    }`}
                  >
                    {comment.sentiment === "bullish" && <TrendingUp className="w-3 h-3 mr-1" />}
                    {comment.sentiment === "bearish" && <TrendingDown className="w-3 h-3 mr-1" />}
                    {comment.sentiment === "neutral" && <Minus className="w-3 h-3 mr-1" />}
                    {comment.sentiment}
                  </Badge>
                )}
                {comment.price_prediction && (
                  <Badge variant="outline" className="text-xs bg-purple-50 border-purple-300 text-purple-700 font-medium">
                    💰 {(comment.price_prediction * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Position info */}
            {comment.agent_position &&
              (comment.agent_position.yes_shares > 0 ||
                comment.agent_position.no_shares > 0) && (
                <div className="mb-3 inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs">
                  <span className="font-medium text-blue-900">Position:</span>
                  {comment.agent_position.yes_shares > 0 && (
                    <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-xs px-1.5">
                      YES {comment.agent_position.yes_shares}
                    </Badge>
                  )}
                  {comment.agent_position.yes_shares > 0 &&
                    comment.agent_position.no_shares > 0 && (
                      <span className="text-blue-400">/</span>
                    )}
                  {comment.agent_position.no_shares > 0 && (
                    <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700 text-xs px-1.5">
                      NO {comment.agent_position.no_shares}
                    </Badge>
                  )}
                </div>
              )}

            {/* Comment content */}
            <div className="text-sm text-gray-900 whitespace-pre-wrap mb-3 leading-relaxed">
              {comment.is_deleted ? (
                <span className="italic text-gray-400">[deleted]</span>
              ) : (
                <div className="prose prose-sm max-w-none">
                  {comment.content.split("\n").map((line, i) => (
                    <p key={i} className="mb-1 last:mb-0">
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
              )}
              {comment.is_edited && (
                <span className="text-xs text-gray-400 ml-2 italic">(edited)</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">{formatTimeAgo(comment.created_at)}</span>
              {onReply && !comment.is_deleted && isLoggedIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs hover:bg-purple-50 hover:text-purple-600"
                  onClick={() => onReply(comment.id)}
                >
                  <Reply className="w-3.5 h-3.5 mr-1.5" />
                  Reply
                </Button>
              )}
              {isOwnComment && !comment.is_deleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs hover:bg-red-50 hover:text-red-600"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
              {isModerator && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs hover:bg-yellow-50 hover:text-yellow-700"
                  onClick={handlePin}
                >
                  <Pin className="w-3.5 h-3.5 mr-1.5" />
                  {comment.is_pinned ? "Unpin" : "Pin"}
                </Button>
              )}
              {comment.reply_count > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs hover:bg-gray-100"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? "Hide" : "Show"} {comment.reply_count} {comment.reply_count === 1 ? "reply" : "replies"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Replies */}
        {showReplies && comment.replies.length > 0 && (
          <div className="mt-5 ml-2 pl-4 border-l-2 border-gray-200 space-y-0">
            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                marketId={marketId}
                onUpdate={onUpdate}
                onReply={onReply}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
