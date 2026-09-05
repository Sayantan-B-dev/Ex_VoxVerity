"""Adapter Registry for VoxVerity.

Manages available audio source adapters and their configuration.
"""

import logging
from typing import Dict, Optional, List
from app.integrations.base import AudioSourceAdapter, AudioSourceType
from app.integrations.stubs import (
    TelephonyAdapter,
    SIPAdapter,
    TwilioAdapter,
    MeetingPlatformAdapter,
)

logger = logging.getLogger(__name__)


class AdapterRegistry:
    """Registry for audio source adapters."""

    def __init__(self):
        self._adapters: Dict[str, AudioSourceAdapter] = {}
        self._register_defaults()

    def _register_defaults(self):
        """Register built-in stub adapters."""
        stubs = [
            TelephonyAdapter(),
            SIPAdapter(),
            TwilioAdapter(),
            MeetingPlatformAdapter("zoom"),
            MeetingPlatformAdapter("teams"),
            MeetingPlatformAdapter("meet"),
        ]

        for adapter in stubs:
            self._adapters[adapter.adapter_id] = adapter
            logger.info(f"Registered adapter: {adapter.adapter_id}")

    def register_adapter(self, adapter: AudioSourceAdapter):
        """Register a custom adapter."""
        self._adapters[adapter.adapter_id] = adapter
        logger.info(f"Adapter registered: {adapter.adapter_id}")

    def get_adapter(self, adapter_id: str) -> Optional[AudioSourceAdapter]:
        """Get adapter by ID."""
        return self._adapters.get(adapter_id)

    def list_adapters(self) -> List[dict]:
        """List all registered adapters with status."""
        import asyncio

        adapters = []
        for adapter in self._adapters.values():
            # Use cached status if available
            adapters.append({
                "adapter_id": adapter.adapter_id,
                "source_type": adapter.source_type.value,
                "status": adapter.status,
                "created_at": adapter.created_at,
            })

        return adapters

    def get_adapters_by_type(self, source_type: AudioSourceType) -> List[AudioSourceAdapter]:
        """Get all adapters of a specific type."""
        return [
            a for a in self._adapters.values()
            if a.source_type == source_type
        ]


# Singleton instance
_registry: Optional[AdapterRegistry] = None


def get_adapter_registry() -> AdapterRegistry:
    """Get or create the adapter registry singleton."""
    global _registry
    if _registry is None:
        _registry = AdapterRegistry()
    return _registry
