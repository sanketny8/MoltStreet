from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.models.agent import Agent
from server.models.market import Market
from server.models.wallet import AgentWallet, Transaction, TransactionType
from server.schemas.wallet import (
    FaucetRequest,
    FaucetResponse,
    TransactionWithDetails,
    TransferRequest,
    TransferResponse,
    WalletResponse,
    WalletStats,
    WalletWithBalance,
)

router = APIRouter(prefix="/wallet", tags=["wallet"])


async def get_or_create_wallet(agent_id: UUID, session: AsyncSession) -> AgentWallet:
    """Get existing wallet or create one for the agent."""
    result = await session.execute(select(AgentWallet).where(AgentWallet.agent_id == agent_id))
    wallet = result.scalar_one_or_none()

    if not wallet:
        # Create new wallet
        wallet = AgentWallet(
            agent_id=agent_id, internal_address=AgentWallet.generate_internal_address(agent_id)
        )
        session.add(wallet)
        try:
            await session.commit()
            await session.refresh(wallet)
        except IntegrityError:
            # If commit fails (e.g., duplicate key due to race condition),
            # rollback and fetch the existing wallet
            await session.rollback()
            result = await session.execute(
                select(AgentWallet).where(AgentWallet.agent_id == agent_id)
            )
            wallet = result.scalar_one_or_none()
            if not wallet:
                raise  # Re-raise if still not found

    return wallet


@router.get("/{agent_id}", response_model=WalletWithBalance)
async def get_wallet(agent_id: UUID, session: AsyncSession = Depends(get_session)):
    """Get wallet details for an agent."""
    # Verify agent exists
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    wallet = await get_or_create_wallet(agent_id, session)

    return WalletWithBalance(
        id=wallet.id,
        agent_id=wallet.agent_id,
        internal_address=wallet.internal_address,
        external_address=wallet.external_address,
        chain_id=wallet.chain_id,
        created_at=wallet.created_at,
        updated_at=wallet.updated_at,
        balance=agent.balance,
        locked_balance=agent.locked_balance,
        available_balance=agent.available_balance,
    )


@router.get("/{agent_id}/transactions", response_model=list[TransactionWithDetails])
async def get_transactions(
    agent_id: UUID,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    type: TransactionType | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    """Get transaction history for an agent's wallet."""
    # Verify agent exists
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    wallet = await get_or_create_wallet(agent_id, session)

    # Query transactions
    query = select(Transaction).where(Transaction.wallet_id == wallet.id)

    if type:
        query = query.where(Transaction.type == type)

    query = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    transactions = result.scalars().all()

    # Enrich with market questions and counterparty names
    enriched = []
    for tx in transactions:
        tx_dict = TransactionWithDetails(
            id=tx.id,
            wallet_id=tx.wallet_id,
            agent_id=tx.agent_id,
            type=tx.type,
            status=tx.status,
            amount=tx.amount,
            balance_after=tx.balance_after,
            market_id=tx.market_id,
            trade_id=tx.trade_id,
            order_id=tx.order_id,
            counterparty_id=tx.counterparty_id,
            description=tx.description,
            created_at=tx.created_at,
        )

        # Fetch market question if present
        if tx.market_id:
            market_result = await session.execute(select(Market).where(Market.id == tx.market_id))
            market = market_result.scalar_one_or_none()
            if market:
                tx_dict.market_question = market.question[:100]

        # Fetch counterparty name if present
        if tx.counterparty_id:
            cp_result = await session.execute(select(Agent).where(Agent.id == tx.counterparty_id))
            cp = cp_result.scalar_one_or_none()
            if cp:
                tx_dict.counterparty_name = cp.name

        enriched.append(tx_dict)

    return enriched


@router.get("/{agent_id}/stats", response_model=WalletStats)
async def get_wallet_stats(agent_id: UUID, session: AsyncSession = Depends(get_session)):
    """Get wallet statistics for an agent."""
    # Verify agent exists
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    wallet = await get_or_create_wallet(agent_id, session)

    # Get all transactions for stats
    result = await session.execute(select(Transaction).where(Transaction.wallet_id == wallet.id))
    transactions = result.scalars().all()

    # Calculate stats
    stats = WalletStats(
        total_deposited=Decimal("0"),
        total_withdrawn=Decimal("0"),
        total_traded=Decimal("0"),
        total_won=Decimal("0"),
        total_lost=Decimal("0"),
        total_fees_paid=Decimal("0"),
        transaction_count=len(transactions),
    )

    for tx in transactions:
        if tx.type == TransactionType.DEPOSIT:
            stats.total_deposited += tx.amount
        elif tx.type == TransactionType.WITHDRAWAL:
            stats.total_withdrawn += abs(tx.amount)
        elif tx.type in (TransactionType.TRADE_BUY, TransactionType.TRADE_SELL):
            stats.total_traded += abs(tx.amount)
        elif tx.type == TransactionType.TRADE_WIN:
            stats.total_won += tx.amount
        elif tx.type == TransactionType.TRADE_LOSS:
            stats.total_lost += abs(tx.amount)
        elif tx.type == TransactionType.FEE:
            stats.total_fees_paid += abs(tx.amount)

    return stats


@router.post("/{agent_id}/transfer", response_model=TransferResponse)
async def transfer_tokens(
    agent_id: UUID, request: TransferRequest, session: AsyncSession = Depends(get_session)
):
    """Transfer tokens to another agent by wallet address."""
    # Verify sender agent exists
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    sender = result.scalar_one_or_none()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender agent not found")

    # Check balance
    if sender.available_balance < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Find recipient wallet by address
    result = await session.execute(
        select(AgentWallet).where(AgentWallet.internal_address == request.to_address)
    )
    recipient_wallet = result.scalar_one_or_none()
    if not recipient_wallet:
        raise HTTPException(status_code=404, detail="Recipient wallet not found")

    # Get recipient agent
    result = await session.execute(select(Agent).where(Agent.id == recipient_wallet.agent_id))
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient agent not found")

    # Cannot transfer to self
    if sender.id == recipient.id:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")

    # Get sender wallet
    sender_wallet = await get_or_create_wallet(agent_id, session)

    # Execute transfer
    sender.balance -= request.amount
    recipient.balance += request.amount

    # Create transactions for both parties
    sender_tx = Transaction(
        wallet_id=sender_wallet.id,
        agent_id=sender.id,
        type=TransactionType.TRANSFER_OUT,
        amount=-request.amount,
        balance_after=sender.balance,
        counterparty_id=recipient.id,
        description=request.description or f"Transfer to {recipient.name}",
    )
    session.add(sender_tx)

    recipient_tx = Transaction(
        wallet_id=recipient_wallet.id,
        agent_id=recipient.id,
        type=TransactionType.TRANSFER_IN,
        amount=request.amount,
        balance_after=recipient.balance,
        counterparty_id=sender.id,
        description=request.description or f"Transfer from {sender.name}",
    )
    session.add(recipient_tx)

    await session.commit()

    return TransferResponse(
        transaction_id=sender_tx.id,
        from_address=sender_wallet.internal_address,
        to_address=recipient_wallet.internal_address,
        amount=request.amount,
        new_balance=sender.balance,
    )


@router.post("/{agent_id}/faucet", response_model=FaucetResponse)
async def request_faucet(
    agent_id: UUID,
    request: FaucetRequest = FaucetRequest(),
    session: AsyncSession = Depends(get_session),
):
    """Request tokens from faucet (for testing)."""
    # Verify agent exists
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    wallet = await get_or_create_wallet(agent_id, session)

    # Add tokens
    agent.balance += request.amount

    # Create transaction
    tx = Transaction(
        wallet_id=wallet.id,
        agent_id=agent.id,
        type=TransactionType.DEPOSIT,
        amount=request.amount,
        balance_after=agent.balance,
        description="Faucet deposit (testnet)",
    )
    session.add(tx)

    await session.commit()

    return FaucetResponse(
        transaction_id=tx.id,
        amount=request.amount,
        new_balance=agent.balance,
    )


@router.get("/lookup/{address}", response_model=WalletResponse)
async def lookup_wallet(address: str, session: AsyncSession = Depends(get_session)):
    """Lookup wallet by internal address."""
    result = await session.execute(
        select(AgentWallet).where(AgentWallet.internal_address == address)
    )
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    return wallet
