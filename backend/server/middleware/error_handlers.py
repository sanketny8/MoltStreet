"""
Global error handlers for the FastAPI application.
Handles all unhandled exceptions and provides consistent error responses.
"""

import logging
import traceback

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import DisconnectionError, IntegrityError, OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions (4xx, 5xx errors)."""
    logger.warning(
        f"HTTP {exc.status_code} error: {exc.detail}",
        extra={"path": request.url.path, "method": request.method},
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code, "path": request.url.path},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError | ValidationError
) -> JSONResponse:
    """Handle validation errors from Pydantic models."""
    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": " -> ".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(
        f"Validation error on {request.url.path}",
        extra={"errors": errors, "method": request.method},
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "status_code": 422,
            "details": errors,
            "path": request.url.path,
        },
    )


async def database_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle database-related exceptions."""
    error_type = type(exc).__name__

    if isinstance(exc, IntegrityError):
        logger.error(
            f"Database integrity error: {exc!s}",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "Database constraint violation",
                "status_code": 409,
                "message": "The operation conflicts with existing data",
                "path": request.url.path,
            },
        )

    elif isinstance(exc, OperationalError | DisconnectionError):
        logger.error(
            f"Database connection error: {exc!s}",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "Database unavailable",
                "status_code": 503,
                "message": "The database is temporarily unavailable. Please try again later.",
                "path": request.url.path,
            },
        )

    # Generic database error
    logger.error(
        f"Database error: {error_type} - {exc!s}",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Database error",
            "status_code": 500,
            "message": "A database error occurred",
            "path": request.url.path,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all other unhandled exceptions."""
    error_type = type(exc).__name__
    error_msg = str(exc)

    # Log the full traceback
    logger.error(
        f"Unhandled exception: {error_type}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error": error_msg,
            "traceback": traceback.format_exc(),
        },
    )

    # In development, include more details
    import os

    is_dev = os.getenv("ENVIRONMENT", "production") != "production"

    content = {
        "error": "Internal server error",
        "status_code": 500,
        "message": "An unexpected error occurred",
        "path": request.url.path,
    }

    if is_dev:
        content["debug"] = {"type": error_type, "message": error_msg}

    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=content)


def register_exception_handlers(app):
    """Register all exception handlers with the FastAPI app."""
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, validation_exception_handler)
    app.add_exception_handler(IntegrityError, database_exception_handler)
    app.add_exception_handler(OperationalError, database_exception_handler)
    app.add_exception_handler(DisconnectionError, database_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
