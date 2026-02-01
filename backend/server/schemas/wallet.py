from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from server.models.wallet import TransactionStatus, TransactionType


class WalletResponse(BaseModel):
    """Wallet details response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    internal_address: str
    external_address: str | None = None
    chain_id: int | None = None
    created_at: datetime
    updated_at: datetime


class WalletWithBalance(WalletResponse):
    """Wallet with current balance info."""

    balance: Decimal
    locked_balance: Decimal
    available_balance: Decimal

    @field_serializer("balance", "locked_balance", "available_balance")
    def serialize_decimal(self, value: Decimal) -> float:
        """Serialize Decimal fields as float for JSON."""
        return float(value)


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
    market_id: UUID | None = None
    trade_id: UUID | None = None
    order_id: UUID | None = None
    counterparty_id: UUID | None = None
    description: str | None = None
    created_at: datetime

    @field_serializer("amount", "balance_after")
    def serialize_decimal(self, value: Decimal) -> float:
        """Serialize Decimal fields as float for JSON."""
        return float(value)


class TransactionWithDetails(TransactionResponse):
    """Transaction with additional details for display."""

    market_question: str | None = None
    counterparty_name: str | None = None


class TransferRequest(BaseModel):
    """Request to transfer tokens to another agent."""

    to_address: str = Field(..., description="Recipient wallet address (molt:agent:xxxx)")
    amount: Decimal = Field(..., gt=0, description="Amount to transfer")
    description: str | None = Field(default=None, max_length=200)


class TransferResponse(BaseModel):
    """Response from a transfer."""

    transaction_id: UUID
    from_address: str
    to_address: str
    amount: Decimal
    new_balance: Decimal

    @field_serializer("amount", "new_balance")
    def serialize_decimal(self, value: Decimal) -> float:
        """Serialize Decimal fields as float for JSON."""
        return float(value)


class FaucetRequest(BaseModel):
    """Request tokens from faucet (testing only)."""

    amount: Decimal = Field(default=Decimal("100.00"), gt=0, le=1000)


class FaucetResponse(BaseModel):
    """Response from faucet."""

    transaction_id: UUID
    amount: Decimal
    new_balance: Decimal

    @field_serializer("amount", "new_balance")
    def serialize_decimal(self, value: Decimal) -> float:
        """Serialize Decimal fields as float for JSON."""
        return float(value)


class WalletStats(BaseModel):
    """Wallet statistics."""

    total_deposited: Decimal
    total_withdrawn: Decimal
    total_traded: Decimal
    total_won: Decimal
    total_lost: Decimal
    total_fees_paid: Decimal
    transaction_count: int

    @field_serializer(
        "total_deposited",
        "total_withdrawn",
        "total_traded",
        "total_won",
        "total_lost",
        "total_fees_paid",
    )
    def serialize_decimal(self, value: Decimal) -> float:
        """Serialize Decimal fields as float for JSON."""
        return float(value)
