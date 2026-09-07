"""WebSocket Session Manager for VoxVerity Realtime Pipeline.

Handles WebSocket connections, audio chunk ingestion, and
analysis result distribution for realtime audio sessions.

Message protocol:
  Client -> Server:
    - hello: {type: "hello", session_id: "uuid"}
    - start_session: {type: "start_session", source: "microphone|webrtc"}
    - audio_chunk: binary frame with JSON metadata header
    - stop_session: {type: "stop_session"}
    - ping: {type: "ping"}

  Server -> Client:
    - session_started: {type: "session_started", session_id: "uuid"}
    - ack: {type: "ack", sequence: int}
    - analysis_partial: {type: "analysis_partial", ...}
    - analysis_complete: {type: "analysis_complete", ...}
    - risk_update: {type: "risk_update", score: int, severity: str}
    - alert_created: {type: "alert_created", ...}
    - session_stopped: {type: "session_stopped"}
    - server_error: {type: "server_error", message: str}
"""

import json
import time
import uuid
import asyncio
import logging
from typing import Optional, Dict, Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Constants
CHUNK_DURATION_MS = 3000  # 3-second cadence
MAX_QUEUE_SIZE = 50  # Maximum chunks in queue before marking degraded
STALE_CHUNK_TIMEOUT_S = 10  # Mark stale if older than 10s


class SessionState:
    """Realtime session state."""
    IDLE = "IDLE"
    STARTING = "STARTING"
    ACTIVE = "ACTIVE"
    DEGRADED = "DEGRADED"
    STOPPED = "STOPPED"
    FAILED = "FAILED"


class RealtimeSession:
    """A single realtime audio session."""

    def __init__(self, session_id: str, source: str = "microphone", model: str = "aasist_voiceprint"):
        self.session_id = session_id
        self.source = source
        self.model = model
        self.state = SessionState.IDLE
        self.created_at = time.time()
        self.last_chunk_at: Optional[float] = None
        self.sequence = 0
        self.chunk_queue: list[dict] = []
        self.results: list[dict] = []
        self.risk_history: list[dict] = []

    def start(self):
        """Start the session."""
        self.state = SessionState.ACTIVE
        self.created_at = time.time()
        logger.info(f"Session {self.session_id} started")

    def stop(self):
        """Stop the session."""
        self.state = SessionState.STOPPED
        logger.info(f"Session {self.session_id} stopped")

    def add_chunk(self, chunk: dict) -> bool:
        """Add a chunk to the queue. Returns False if queue is full."""
        if len(self.chunk_queue) >= MAX_QUEUE_SIZE:
            self.state = SessionState.DEGRADED
            logger.warning(f"Session {self.session_id} queue full, marking degraded")
            return False

        self.chunk_queue.append(chunk)
        self.last_chunk_at = time.time()
        self.sequence += 1
        return True

    def get_next_chunk(self) -> Optional[dict]:
        """Get next chunk from queue for processing."""
        if self.chunk_queue:
            chunk = self.chunk_queue.pop(0)
            # Auto-recover from DEGRADED when queue drains
            if self.state == SessionState.DEGRADED and len(self.chunk_queue) < MAX_QUEUE_SIZE // 2:
                self.state = SessionState.ACTIVE
                logger.info(f"Session {self.session_id} recovered from degraded")
            return chunk
        return None

    def add_result(self, result: dict):
        """Store analysis result."""
        self.results.append(result)
        if "risk" in result:
            self.risk_history.append({
                "sequence": self.sequence,
                "score": result["risk"].get("score", 0),
                "severity": result["risk"].get("severity", "LOW"),
                "timestamp": time.time(),
            })

    def to_dict(self) -> dict:
        """Convert session to dictionary."""
        return {
            "session_id": self.session_id,
            "source": self.source,
            "model": self.model,
            "state": self.state,
            "created_at": self.created_at,
            "last_chunk_at": self.last_chunk_at,
            "sequence": self.sequence,
            "queue_size": len(self.chunk_queue),
            "results_count": len(self.results),
        }


class WebSocketManager:
    """Manages WebSocket connections and realtime sessions."""

    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, RealtimeSession] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept WebSocket connection and register session."""
        await websocket.accept()
        self.connections[session_id] = websocket

        if session_id not in self.sessions:
            self.sessions[session_id] = RealtimeSession(session_id)

        logger.info(f"WebSocket connected: {session_id}")
        await self._send(websocket, {
            "type": "hello",
            "session_id": session_id,
            "status": "connected",
        })

    async def disconnect(self, session_id: str):
        """Disconnect and cleanup session."""
        if session_id in self.connections:
            del self.connections[session_id]
        if session_id in self.sessions:
            self.sessions[session_id].stop()
        logger.info(f"WebSocket disconnected: {session_id}")

    async def handle_message(self, session_id: str, data: dict):
        """Handle incoming WebSocket message."""
        msg_type = data.get("type")

        if msg_type == "hello":
            await self._handle_hello(session_id, data)
        elif msg_type == "start_session":
            await self._handle_start_session(session_id, data)
        elif msg_type == "set_model":
            await self._handle_set_model(session_id, data)
        elif msg_type == "stop_session":
            await self._handle_stop_session(session_id)
        elif msg_type == "ping":
            await self._handle_ping(session_id)
        elif msg_type == "audio_chunk":
            await self._handle_audio_chunk(session_id, data)
        else:
            await self._send_error(session_id, f"Unknown message type: {msg_type}")

    async def _handle_hello(self, session_id: str, data: dict):
        """Handle hello message."""
        session = self.sessions.get(session_id)
        if session:
            await self._send_to_session(session_id, {
                "type": "hello",
                "session_id": session_id,
                "status": "ok",
                "session": session.to_dict(),
            })

    async def _handle_start_session(self, session_id: str, data: dict):
        """Handle start_session message."""
        session = self.sessions.get(session_id)
        if session:
            source = data.get("source", "microphone")
            model = data.get("model", "aasist_voiceprint")
            if model not in ("aasist_voiceprint", "aasist", "heuristic"):
                model = "aasist_voiceprint"
            session.source = source
            session.model = model
            session.start()
            await self._send_to_session(session_id, {
                "type": "session_started",
                "session_id": session_id,
                "source": source,
                "model": model,
            })

    async def _handle_set_model(self, session_id: str, data: dict):
        """Switch the analysis model mid-session."""
        session = self.sessions.get(session_id)
        if not session:
            await self._send_error(session_id, "Session not found")
            return
        model = data.get("model", "aasist_voiceprint")
        if model not in ("aasist_voiceprint", "aasist", "heuristic"):
            model = "aasist_voiceprint"
        session.model = model
        await self._send_to_session(session_id, {
            "type": "model_set",
            "model": model,
        })

    async def _handle_stop_session(self, session_id: str):
        """Handle stop_session message."""
        session = self.sessions.get(session_id)
        if session:
            session.stop()
            await self._send_to_session(session_id, {
                "type": "session_stopped",
                "session_id": session_id,
            })

    async def _handle_ping(self, session_id: str):
        """Handle ping message."""
        await self._send_to_session(session_id, {
            "type": "pong",
            "timestamp": time.time(),
        })

    async def _handle_audio_chunk(self, session_id: str, data: dict):
        """Handle audio_chunk message."""
        session = self.sessions.get(session_id)
        if not session:
            await self._send_error(session_id, "Session not found")
            return

        if session.state != SessionState.ACTIVE:
            await self._send_error(session_id, "Session not active")
            return

        # Add chunk to queue
        chunk = {
            "sequence": data.get("sequence", session.sequence + 1),
            "captured_at": data.get("captured_at", time.time()),
            "duration_ms": data.get("duration_ms", CHUNK_DURATION_MS),
            "audio_b64": data.get("audio_b64", ""),
        }

        if not session.add_chunk(chunk):
            await self._send_error(session_id, "Queue full, session degraded")
            return

        # Acknowledge
        await self._send_to_session(session_id, {
            "type": "ack",
            "sequence": chunk["sequence"],
            "queue_size": len(session.chunk_queue),
        })

    async def send_analysis_result(self, session_id: str, result: dict):
        """Send analysis result to client."""
        session = self.sessions.get(session_id)
        if session:
            session.add_result(result)

        await self._send_to_session(session_id, {
            "type": "analysis_complete",
            "session_id": session_id,
            "result": result,
        })

        # Send risk update separately for easy UI handling
        if "risk" in result:
            risk = result["risk"]
            await self._send_to_session(session_id, {
                "type": "risk_update",
                "session_id": session_id,
                "score": risk.get("score", 0),
                "severity": risk.get("severity", "LOW"),
                "recommendation": risk.get("recommendation", ""),
            })

    async def send_alert(self, session_id: str, alert: dict):
        """Send alert to client."""
        await self._send_to_session(session_id, {
            "type": "alert_created",
            "session_id": session_id,
            "alert": alert,
        })

    async def _send_to_session(self, session_id: str, data: dict):
        """Send message to a specific session."""
        websocket = self.connections.get(session_id)
        if websocket:
            await self._send(websocket, data)

    async def _send(self, websocket: WebSocket, data: dict):
        """Send JSON message to WebSocket."""
        try:
            if websocket.client_state.name != "CONNECTED":
                return  # socket already closing/closed — nothing to send
            await websocket.send_json(data)
        except Exception as e:
            logger.debug(f"Failed to send WebSocket message: {e}")

    async def _send_error(self, session_id: str, message: str):
        """Send error message to session."""
        await self._send_to_session(session_id, {
            "type": "server_error",
            "session_id": session_id,
            "message": message,
        })

    def get_session(self, session_id: str) -> Optional[RealtimeSession]:
        """Get session by ID."""
        return self.sessions.get(session_id)

    def list_sessions(self) -> list[dict]:
        """List all active sessions."""
        return [s.to_dict() for s in self.sessions.values()]


# Singleton instance
_manager: Optional[WebSocketManager] = None


def get_ws_manager() -> WebSocketManager:
    """Get or create the WebSocket manager singleton."""
    global _manager
    if _manager is None:
        _manager = WebSocketManager()
    return _manager
