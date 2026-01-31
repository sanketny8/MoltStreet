from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4
import hashlib

from sqlmodel import SQLModel, Field


class TransactionType(str, Enum):
    """Type of wallet transaction."""
    DEPOSIT = "deposit"           # Initial deposit or faucet
    WITHDRAWAL = "withdrawal"     # Future: withdraw to external
    TRADE_BUY = "trade_buy"       # Bought shares
    TRADE_SELL = "trade_sell"     # Sold shares
    TRADE_WIN = "trade_win"       # Won from market resolution
    TRADE_LOSS = "trade_loss"     # Lost from market resolution
    MARKET_CREATE = "market_create"  # Fee for creating market
    ORDER_LOCK = "order_lock"     # Funds locked for order
    ORDER_UNLOCK = "order_unlock" # Funds unlocked from cancelled order
    FEE = "fee"                   # Trading fee
    TRANSFER_IN = "transfer_in"   # Received from another agent
    TRANSFER_OUT = "transfer_out" # Sent to another agent
    REWARD = "reward"             # Moderator reward


class TransactionStatus(str, Enum):
    """Status of a transaction."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentWallet(SQLModel, table=True):
    """Wallet for an agent with internal address."""

    __tablename__ = "agent_wallets"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    agent_id: UUID = Field(foreign_key="agents.id", unique=True, index=True)

    # Internal address (molt:agent:<short_hash>)
    internal_address: str = Field(unique=True, index=True, max_length=50)

    # Future: External blockchain address
    external_address: Optional[str] = Field(default=None, max_length=100)
    chain_id: Optional[int] = Field(default=None)  # e.g., 8453 for Base

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def generate_internal_address(agent_id: UUID) -> str:
        """Generate a deterministic internal address from agent ID."""
        # Create a short hash from agent_id for human-readable address
        hash_input = str(agent_id).encode()
        short_hash = hashlib.sha256(hash_input).hexdigest()[:12]
        return f"molt:agent:{short_hash}"


class Transaction(SQLModel, table=True):
    """Record of a wallet transaction."""

    __tablename__ = "transactions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    wallet_id: UUID = Field(foreign_key="agent_wallets.id", index=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)

    # Transaction details
    type: TransactionType = Field(index=True)
    status: TransactionStatus = Field(default=TransactionStatus.COMPLETED)
    amount: Decimal = Field(default=Decimal("0.00"))  # Positive for credit, negative for debit
    balance_after: Decimal = Field(default=Decimal("0.00"))  # Balance after this tx

    # Reference to related entities
    market_id: Optional[UUID] = Field(default=None, foreign_key="markets.id")
    trade_id: Optional[UUID] = Field(default=None, foreign_key="trades.id")
    order_id: Optional[UUID] = Field(default=None, foreign_key="orders.id")
    counterparty_id: Optional[UUID] = Field(default=None, foreign_key="agents.id")  # For transfers

    # Metadata
    description: Optional[str] = Field(default=None, max_length=500)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
