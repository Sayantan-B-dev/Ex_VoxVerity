"""Alert Service for VoxVerity.

Creates alerts when risk thresholds are crossed.
Alerts are persisted and linked to sessions/incidents.
"""

import uuid
import time
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class AlertSeverity:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertService:
    """Service for creating and managing risk-based alerts."""

    def __init__(self):
        self._alerts: Dict[str, dict] = {}
        self._cooldowns: Dict[str, float] = {}  # session_id -> last_alert_time
        self._cooldown_seconds = 30  # Minimum time between alerts for same session

    def check_and_create_alert(
        self,
        session_id: str,
        risk_result: dict,
        sequence: int,
    ) -> Optional[dict]:
        """Check risk score and create alert if threshold crossed.

        Args:
            session_id: Session identifier.
            risk_result: Risk engine output.
            sequence: Chunk sequence number.

        Returns:
            Alert dict if created, None otherwise.
        """
        score = risk_result.get("score", 0)
        severity = risk_result.get("severity", "LOW")

        # Only create alerts for HIGH or CRITICAL
        if severity not in (AlertSeverity.HIGH, AlertSeverity.CRITICAL):
            return None

        # Check cooldown
        now = time.time()
        last_alert = self._cooldowns.get(session_id, 0)
        if now - last_alert < self._cooldown_seconds:
            logger.debug(f"Alert cooldown active for session {session_id}")
            return None

        # Create alert
        alert = self._create_alert(
            session_id=session_id,
            score=score,
            severity=severity,
            sequence=sequence,
            risk_result=risk_result,
        )

        self._cooldowns[session_id] = now
        return alert

    def _create_alert(
        self,
        session_id: str,
        score: int,
        severity: str,
        sequence: int,
        risk_result: dict,
    ) -> dict:
        """Create a new alert."""
        alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"

        alert = {
            "alert_id": alert_id,
            "session_id": session_id,
            "score": score,
            "severity": severity,
            "sequence": sequence,
            "created_at": time.time(),
            "status": "ACTIVE",
            "acknowledged": False,
            "acknowledged_by": None,
            "acknowledged_at": None,
            "rule_triggers": risk_result.get("rule_triggers", []),
            "contributing_factors": risk_result.get("contributing_factors", []),
            "recommendation": risk_result.get("recommendation", ""),
            "explanation": risk_result.get("explanation", ""),
            "incident_id": None,
        }

        self._alerts[alert_id] = alert
        logger.info(f"Alert created: {alert_id} (score={score}, severity={severity})")

        return alert

    def acknowledge_alert(self, alert_id: str, user_id: str = "operator") -> Optional[dict]:
        """Acknowledge an alert."""
        alert = self._alerts.get(alert_id)
        if not alert:
            return None

        alert["acknowledged"] = True
        alert["acknowledged_by"] = user_id
        alert["acknowledged_at"] = time.time()
        alert["status"] = "ACKNOWLEDGED"

        logger.info(f"Alert acknowledged: {alert_id} by {user_id}")
        return alert

    def get_alert(self, alert_id: str) -> Optional[dict]:
        """Get alert by ID."""
        return self._alerts.get(alert_id)

    def get_session_alerts(self, session_id: str) -> List[dict]:
        """Get all alerts for a session."""
        return [
            a for a in self._alerts.values()
            if a["session_id"] == session_id
        ]

    def get_active_alerts(self) -> List[dict]:
        """Get all active (unacknowledged) alerts."""
        return [
            a for a in self._alerts.values()
            if a["status"] == "ACTIVE"
        ]

    def get_recent_alerts(self, limit: int = 20) -> List[dict]:
        """Get recent alerts across all sessions."""
        sorted_alerts = sorted(
            self._alerts.values(),
            key=lambda a: a["created_at"],
            reverse=True,
        )
        return sorted_alerts[:limit]

    def link_to_incident(self, alert_id: str, incident_id: str) -> Optional[dict]:
        """Link an alert to an incident."""
        alert = self._alerts.get(alert_id)
        if not alert:
            return None

        alert["incident_id"] = incident_id
        alert["status"] = "LINKED"
        return alert


# Singleton instance
_alert_service: Optional[AlertService] = None


def get_alert_service() -> AlertService:
    """Get or create the alert service singleton."""
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService()
    return _alert_service
