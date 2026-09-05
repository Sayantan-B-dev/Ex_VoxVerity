"""Analytics Service for VoxVerity.

Aggregates operational metrics from sessions, alerts, incidents, and risk results.
Exposes trend views and campaign-oriented analysis without exposing sensitive PII.
"""

import time
import logging
from typing import Optional, Dict, List
from collections import defaultdict

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for aggregating operational analytics."""

    def __init__(self):
        self._sessions: List[dict] = []
        self._alerts: List[dict] = []
        self._incidents: List[dict] = []
        self._risk_history: List[dict] = []

    def record_session(self, session_id: str, source: str, started_at: float):
        """Record a session for analytics."""
        self._sessions.append({
            "session_id": session_id,
            "source": source,
            "started_at": started_at,
            "chunks_processed": 0,
            "avg_risk": 0,
        })

    def record_chunk(self, session_id: str, risk_score: int, risk_severity: str):
        """Record a chunk result for analytics."""
        self._risk_history.append({
            "session_id": session_id,
            "score": risk_score,
            "severity": risk_severity,
            "timestamp": time.time(),
        })

    def record_alert(self, alert: dict):
        """Record an alert for analytics."""
        self._alerts.append(alert)

    def record_incident(self, incident: dict):
        """Record an incident for analytics."""
        self._incidents.append(incident)

    def get_dashboard_summary(self) -> dict:
        """Get dashboard summary metrics."""
        now = time.time()
        last_24h = now - 86400
        last_7d = now - 604800

        recent_sessions = [s for s in self._sessions if s["started_at"] > last_24h]
        recent_risks = [r for r in self._risk_history if r["timestamp"] > last_24h]
        recent_alerts = [a for a in self._alerts if a.get("created_at", 0) > last_24h]
        active_incidents = [i for i in self._incidents if i.get("status") in ("OPEN", "INVESTIGATING")]

        # Risk distribution
        risk_dist = defaultdict(int)
        for r in recent_risks:
            risk_dist[r["severity"]] += 1

        return {
            "period": "last_24h",
            "sessions": {
                "total": len(recent_sessions),
                "sources": self._count_sources(recent_sessions),
            },
            "risk": {
                "total_analyzed": len(recent_risks),
                "distribution": dict(risk_dist),
                "avg_score": self._avg_score(recent_risks),
            },
            "alerts": {
                "total": len(recent_alerts),
                "by_severity": self._count_severity(recent_alerts),
            },
            "incidents": {
                "active": len(active_incidents),
                "total": len(self._incidents),
            },
        }

    def get_risk_trends(self, hours: int = 24) -> List[dict]:
        """Get risk score trends over time."""
        now = time.time()
        start = now - (hours * 3600)

        recent = [r for r in self._risk_history if r["timestamp"] > start]

        # Group by hour
        hourly = defaultdict(list)
        for r in recent:
            hour = int(r["timestamp"] // 3600)
            hourly[hour].append(r["score"])

        trends = []
        for hour in sorted(hourly.keys()):
            scores = hourly[hour]
            trends.append({
                "hour": hour,
                "avg_score": round(sum(scores) / len(scores), 1),
                "min_score": min(scores),
                "max_score": max(scores),
                "count": len(scores),
            })

        return trends

    def get_source_breakdown(self) -> dict:
        """Get breakdown by audio source type."""
        sources = defaultdict(int)
        for s in self._sessions:
            sources[s["source"]] += 1
        return dict(sources)

    def get_model_usage(self) -> dict:
        """Get model usage statistics."""
        return {
            "AASIST-L": {
                "total_inferences": len(self._risk_history),
                "avg_latency_ms": 45,  # Placeholder
            },
            "ECAPA-TDNN": {
                "total_enrollments": 0,
                "total_verifications": 0,
            },
            "DSP": {
                "total_analyses": len(self._risk_history),
            },
        }

    def _count_sources(self, sessions: List[dict]) -> Dict[str, int]:
        sources = defaultdict(int)
        for s in sessions:
            sources[s["source"]] += 1
        return dict(sources)

    def _avg_score(self, risks: List[dict]) -> float:
        if not risks:
            return 0
        return round(sum(r["score"] for r in risks) / len(risks), 1)

    def _count_severity(self, alerts: List[dict]) -> Dict[str, int]:
        counts = defaultdict(int)
        for a in alerts:
            counts[a.get("severity", "UNKNOWN")] += 1
        return dict(counts)


# Singleton instance
_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    """Get or create the analytics service singleton."""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service
