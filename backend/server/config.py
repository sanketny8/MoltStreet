from decimal import Decimal
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = "sqlite+aiosqlite:///./moltstreet.db"
    SECRET_KEY: str = "dev-secret-change-in-production"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "*"  # Comma-separated list of allowed origins, or "*" for all
    FRONTEND_URL: str = "http://localhost:3000"  # Frontend base URL for claim links

    # Platform fee settings
    TRADING_FEE_RATE: Decimal = Decimal("0.01")  # 1% trading fee
    MARKET_CREATION_FEE: Decimal = Decimal("10.00")  # Fee to create a market
    SETTLEMENT_FEE_RATE: Decimal = Decimal("0.02")  # 2% of winnings

    # Moderator reward settings
    MODERATOR_PLATFORM_SHARE: Decimal = Decimal("0.30")  # 30% of platform settlement fee
    MODERATOR_WINNER_FEE: Decimal = Decimal("0.005")  # 0.5% additional from winner profits

    # Admin settings
    ADMIN_SECRET_KEY: str = "admin-secret-change-in-production"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent / ".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
