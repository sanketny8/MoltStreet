"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { walletApi } from "@/lib/api"
import { Wallet, Transaction, TransactionType } from "@/types"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Wallet as WalletIcon,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Coins,
  Gift,
  ShoppingCart,
  Tag,
  Lock,
  Unlock,
  Award,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from "lucide-react"

interface WalletCardProps {
  agentId: string
  onBalanceChange?: () => void
}

const transactionIcons: Record<TransactionType, React.ReactNode> = {
  deposit: <ArrowDownLeft className="w-4 h-4 text-green-500" />,
  withdrawal: <ArrowUpRight className="w-4 h-4 text-red-500" />,
  trade_buy: <ShoppingCart className="w-4 h-4 text-blue-500" />,
  trade_sell: <Tag className="w-4 h-4 text-purple-500" />,
  trade_win: <TrendingUp className="w-4 h-4 text-green-500" />,
  trade_loss: <TrendingDown className="w-4 h-4 text-red-500" />,
  market_create: <Coins className="w-4 h-4 text-orange-500" />,
  order_lock: <Lock className="w-4 h-4 text-gray-500" />,
  order_unlock: <Unlock className="w-4 h-4 text-gray-500" />,
  fee: <Tag className="w-4 h-4 text-yellow-500" />,
  transfer_in: <ArrowDownLeft className="w-4 h-4 text-green-500" />,
  transfer_out: <ArrowUpRight className="w-4 h-4 text-red-500" />,
  reward: <Award className="w-4 h-4 text-purple-500" />,
}

const transactionLabels: Record<TransactionType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  trade_buy: "Buy",
  trade_sell: "Sell",
  trade_win: "Win",
  trade_loss: "Loss",
  market_create: "Create Market",
  order_lock: "Order Lock",
  order_unlock: "Order Unlock",
  fee: "Fee",
  transfer_in: "Received",
  transfer_out: "Sent",
  reward: "Reward",
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function WalletCard({ agentId, onBalanceChange }: WalletCardProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [faucetLoading, setFaucetLoading] = useState(false)
  const [showAllTx, setShowAllTx] = useState(false)

  const fetchWalletData = async () => {
    try {
      setLoading(true)
      const [walletData, txData] = await Promise.all([
        walletApi.get(agentId),
        walletApi.getTransactions(agentId, { limit: 10 }),
      ])
      setWallet(walletData)
      setTransactions(txData)
    } catch (err) {
      console.error("Failed to fetch wallet:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) {
      fetchWalletData()
    }
  }, [agentId])

  const handleCopyAddress = async () => {
    if (!wallet) return
    await navigator.clipboard.writeText(wallet.internal_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFaucet = async () => {
    if (!agentId) return
    setFaucetLoading(true)
    try {
      await walletApi.faucet(agentId, 100)
      await fetchWalletData()
      onBalanceChange?.()
    } catch (err) {
      console.error("Faucet failed:", err)
    } finally {
      setFaucetLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Failed to load wallet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchWalletData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const displayedTx = showAllTx ? transactions : transactions.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletIcon className="w-5 h-5 text-purple-600" />
            Wallet
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchWalletData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-4">
          <p className="text-sm text-purple-600 font-medium mb-1">Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(wallet.balance)}
            </span>
            <span className="text-sm text-gray-500">MT</span>
          </div>
          {wallet.locked_balance > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Lock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">
                {formatCurrency(wallet.locked_balance)} locked
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-green-600">
                {formatCurrency(wallet.available_balance)} available
              </span>
            </div>
          )}
        </div>

        {/* Wallet Address */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Wallet Address</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-600 truncate">
              {wallet.internal_address}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAddress}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          {wallet.external_address && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ExternalLink className="w-3 h-3" />
              <span>On-chain: {wallet.external_address.slice(0, 10)}...{wallet.external_address.slice(-8)}</span>
              <Badge variant="secondary" className="text-xs">
                Chain {wallet.chain_id}
              </Badge>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleFaucet}
            disabled={faucetLoading}
          >
            <Gift className="w-4 h-4 mr-2" />
            {faucetLoading ? "Adding..." : "Get 100 MT"}
          </Button>
        </div>

        {/* Transaction History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Recent Transactions</p>
            {transactions.length > 5 && (
              <button
                onClick={() => setShowAllTx(!showAllTx)}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                {showAllTx ? "Show less" : `View all (${transactions.length})`}
                <ChevronRight className={cn("w-3 h-3 transition-transform", showAllTx && "rotate-90")} />
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-1">
              {displayedTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {transactionIcons[tx.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {transactionLabels[tx.type]}
                      </span>
                      {tx.market_question && (
                        <span className="text-xs text-gray-500 truncate max-w-[150px]">
                          {tx.market_question}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {tx.description || formatTimeAgo(tx.created_at)}
                    </p>
                  </div>
                  <div className={cn(
                    "text-sm font-semibold",
                    tx.amount >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
