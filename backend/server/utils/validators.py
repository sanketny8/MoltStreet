"""
Input validation utilities.
"""

from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status


def validate_uuid(value: Any, field_name: str = "id") -> UUID:
    """Validate and convert a value to UUID."""
    if isinstance(value, UUID):
        return value

    try:
        return UUID(str(value))
    except (ValueError, AttributeError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid UUID format for {field_name}",
        ) from e


def validate_price(price: float, min_price: float = 0.01, max_price: float = 0.99) -> Decimal:
    """
    Validate price is within valid range.

    Args:
        price: Price value to validate
        min_price: Minimum allowed price
        max_price: Maximum allowed price

    Returns:
        Decimal: Validated price as Decimal

    Raises:
        HTTPException: If price is invalid
    """
    try:
        price_decimal = Decimal(str(price))
    except (InvalidOperation, ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid price format: {price}",
        ) from e

    if price_decimal < Decimal(str(min_price)) or price_decimal > Decimal(str(max_price)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Price must be between {min_price} and {max_price}",
        )

    return price_decimal


def validate_positive_integer(value: Any, field_name: str = "value", min_value: int = 1) -> int:
    """Validate value is a positive integer."""
    try:
        int_value = int(value)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be an integer",
        ) from e

    if int_value < min_value:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be at least {min_value}",
        )

    return int_value


def validate_string_length(
    value: str, field_name: str, min_length: int = 1, max_length: int = 255
) -> str:
    """Validate string length is within bounds."""
    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be a string",
        )

    if len(value) < min_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be at least {min_length} characters",
        )

    if len(value) > max_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be at most {max_length} characters",
        )

    return value.strip()


def sanitize_string(value: str | None, max_length: int = 1000) -> str | None:
    """
    Sanitize string input by removing dangerous characters and trimming.

    Args:
        value: String to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string or None
    """
    if value is None:
        return None

    # Strip whitespace
    value = value.strip()

    # Truncate if too long
    if len(value) > max_length:
        value = value[:max_length]

    # Remove null bytes
    value = value.replace("\x00", "")

    return value if value else None
