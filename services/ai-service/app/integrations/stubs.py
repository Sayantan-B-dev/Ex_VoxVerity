"""Stub Adapters for Future Audio Source Integrations.

These are placeholder implementations that document the required
configuration and legal review for each integration type.
They do NOT provide real functionality — they fail gracefully
with clear error messages.
"""

from typing import Optional, AsyncIterator
from app.integrations.base import AudioSourceAdapter, AudioSourceType, AudioSourceStatus


class TelephonyAdapter(AudioSourceAdapter):
    """Stub adapter for direct telephony (PSTN/SIP) integration.

    Future Implementation:
      - Twilio Media Streams
      - SIP/PBX integration
      - Vendor-specific SDKs

    Required Credentials:
      - TWILIO_ACCOUNT_SID (if using Twilio)
      - TWILIO_AUTH_TOKEN (if using Twilio)
      - SIP_SERVER_URL (if using SIP)

    Legal Review Required:
      - Telecom regulations in deployment jurisdiction
      - Consent requirements for call recording/monitoring
      - Data retention policies for voice metadata
    """

    def __init__(self):
        super().__init__(AudioSourceType.TELEPHONY)

    async def connect(self, config: dict) -> bool:
        self.status = AudioSourceStatus.UNSUPPORTED
        self.error_message = (
            "Telephony adapter not yet implemented. "
            "Requires Twilio Media Streams or SIP/PBX integration. "
            "Legal review required before deployment."
        )
        return False

    async def disconnect(self):
        self.status = AudioSourceStatus.DISCONNECTED

    async def stream_chunks(self) -> AsyncIterator[dict]:
        if self.status == AudioSourceStatus.UNSUPPORTED:
            raise RuntimeError(self.error_message)
        return

    async def get_status(self) -> dict:
        return {
            "adapter_id": self.adapter_id,
            "source_type": self.source_type.value,
            "status": self.status,
            "connected_at": None,
            "chunk_count": 0,
            "error": self.error_message,
            "required_credentials": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
            "legal_review": "Telecom regulations and consent requirements",
        }


class SIPAdapter(AudioSourceAdapter):
    """Stub adapter for SIP/PBX integration.

    Required: SIP server credentials and network access.
    Legal: Varies by jurisdiction.
    """

    def __init__(self):
        super().__init__(AudioSourceType.SIP)

    async def connect(self, config: dict) -> bool:
        self.status = AudioSourceStatus.UNSUPPORTED
        self.error_message = "SIP adapter not yet implemented."
        return False

    async def disconnect(self):
        self.status = AudioSourceStatus.DISCONNECTED

    async def stream_chunks(self) -> AsyncIterator[dict]:
        if self.status == AudioSourceStatus.UNSUPPORTED:
            raise RuntimeError(self.error_message)
        return

    async def get_status(self) -> dict:
        return {
            "adapter_id": self.adapter_id,
            "source_type": self.source_type.value,
            "status": self.status,
            "connected_at": None,
            "chunk_count": 0,
            "error": self.error_message,
            "required_credentials": ["SIP_SERVER_URL", "SIP_USERNAME", "SIP_PASSWORD"],
            "legal_review": "SIP/PBX monitoring regulations",
        }


class TwilioAdapter(AudioSourceAdapter):
    """Stub adapter for Twilio Media Streams.

    Required: Twilio account with Media Streams enabled.
    Legal: Twilio Terms of Service compliance.
    """

    def __init__(self):
        super().__init__(AudioSourceType.TWILIO)

    async def connect(self, config: dict) -> bool:
        self.status = AudioSourceStatus.UNSUPPORTED
        self.error_message = "Twilio adapter not yet implemented."
        return False

    async def disconnect(self):
        self.status = AudioSourceStatus.DISCONNECTED

    async def stream_chunks(self) -> AsyncIterator[dict]:
        if self.status == AudioSourceStatus.UNSUPPORTED:
            raise RuntimeError(self.error_message)
        return

    async def get_status(self) -> dict:
        return {
            "adapter_id": self.adapter_id,
            "source_type": self.source_type.value,
            "status": self.status,
            "connected_at": None,
            "chunk_count": 0,
            "error": self.error_message,
            "required_credentials": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
            "legal_review": "Twilio Media Streams terms and consent requirements",
        }


class MeetingPlatformAdapter(AudioSourceAdapter):
    """Stub adapter for meeting platforms (Zoom, Teams, Meet).

    Required: Vendor-specific SDK or integration.
    Legal: Platform terms of service, participant consent.
    """

    def __init__(self, platform: str = "unknown"):
        super().__init__(AudioSourceType.MEETING_PLATFORM)
        self.platform = platform

    async def connect(self, config: dict) -> bool:
        self.status = AudioSourceStatus.UNSUPPORTED
        self.error_message = (
            f"Meeting platform adapter ({self.platform}) not yet implemented. "
            "Requires vendor SDK integration."
        )
        return False

    async def disconnect(self):
        self.status = AudioSourceStatus.DISCONNECTED

    async def stream_chunks(self) -> AsyncIterator[dict]:
        if self.status == AudioSourceStatus.UNSUPPORTED:
            raise RuntimeError(self.error_message)
        return

    async def get_status(self) -> dict:
        return {
            "adapter_id": self.adapter_id,
            "source_type": self.source_type.value,
            "status": self.status,
            "platform": self.platform,
            "connected_at": None,
            "chunk_count": 0,
            "error": self.error_message,
            "required_credentials": [f"{self.platform.upper()}_API_KEY"],
            "legal_review": f"{self.platform} platform terms and participant consent",
        }
