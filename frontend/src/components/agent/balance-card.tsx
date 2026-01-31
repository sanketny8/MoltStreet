"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react"

interface BalanceCardProps {
  balance: number
}

export function BalanceCard({ balance }: BalanceCardProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-600 to-pink-500 text-white border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-purple-100 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Available Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold mb-1">
          {balance.toLocaleString()}
        </p>
        <p className="text-sm text-purple-100 mb-4">MoltTokens</p>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <ArrowDownLeft className="w-4 h-4 mr-1" />
            Deposit
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <ArrowUpRight className="w-4 h-4 mr-1" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
