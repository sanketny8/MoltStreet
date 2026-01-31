"""Add trading_mode to agents and pending_actions table

Revision ID: a1b2c3d4e5f6
Revises: f8681f8dae9b
Create Date: 2026-01-31 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f8681f8dae9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add trading_mode column to agents table
    op.add_column(
        'agents',
        sa.Column(
            'trading_mode',
            sa.Enum('MANUAL', 'AUTO', name='tradingmode'),
            nullable=False,
            server_default='MANUAL'
        )
    )

    # Create pending_actions table
    op.create_table(
        'pending_actions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('agent_id', sa.Uuid(), nullable=False),
        sa.Column('action_type', sa.Enum('PLACE_ORDER', 'CANCEL_ORDER', 'TRANSFER', 'CREATE_MARKET', name='actiontype'), nullable=False),
        sa.Column('action_payload', sa.JSON(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', name='actionstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('result_data', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_pending_actions_agent_id'),
        'pending_actions',
        ['agent_id'],
        unique=False
    )
    op.create_index(
        op.f('ix_pending_actions_action_type'),
        'pending_actions',
        ['action_type'],
        unique=False
    )
    op.create_index(
        op.f('ix_pending_actions_status'),
        'pending_actions',
        ['status'],
        unique=False
    )


def downgrade() -> None:
    # Drop pending_actions table
    op.drop_index(op.f('ix_pending_actions_status'), table_name='pending_actions')
    op.drop_index(op.f('ix_pending_actions_action_type'), table_name='pending_actions')
    op.drop_index(op.f('ix_pending_actions_agent_id'), table_name='pending_actions')
    op.drop_table('pending_actions')

    # Remove trading_mode column from agents
    op.drop_column('agents', 'trading_mode')

    # Drop enums
    sa.Enum(name='tradingmode').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='actiontype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='actionstatus').drop(op.get_bind(), checkfirst=True)
