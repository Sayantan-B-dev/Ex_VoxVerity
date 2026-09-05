"""Rate Limiting for VoxVerity API.

Simple in-memory rate limiter to prevent abuse.
For production, use Redis-backed rate limiting.
"""

import time
import logging
from typing import Dict, Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = logging.getLogger(__name__)

# Default rate limits (requests per window)
DEFAULT_RATE_LIMIT = 100  # requests
DEFAULT_WINDOW_SECONDS = 60  # 1 minute

# Per-endpoint limits
ENDPOINT_LIMITS = {
    "/v1/analyze/file": {"limit": 20, "window": 60},
    "/v1/risk/evaluate": {"limit": 30, "window": 60},
    "/v1/speaker/enroll": {"limit": 5, "window": 300},
    "/v1/speaker/verify": {"limit": 10, "window": 60},
    "/v1/sessions": {"limit": 10, "window": 60},
}


class RateLimitStore:
    """In-memory rate limit store."""

    def __init__(self):
        self._requests: Dict[str, list] = {}

    def check_rate_limit(
        self,
        key: str,
        limit: int = DEFAULT_RATE_LIMIT,
        window: int = DEFAULT_WINDOW_SECONDS,
    ) -> bool:
        """Check if request is within rate limit.

        Returns:
            True if allowed, False if rate limited.
        """
        now = time.time()
        cutoff = now - window

        # Clean old entries
        if key in self._requests:
            self._requests[key] = [t for t in self._requests[key] if t > cutoff]
        else:
            self._requests[key] = []

        # Check limit
        if len(self._requests[key]) >= limit:
            return False

        # Record request
        self._requests[key].append(now)
        return True

    def get_remaining(self, key: str, limit: int, window: int) -> int:
        """Get remaining requests in window."""
        now = time.time()
        cutoff = now - window

        if key not in self._requests:
            return limit

        recent = [t for t in self._requests[key] if t > cutoff]
        return max(0, limit - len(recent))


# Global store
_store = RateLimitStore()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware for FastAPI."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ("/health", "/ready", "/version"):
            return await call_next(request)

        # Get client identifier
        client_id = request.client.host if request.client else "unknown"

        # Get endpoint-specific limits
        path = request.url.path
        endpoint_config = ENDPOINT_LIMITS.get(path, {})
        limit = endpoint_config.get("limit", DEFAULT_RATE_LIMIT)
        window = endpoint_config.get("window", DEFAULT_WINDOW_SECONDS)

        # Check rate limit
        key = f"{client_id}:{path}"
        if not _store.check_rate_limit(key, limit, window):
            remaining = _store.get_remaining(key, limit, window)
            logger.warning(f"Rate limit exceeded for {client_id} on {path}")

            return Response(
                content='{"error": "Rate limit exceeded. Try again later."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + window)),
                    "Retry-After": str(window),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        remaining = _store.get_remaining(key, limit, window)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response
