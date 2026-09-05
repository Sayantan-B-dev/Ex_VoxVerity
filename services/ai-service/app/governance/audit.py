"""Audit Service for VoxVerity.

Records security-relevant actions for traceability.
Never logs secrets, raw audio, or unnecessary PII.
"""

import time
import uuid
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class AuditAction:
    # Authentication
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    USER_REGISTER = "USER_REGISTER"
    PASSWORD_RESET = "PASSWORD_RESET"

    # Session
    SESSION_STARTED = "SESSION_STARTED"
    SESSION_STOPPED = "SESSION_STOPPED"

    # Analysis
    ANALYSIS_COMPLETED = "ANALYSIS_COMPLETED"
    CHUNK_PROCESSED = "CHUNK_PROCESSED"

    # Alerts
    ALERT_CREATED = "ALERT_CREATED"
    ALERT_ACKNOWLEDGED = "ALERT_ACKNOWLEDGED"

    # Incidents
    INCIDENT_CREATED = "INCIDENT_CREATED"
    INCIDENT_UPDATED = "INCIDENT_UPDATED"
    INCIDENT_RESOLVED = "INCIDENT_RESOLVED"

    # Evidence
    EVIDENCE_GENERATED = "EVIDENCE_GENERATED"
    EVIDENCE_VERIFIED = "EVIDENCE_VERIFIED"
    EVIDENCE_BLOCKCHAIN_REGISTERED = "EVIDENCE_BLOCKCHAIN_REGISTERED"

    # Model
    MODEL_LOADED = "MODEL_LOADED"
    MODEL_UNLOADED = "MODEL_UNLOADED"
    MODEL_EVALUATED = "MODEL_EVALUATED"

    # Policy
    POLICY_CHANGED = "POLICY_CHANGED"
    THRESHOLD_CHANGED = "THRESHOLD_CHANGED"

    # System
    SYSTEM_STARTUP = "SYSTEM_STARTUP"
    SYSTEM_ERROR = "SYSTEM_ERROR"


class AuditService:
    """Service for recording audit events."""

    def __init__(self):
        self._events: List[dict] = []

    def record(
        self,
        action: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        details: Optional[dict] = None,
        severity: str = "INFO",
    ) -> dict:
        """Record an audit event.

        Args:
            action: Action type (use AuditAction constants).
            user_id: User performing the action (optional).
            session_id: Session context (optional).
            details: Additional context (optional, no secrets!).
            severity: Event severity (INFO, WARNING, ERROR).

        Returns:
            Audit event record.
        """
        event_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
        now = time.time()

        event = {
            "event_id": event_id,
            "action": action,
            "user_id": user_id,
            "session_id": session_id,
            "details": details or {},
            "severity": severity,
            "timestamp": now,
        }

        self._events.append(event)

        # Also log for observability
        log_msg = f"AUDIT: {action}"
        if user_id:
            log_msg += f" user={user_id}"
        if session_id:
            log_msg += f" session={session_id[:8]}"
        logger.info(log_msg)

        return event

    def get_events(
        self,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 50,
    ) -> List[dict]:
        """Get audit events with optional filters."""
        filtered = self._events

        if user_id:
            filtered = [e for e in filtered if e["user_id"] == user_id]
        if session_id:
            filtered = [e for e in filtered if e["session_id"] == session_id]
        if action:
            filtered = [e for e in filtered if e["action"] == action]

        # Return most recent first
        return sorted(filtered, key=lambda e: e["timestamp"], reverse=True)[:limit]

    def get_recent_events(self, limit: int = 50) -> List[dict]:
        """Get recent audit events."""
        return sorted(self._events, key=lambda e: e["timestamp"], reverse=True)[:limit]

    def get_event_count(self) -> int:
        """Get total number of audit events."""
        return len(self._events)


# Singleton instance
_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """Get or create the audit service singleton."""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service
