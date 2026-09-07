"""WebSocket Authentication and Security for VoxVerity AI Service.

Provides origin validation, per-IP rate limiting, and TTL-based cleanup
for WebSocket connections. FastAPI's CORS middleware only covers HTTP;
WebSocket upgrades bypass it, so we validate manually.
"""

import re
import time
import hmac
import hashlib
import base64
import json
import logging
from typing import Dict, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Origin validation
# ---------------------------------------------------------------------------

_DEFAULT_ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
}


class OriginValidator:
    """Check the Origin header of a WebSocket upgrade against an allowlist."""

    def __init__(self, allowed: Optional[Set[str]] = None):
        self.allowed = allowed or _DEFAULT_ALLOWED_ORIGINS

    def is_allowed(self, origin: Optional[str]) -> bool:
        if origin is None:
            # Non-browser clients (e.g. curl, server-to-server) don't send
            # Origin.  Allow them — the API key is the real credential there.
            return True
        return origin in self.allowed


# ---------------------------------------------------------------------------
# Per-IP WebSocket connection rate limiter
# ---------------------------------------------------------------------------

class WsConnectionLimiter:
    """Track active WebSocket connections per IP and enforce a ceiling."""

    def __init__(self, max_per_ip: int = 5):
        self.max_per_ip = max_per_ip
        self._counts: Dict[str, int] = {}

    def try_acquire(self, client_ip: str) -> bool:
        count = self._counts.get(client_ip, 0)
        if count >= self.max_per_ip:
            return False
        self._counts[client_ip] = count + 1
        return True

    def release(self, client_ip: str):
        count = self._counts.get(client_ip, 0)
        if count <= 1:
            self._counts.pop(client_ip, None)
        else:
            self._counts[client_ip] = count - 1


# ---------------------------------------------------------------------------
# TTL-based cleanup helpers
# ---------------------------------------------------------------------------

class TTLTracker:
    """Generic timestamp tracker for rooms/sessions with expiry."""

    def __init__(self, ttl_seconds: int = 600):
        self.ttl = ttl_seconds
        self._stamps: Dict[str, float] = {}

    def touch(self, key: str):
        self._stamps[key] = time.time()

    def is_expired(self, key: str) -> bool:
        ts = self._stamps.get(key)
        if ts is None:
            return True
        return (time.time() - ts) > self.ttl

    def remove(self, key: str):
        self._stamps.pop(key, None)

    def sweep(self, known_keys: Set[str]) -> list[str]:
        """Return keys that are in *known_keys* but have expired."""
        now = time.time()
        expired = [k for k in known_keys if k in self._stamps and (now - self._stamps[k]) > self.ttl]
        for k in expired:
            self._stamps.pop(k, None)
        return expired


# ---------------------------------------------------------------------------
# UUID validation (session / room IDs)
# ---------------------------------------------------------------------------

_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
)


def is_valid_uuid(value: str) -> bool:
    return bool(_UUID_RE.match(value))


# ---------------------------------------------------------------------------
# JWT (HMAC-SHA256) verification — lightweight, no external dependencies
# ---------------------------------------------------------------------------

def _b64url_decode(data: str) -> bytes:
    """Base64url decode with padding."""
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded)


def verify_ws_token(token: str, secret: str) -> Optional[dict]:
    """Verify a HS256 JWT and return the payload, or None on failure.

    This is a minimal verification — no audience/issuer checks —
    sufficient for short-lived (60 s) WebSocket session tokens.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        signing_input = f"{parts[0]}.{parts[1]}".encode()
        signature = _b64url_decode(parts[2])
        expected = hmac.new(
            secret.encode(), signing_input, hashlib.sha256
        ).digest()

        if not hmac.compare_digest(signature, expected):
            return None

        payload = json.loads(_b64url_decode(parts[1]))

        # Check expiry
        exp = payload.get("exp")
        if exp is not None and time.time() > exp:
            return None

        return payload
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Convenience: validate a WS connection at accept time
# ---------------------------------------------------------------------------

def validate_ws_connection(
    websocket: WebSocket,
    origin_validator: OriginValidator,
    connection_limiter: WsConnectionLimiter,
    *,
    require_api_key: bool = False,
    api_key: Optional[str] = None,
) -> Optional[str]:
    """Validate a WebSocket connection before accept.

    Returns an error message if the connection should be rejected, or None if OK.

    Checks performed:
    1. Origin header (if present must be in allowlist).
    2. Per-IP connection count.
    3. Optional API key check via query param ``api_key``.

    Note: ``await websocket.accept()`` is NOT called here — the caller owns
    that because we may need to send a close frame first.
    """
    # 1. Origin
    origin = websocket.headers.get("origin")
    if not origin_validator.is_allowed(origin):
        logger.warning(f"Rejected WebSocket from disallowed origin: {origin}")
        return "Origin not allowed"

    # 2. Per-IP rate limit
    client_ip = websocket.client.host if websocket.client else "unknown"
    if not connection_limiter.try_acquire(client_ip):
        logger.warning(f"Rejected WebSocket — rate limit for {client_ip}")
        return "Too many connections from this address"

    # 3. Optional API key (query param)
    if require_api_key and api_key:
        supplied = websocket.query_params.get("api_key")
        if supplied != api_key:
            connection_limiter.release(client_ip)
            logger.warning(f"Rejected WebSocket — invalid API key from {client_ip}")
            return "Invalid API key"

    return None


# ---------------------------------------------------------------------------
# Module-level singletons (configured from main.py)
# ---------------------------------------------------------------------------

_origin_validator = OriginValidator()
_connection_limiter = WsConnectionLimiter()
_room_ttl = TTLTracker(ttl_seconds=600)   # 10 min
_session_ttl = TTLTracker(ttl_seconds=300)  # 5 min


def get_origin_validator() -> OriginValidator:
    return _origin_validator


def get_connection_limiter() -> WsConnectionLimiter:
    return _connection_limiter


def get_room_ttl() -> TTLTracker:
    return _room_ttl


def get_session_ttl() -> TTLTracker:
    return _session_ttl


_token_secret: str = "dev-ws-token-secret"


def get_token_secret() -> str:
    return _token_secret


def configure_ws_security(
    allowed_origins: Optional[Set[str]] = None,
    max_connections_per_ip: int = 5,
    room_ttl_seconds: int = 600,
    session_ttl_seconds: int = 300,
    token_secret: str = "dev-ws-token-secret",
):
    """Reconfigure singletons from app settings."""
    global _origin_validator, _connection_limiter, _room_ttl, _session_ttl, _token_secret
    if allowed_origins is not None:
        _origin_validator = OriginValidator(allowed_origins)
    _connection_limiter = WsConnectionLimiter(max_connections_per_ip)
    _room_ttl = TTLTracker(room_ttl_seconds)
    _session_ttl = TTLTracker(session_ttl_seconds)
    _token_secret = token_secret
