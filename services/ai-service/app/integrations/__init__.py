"""VoxVerity Integrations Framework.

Pluggable audio source adapters for different input types.
The core AI pipeline is source-agnostic — all adapters normalize
audio to the same internal contract before analysis.
"""

from app.integrations.base import AudioSourceAdapter, AudioSourceType
from app.integrations.registry import get_adapter_registry

__all__ = [
    "AudioSourceAdapter",
    "AudioSourceType",
    "get_adapter_registry",
]
