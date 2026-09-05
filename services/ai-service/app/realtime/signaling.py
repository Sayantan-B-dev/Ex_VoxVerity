"""WebRTC Signaling Server for VoxVerity Demo Calls.

Provides a minimal signaling mechanism for browser-to-browser WebRTC calls.
Uses WebSocket for SDP offer/answer and ICE candidate exchange.

This is a controlled demo mechanism, not a production telephony system.
"""

import json
import logging
import asyncio
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory room state
rooms: Dict[str, Dict] = {}


class Room:
    """A signaling room for WebRTC peer connection."""

    def __init__(self, room_id: str):
        self.room_id = room_id
        self.caller: Optional[WebSocket] = None
        self.receiver: Optional[WebSocket] = None
        self.caller_id: Optional[str] = None
        self.receiver_id: Optional[str] = None

    def add_peer(self, websocket: WebSocket, role: str, peer_id: str):
        """Add a peer to the room."""
        if role == "caller":
            self.caller = websocket
            self.caller_id = peer_id
        elif role == "receiver":
            self.receiver = websocket
            self.receiver_id = peer_id

    def remove_peer(self, websocket: WebSocket):
        """Remove a peer from the room."""
        if self.caller == websocket:
            self.caller = None
            self.caller_id = None
        elif self.receiver == websocket:
            self.receiver = None
            self.receiver_id = None

    def get_peer(self, role: str) -> Optional[WebSocket]:
        """Get the other peer in the room."""
        if role == "caller":
            return self.receiver
        elif role == "receiver":
            return self.caller
        return None

    @property
    def is_complete(self) -> bool:
        """Check if both peers are connected."""
        return self.caller is not None and self.receiver is not None

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "has_caller": self.caller is not None,
            "has_receiver": self.receiver is not None,
            "is_complete": self.is_complete,
        }


@router.websocket("/v1/webrtc/{room_id}")
async def webrtc_signaling(websocket: WebSocket, room_id: str):
    """WebSocket endpoint for WebRTC signaling.

    Protocol:
      Client sends:
        - join: {type: "join", role: "caller"|"receiver", peer_id: "uuid"}
        - offer: {type: "offer", sdp: "..."}
        - answer: {type: "answer", sdp: "..."}
        - ice_candidate: {type: "ice_candidate", candidate: {...}}

      Server sends:
        - joined: {type: "joined", role: "...", room_id: "..."}
        - peer_joined: {type: "peer_joined", role: "..."}
        - offer: {type: "offer", sdp: "..."}
        - answer: {type: "answer", sdp: "..."}
        - ice_candidate: {type: "ice_candidate", candidate: {...}}
        - error: {type: "error", message: "..."}
    """
    await websocket.accept()

    # Get or create room
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

                if role not in ("caller", "receiver"):
                    await _send(websocket, {"type": "error", "message": "Invalid role"})
                    continue

                room.add_peer(websocket, role, peer_id)
                await _send(websocket, {
                    "type": "joined",
                    "role": role,
                    "room_id": room_id,
                })

                # Notify the other peer
                other = room.get_peer(role)
                if other:
                    await _send(other, {
                        "type": "peer_joined",
                        "role": role,
                        "peer_id": peer_id,
                    })

                logger.info(f"Peer {peer_id} joined room {room_id} as {role}")

            elif msg_type in ("offer", "answer", "ice_candidate"):
                # Forward to the other peer
                other = room.get_peer(role)
                if other:
                    await _send(other, data)
                else:
                    await _send(websocket, {
                        "type": "error",
                        "message": "No peer connected yet",
                    })

            else:
                await _send(websocket, {
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Signaling error: {e}")
    finally:
        room.remove_peer(websocket)
        if not room.caller and not room.receiver:
            del rooms[room_id]
        logger.info(f"Peer disconnected from room {room_id}")


async def _send(websocket: WebSocket, data: dict):
    """Send JSON message to WebSocket."""
    try:
        await websocket.send_json(data)
    except Exception as e:
        logger.error(f"Failed to send signaling message: {e}")
