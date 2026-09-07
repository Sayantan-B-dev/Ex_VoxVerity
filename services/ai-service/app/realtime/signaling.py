"""WebRTC Signaling Server for VoxVerity browser-to-browser calls.

Rooms hold exactly one caller + one receiver. Ringing/accepting happens in the
Next.js app (call_invites table + Supabase Realtime); this server relays the
WebRTC handshake (offer/answer/ICE) and call lifecycle (hangup / peer_left).

Security:
  - Origin header validated against configured allowlist on accept.
  - Per-IP connection count capped.
  - Room IDs must be valid UUIDs.
  - Stale rooms are swept automatically (TTL + cleanup loop).

Protocol:
  Client sends:
    - join:     {type: "join", role: "caller"|"receiver", peer_id, peer_name}
    - offer:    {type: "offer", sdp}
    - answer:   {type: "answer", sdp}
    - ice_candidate: {type: "ice_candidate", candidate}
    - hangup:   {type: "hangup"}
  Server sends:
    - joined:       {type: "joined", role, room_id, state}
    - peer_joined:  {type: "peer_joined", role, peer_id, peer_name}
    - call_started: {type: "call_started"}            (room complete)
    - offer / answer / ice_candidate (relayed)
    - hangup:       {type: "hangup"}                  (other side ended)
    - peer_left:    {type: "peer_left"}               (peer disconnected)
    - error:        {type: "error", message}
"""

import json
import time
import asyncio
import logging
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.ws_auth import (
    get_origin_validator,
    get_connection_limiter,
    get_room_ttl,
    get_token_secret,
    is_valid_uuid,
    verify_ws_token,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory room state
rooms: Dict[str, "Room"] = {}

# Background sweep handle
_sweep_task: Optional[asyncio.Task] = None


class Room:
    """A signaling room for a WebRTC peer connection (caller + receiver)."""

    def __init__(self, room_id: str):
        self.room_id = room_id
        self.caller: Optional[WebSocket] = None
        self.receiver: Optional[WebSocket] = None
        self.caller_id: Optional[str] = None
        self.caller_name: Optional[str] = None
        self.receiver_id: Optional[str] = None
        self.receiver_name: Optional[str] = None
        self.state = "IDLE"  # IDLE -> RINGING -> ACTIVE -> ENDED
        self.created_at = time.time()

    def add_peer(self, websocket: WebSocket, role: str, peer_id: str, peer_name: str = "") -> tuple[bool, str]:
        """Add a peer. Returns (ok, reason). A slot can only be taken once."""
        if role == "caller":
            if self.caller is not None and self.caller != websocket:
                return False, "Room already has a caller"
            self.caller = websocket
            self.caller_id = peer_id
            self.caller_name = peer_name
        elif role == "receiver":
            if self.receiver is not None and self.receiver != websocket:
                return False, "Room already has a receiver"
            self.receiver = websocket
            self.receiver_id = peer_id
            self.receiver_name = peer_name
        else:
            return False, "Invalid role"
        if self.caller is not None and self.receiver is not None:
            self.state = "ACTIVE"
        elif self.caller is not None:
            self.state = "RINGING"
        # Update TTL on activity
        get_room_ttl().touch(self.room_id)
        return True, ""

    def remove_peer(self, websocket: WebSocket) -> str:
        """Remove a peer; returns the role that left (or "")."""
        role = ""
        if self.caller == websocket:
            self.caller = None
            self.caller_id = None
            role = "caller"
        elif self.receiver == websocket:
            self.receiver = None
            self.receiver_id = None
            role = "receiver"
        if self.caller is None and self.receiver is None:
            self.state = "ENDED"
        return role

    def get_peer(self, websocket: WebSocket) -> Optional[WebSocket]:
        if self.caller == websocket:
            return self.receiver
        if self.receiver == websocket:
            return self.caller
        return None

    @property
    def is_complete(self) -> bool:
        return self.caller is not None and self.receiver is not None

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "state": self.state,
            "caller": {"id": self.caller_id, "name": self.caller_name} if self.caller_id else None,
            "receiver": {"id": self.receiver_id, "name": self.receiver_name} if self.receiver_id else None,
            "is_complete": self.is_complete,
        }


async def _sweep_stale_rooms():
    """Background task that removes expired rooms every 30 seconds."""
    while True:
        await asyncio.sleep(30)
        expired = get_room_ttl().sweep(set(rooms.keys()))
        for room_id in expired:
            room = rooms.pop(room_id, None)
            if room:
                # Notify any remaining peers
                remaining = room.caller or room.receiver
                if remaining:
                    try:
                        await _send(remaining, {"type": "error", "message": "Room expired due to inactivity"})
                    except Exception:
                        pass
                logger.info(f"Swept stale room {room_id}")


def _ensure_sweep_running():
    """Start the background sweep task if not already running."""
    global _sweep_task
    if _sweep_task is None or _sweep_task.done():
        try:
            loop = asyncio.get_running_loop()
            _sweep_task = loop.create_task(_sweep_stale_rooms())
        except RuntimeError:
            pass


@router.websocket("/v1/webrtc/{room_id}")
async def webrtc_signaling(websocket: WebSocket, room_id: str):
    # --- Validate room ID format ---
    if not is_valid_uuid(room_id):
        await websocket.accept()
        await _send(websocket, {"type": "error", "message": "Invalid room ID format"})
        await websocket.close(code=4000, reason="Invalid room ID")
        return

    # --- Origin + rate limit validation ---
    origin_validator = get_origin_validator()
    limiter = get_connection_limiter()
    origin = websocket.headers.get("origin")
    if not origin_validator.is_allowed(origin):
        await websocket.accept()
        await _send(websocket, {"type": "error", "message": "Origin not allowed"})
        await websocket.close(code=4003, reason="Origin not allowed")
        return

    client_ip = websocket.client.host if websocket.client else "unknown"
    if not limiter.try_acquire(client_ip):
        await websocket.accept()
        await _send(websocket, {"type": "error", "message": "Too many connections"})
        await websocket.close(code=4008, reason="Rate limited")
        return

    # --- JWT token validation ---
    token_secret = get_token_secret()
    token = websocket.query_params.get("token", "")
    if token:
        payload = verify_ws_token(token, token_secret)
        if payload is None:
            await websocket.accept()
            await _send(websocket, {"type": "error", "message": "Invalid or expired token"})
            await websocket.close(code=4001, reason="Auth failed")
            limiter.release(client_ip)
            return
    # else: no token provided — allow in dev mode (non-browser clients)

    # Start room TTL sweep if not running
    _ensure_sweep_running()

    await websocket.accept()
    get_room_ttl().touch(room_id)

    if room_id not in rooms:
        rooms[room_id] = Room(room_id)
    room = rooms[room_id]

    peer_id = None
    role = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, {"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type")

            if msg_type == "join":
                role = data.get("role", "caller")
                peer_id = data.get("peer_id", "unknown")
                peer_name = data.get("peer_name", "")

                # Validate role
                if role not in ("caller", "receiver"):
                    await _send(websocket, {"type": "error", "message": "Invalid role"})
                    continue

                # Validate peer_id is UUID-like
                if not is_valid_uuid(peer_id):
                    await _send(websocket, {"type": "error", "message": "Invalid peer ID"})
                    continue

                ok, reason = room.add_peer(websocket, role, peer_id, peer_name)
                if not ok:
                    await _send(websocket, {"type": "error", "message": reason})
                    continue

                await _send(websocket, {"type": "joined", "role": role, "room_id": room_id, "state": room.state})

                # Notify the other peer they now have someone to talk to.
                other = room.get_peer(websocket)
                if other:
                    my = {"id": peer_id, "name": peer_name}
                    await _send(other, {"type": "peer_joined", "role": role, "peer_id": peer_id, "peer_name": peer_name})
                    await _send(other, {"type": "call_started", "peer": my})
                    if room.is_complete:
                        # Tell the just-joined socket who is ALREADY here,
                        # not itself (previously echoed its own id/name back).
                        if websocket == room.caller:
                            existing = {"id": room.receiver_id, "name": room.receiver_name}
                        else:
                            existing = {"id": room.caller_id, "name": room.caller_name}
                        await _send(websocket, {"type": "call_started", "peer": existing})

                logger.info(f"Peer {peer_id} joined room {room_id} as {role} (state={room.state})")

            elif msg_type in ("offer", "answer", "ice_candidate"):
                get_room_ttl().touch(room_id)
                other = room.get_peer(websocket)
                if other:
                    await _send(other, data)
                else:
                    await _send(websocket, {"type": "error", "message": "No peer connected yet"})

            elif msg_type == "hangup":
                other = room.get_peer(websocket)
                if other:
                    await _send(other, {"type": "hangup"})
                room.state = "ENDED"
                logger.info(f"Peer hung up in room {room_id}")

            else:
                await _send(websocket, {"type": "error", "message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Signaling error in {room_id}: {e}")
    finally:
        role = room.remove_peer(websocket)
        limiter.release(client_ip)
        # Tell the remaining peer their counterpart left.
        remaining = room.caller or room.receiver
        if remaining and role:
            await _send(remaining, {"type": "peer_left", "role": role})
        if not room.caller and not room.receiver:
            rooms.pop(room_id, None)
            get_room_ttl().remove(room_id)
        logger.info(f"Peer {peer_id} disconnected from room {room_id}")


async def _send(websocket: WebSocket, data: dict):
    try:
        if websocket.client_state.name != "CONNECTED":
            return  # socket already closing/closed — nothing to send
        await websocket.send_json(data)
    except Exception as e:
        logger.debug(f"Failed to send signaling message: {e}")
