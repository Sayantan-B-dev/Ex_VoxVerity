"""WebRTC Signaling Server for VoxVerity browser-to-browser calls.

Rooms hold exactly one caller + one receiver. Ringing/accepting happens in the
Next.js app (call_invites table + Supabase Realtime); this server relays the
WebRTC handshake (offer/answer/ICE) and call lifecycle (hangup / peer_left).

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
import logging
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory room state
rooms: Dict[str, "Room"] = {}


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
        return True, ""

    def remove_peer(self, websocket: WebSocket) -> str:
        """Remove a peer; returns the role that left (or \"\")."""
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


@router.websocket("/v1/webrtc/{room_id}")
async def webrtc_signaling(websocket: WebSocket, room_id: str):
    await websocket.accept()

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
                        await _send(websocket, {"type": "call_started", "peer": {"id": peer_id, "name": peer_name}})

                logger.info(f"Peer {peer_id} joined room {room_id} as {role} (state={room.state})")

            elif msg_type in ("offer", "answer", "ice_candidate"):
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
        # Tell the remaining peer their counterpart left.
        remaining = room.caller or room.receiver
        if remaining and role:
            await _send(remaining, {"type": "peer_left", "role": role})
        if not room.caller and not room.receiver:
            rooms.pop(room_id, None)
        logger.info(f"Peer {peer_id} disconnected from room {room_id}")


async def _send(websocket: WebSocket, data: dict):
    try:
        await websocket.send_json(data)
    except Exception as e:
        logger.error(f"Failed to send signaling message: {e}")