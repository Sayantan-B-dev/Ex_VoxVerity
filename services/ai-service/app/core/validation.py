"""Input Validation for VoxVerity API.

Provides validation functions for API inputs to prevent
injection attacks and ensure data integrity.
"""

import re
from typing import Optional


# Maximum file sizes
MAX_AUDIO_FILE_SIZE_MB = 50
MAX_AUDIO_FILE_SIZE_BYTES = MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024

# Allowed file extensions
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".webm"}

# Session ID pattern (UUID-like)
SESSION_ID_PATTERN = re.compile(r"^[a-f0-9\-]{8,64}$")

# Alert/Incident ID pattern
ID_PATTERN = re.compile(r"^[A-Z]{3}-[A-Z0-9]{8}$")


def validate_session_id(session_id: str) -> bool:
    """Validate session ID format."""
    return bool(SESSION_ID_PATTERN.match(session_id))


def validate_record_id(record_id: str) -> bool:
    """Validate alert/incident/evidence ID format."""
    return bool(ID_PATTERN.match(record_id))


def validate_file_size(size_bytes: int) -> Optional[str]:
    """Validate file size. Returns error message if invalid."""
    if size_bytes <= 0:
        return "File is empty"
    if size_bytes > MAX_AUDIO_FILE_SIZE_BYTES:
        return f"File too large. Maximum {MAX_AUDIO_FILE_SIZE_MB}MB."
    return None


def validate_filename(filename: str) -> bool:
    """Validate filename contains no path traversal."""
    if not filename:
        return False
    # Reject path traversal attempts
    if ".." in filename or "/" in filename or "\\" in filename:
        return False
    # Reject hidden files
    if filename.startswith("."):
        return False
    return True


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input by truncating and stripping."""
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_length]


def validate_sequence(sequence: int) -> bool:
    """Validate sequence number is positive."""
    return isinstance(sequence, int) and sequence >= 0


def validate_duration_ms(duration_ms: int) -> bool:
    """Validate duration is reasonable (100ms - 30s)."""
    return isinstance(duration_ms, int) and 100 <= duration_ms <= 30000
