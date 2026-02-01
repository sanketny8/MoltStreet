"""API Key generation and validation utilities."""

import hashlib
import secrets

# API key prefix for easy identification
API_KEY_PREFIX = "mst_"
API_KEY_LENGTH = 32  # 32 bytes = 64 hex chars


def generate_api_key() -> tuple[str, str]:
    """
    Generate a new API key and its hash.

    Returns:
        Tuple of (plain_api_key, api_key_hash)
        The plain key is shown once to the user, only the hash is stored.
    """
    # Generate random bytes
    random_bytes = secrets.token_hex(API_KEY_LENGTH)

    # Create the full API key with prefix
    api_key = f"{API_KEY_PREFIX}{random_bytes}"

    # Hash the key for storage
    api_key_hash = hash_api_key(api_key)

    return api_key, api_key_hash


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for secure storage.

    Args:
        api_key: The plain text API key

    Returns:
        SHA-256 hash of the API key
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def validate_api_key_format(api_key: str) -> bool:
    """
    Validate that an API key has the correct format.

    Args:
        api_key: The API key to validate

    Returns:
        True if format is valid, False otherwise
    """
    if not api_key:
        return False

    if not api_key.startswith(API_KEY_PREFIX):
        return False

    # Check length: prefix + 64 hex chars
    expected_length = len(API_KEY_PREFIX) + (API_KEY_LENGTH * 2)
    if len(api_key) != expected_length:
        return False

    # Check that the rest is valid hex
    try:
        int(api_key[len(API_KEY_PREFIX) :], 16)
        return True
    except ValueError:
        return False


def generate_claim_token() -> str:
    """
    Generate a unique claim token for agent verification.

    Returns:
        A URL-safe token string
    """
    return secrets.token_urlsafe(24)
