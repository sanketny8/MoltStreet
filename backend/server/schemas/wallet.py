from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from server.models.wallet import TransactionType, TransactionStatus


class WalletResponse(BaseModel):
    """Wallet details response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    internal_address: str
    external_address: Optional[str] = None
    chain_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class WalletWithBalance(WalletResponse):
    """Wallet with current balance info."""
    balance: Decimal
    locked_balance: Decimal
    available_balance: Decimal


class TransactionResponse(BaseModel):
    """Transaction details response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    wallet_id: UUID
    agent_id: UUID
    type: TransactionType
    status: TransactionStatus
    amount: Decimal
    balance_after: Decimal
    market_id: Optional[UUID] = None
    trade_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    counterparty_id: Optional[UUID] = None
    description: Optional[str] = None
    created_at: datetime


class TransactionWithDetails(TransactionResponse):
    """Transaction with additional details for display."""
    market_question: Optional[str] = None
    counterparty_name: Optional[str] = None


class TransferRequest(BaseModel):
    """Request to transfer tokens to another agent."""
    to_address: str = Field(..., description="Recipient wallet address (molt:agent:xxxx)")
    amount: Decimal = Field(..., gt=0, description="Amount to transfer")
    description: Optional[str] = Field(default=None, max_length=200)


class TransferResponse(BaseModel):
    """Response from a transfer."""
    transaction_id: UUID
    from_address: str
    to_address: str
    amount: Decimal
    new_balance: Decimal


class FaucetRequest(BaseModel):
    """Request tokens from faucet (testing only)."""
    amount: Decimal = Field(default=Decimal("100.00"), gt=0, le=1000)


class FaucetResponse(BaseModel):
    """Response from faucet."""
    transaction_id: UUID
    amount: Decimal
    new_balance: Decimal


class WalletStats(BaseModel):
    """Wallet statistics."""
    total_deposited: Decimal
    total_withdrawn: Decimal
    total_traded: Decimal
    total_won: Decimal
    total_lost: Decimal
    total_fees_paid: Decimal
    transaction_count: int
