"""Audio Source Adapter Interface for VoxVerity.

Defines the common contract that all audio source adapters must implement.
The core AI pipeline is source-agnostic — adapters normalize audio to
a standard internal format before analysis.

Internal Audio Contract:
  - Sample rate: 16,000 Hz
  - Channels: mono
  - Representation: float32 normalized waveform
  - Chunk timestamp: ISO-8601
  - Sequence number: monotonically increasing
  - Session ID: UUID
  - Expected chunk duration: ~3 seconds
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, AsyncIterator
import time
import uuid


class AudioSourceType(str, Enum):
    """Supported audio source types."""
    WEBRTC = "WEBRTC"
    MICROPHONE = "MICROPHONE"
    DISPLAY_AUDIO = "DISPLAY_AUDIO"
    FILE = "FILE"
    TELEPHONY = "TELEPHONY"
    SIP = "SIP"
    TWILIO = "TWILIO"
    MEETING_PLATFORM = "MEETING_PLATFORM"
    FUTURE_PROVIDER = "FUTURE_PROVIDER"


class AudioSourceStatus:
    """Audio source connection status."""
    DISCONNECTED = "DISCONNECTED"
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    STREAMING = "STREAMING"
    ERROR = "ERROR"
    UNSUPPORTED = "UNSUPPORTED"


class AudioSourceAdapter(ABC):
    """Base class for audio source adapters.

    All adapters must implement:
      - connect(): Establish connection to audio source
      - disconnect(): Clean up connection
      - stream_chunks(): Async iterator yielding normalized audio chunks
      - get_status(): Current connection status
    """

    def __init__(self, source_type: AudioSourceType, adapter_id: Optional[str] = None):
        self.source_type = source_type
        self.adapter_id = adapter_id or f"{source_type.value}-{uuid.uuid4().hex[:8]}"
        self.status = AudioSourceStatus.DISCONNECTED
        self.created_at = time.time()
        self.connected_at: Optional[float] = None
        self.chunk_count = 0
        self.error_message: Optional[str] = None

    @abstractmethod
    async def connect(self, config: dict) -> bool:
        """Establish connection to audio source.

        Args:
            config: Adapter-specific configuration.
                    Common keys: session_id, user_id, credentials.

        Returns:
            True if connected successfully.
        """
        pass

    @abstractmethod
    async def disconnect(self):
        """Clean up connection and release resources."""
        pass

    @abstractmethod
    async def stream_chunks(self) -> AsyncIterator[dict]:
        """Stream normalized audio chunks.

        Yields:
            {
                "sequence": int,
                "captured_at": str,  # ISO-8601
                "duration_ms": int,
                "sample_rate": 16000,
                "channels": 1,
                "audio_b64": str,  # Base64 encoded PCM audio
                "source_type": str,
            }
        """
        pass

    @abstractmethod
    async def get_status(self) -> dict:
        """Get current adapter status.

        Returns:
            {
                "adapter_id": str,
                "source_type": str,
                "status": str,
                "connected_at": str | None,
                "chunk_count": int,
                "error": str | None,
            }
        """
        pass

    def _create_chunk(
        self,
        audio_b64: str,
        sequence: int,
        duration_ms: int = 3000,
    ) -> dict:
        """Create a normalized audio chunk."""
        self.chunk_count += 1
        return {
            "sequence": sequence,
            "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_ms": duration_ms,
            "sample_rate": 16000,
            "channels": 1,
            "audio_b64": audio_b64,
            "source_type": self.source_type.value,
        }
