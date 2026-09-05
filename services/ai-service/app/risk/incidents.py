"""Incident and Evidence Packaging Service for VoxVerity.

Manages incident lifecycle and generates canonical evidence manifests
with SHA-256 hashes for tamper-evident provenance.
"""

import uuid
import json
import hashlib
import time
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class IncidentStatus:
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    CONTAINED = "CONTAINED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class IncidentService:
    """Service for managing incidents and evidence."""

    def __init__(self):
        self._incidents: Dict[str, dict] = {}
        self._evidence: Dict[str, dict] = {}

    def create_incident(
        self,
        session_id: str,
        alert_id: Optional[str] = None,
        risk_result: Optional[dict] = None,
        analysis_results: Optional[List[dict]] = None,
    ) -> dict:
        """Create a new incident from an alert or session.

        Args:
            session_id: Session identifier.
            alert_id: Source alert ID (optional).
            risk_result: Risk engine output.
            analysis_results: List of analysis results.

        Returns:
            Incident record.
        """
        incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
        now = time.time()

        incident = {
            "incident_id": incident_id,
            "session_id": session_id,
            "alert_id": alert_id,
            "status": IncidentStatus.OPEN,
            "created_at": now,
            "updated_at": now,
            "owner": None,
            "timeline": [
                {
                    "event": "incident_created",
                    "timestamp": now,
                    "details": f"Incident created from session {session_id}",
                }
            ],
            "risk_summary": risk_result,
            "analysis_count": len(analysis_results) if analysis_results else 0,
            "evidence_ids": [],
            "notes": [],
            "resolution": None,
            "false_positive": False,
        }

        self._incidents[incident_id] = incident
        logger.info(f"Incident created: {incident_id}")

        # Auto-generate evidence package
        if analysis_results:
            evidence = self.generate_evidence(
                incident_id=incident_id,
                session_id=session_id,
                analysis_results=analysis_results,
                risk_result=risk_result,
            )
            incident["evidence_ids"].append(evidence["evidence_id"])

        return incident

    def update_incident(
        self,
        incident_id: str,
        status: Optional[str] = None,
        owner: Optional[str] = None,
        note: Optional[str] = None,
        resolution: Optional[str] = None,
        false_positive: Optional[bool] = None,
    ) -> Optional[dict]:
        """Update an incident."""
        incident = self._incidents.get(incident_id)
        if not incident:
            return None

        now = time.time()
        incident["updated_at"] = now

        if status:
            incident["status"] = status
            incident["timeline"].append({
                "event": "status_changed",
                "timestamp": now,
                "details": f"Status changed to {status}",
            })

        if owner:
            incident["owner"] = owner
            incident["timeline"].append({
                "event": "owner_assigned",
                "timestamp": now,
                "details": f"Assigned to {owner}",
            })

        if note:
            incident["notes"].append({
                "text": note,
                "timestamp": now,
                "author": owner or "system",
            })

        if resolution:
            incident["resolution"] = resolution
            incident["timeline"].append({
                "event": "resolved",
                "timestamp": now,
                "details": resolution,
            })

        if false_positive is not None:
            incident["false_positive"] = false_positive
            if false_positive:
                incident["status"] = IncidentStatus.FALSE_POSITIVE

        return incident

    def get_incident(self, incident_id: str) -> Optional[dict]:
        """Get incident by ID."""
        return self._incidents.get(incident_id)

    def get_session_incidents(self, session_id: str) -> List[dict]:
        """Get all incidents for a session."""
        return [
            i for i in self._incidents.values()
            if i["session_id"] == session_id
        ]

    def get_recent_incidents(self, limit: int = 20) -> List[dict]:
        """Get recent incidents."""
        sorted_incidents = sorted(
            self._incidents.values(),
            key=lambda i: i["created_at"],
            reverse=True,
        )
        return sorted_incidents[:limit]

    def generate_evidence(
        self,
        incident_id: str,
        session_id: str,
        analysis_results: List[dict],
        risk_result: Optional[dict] = None,
    ) -> dict:
        """Generate canonical evidence manifest with SHA-256 hash.

        The manifest is deterministically serialized to ensure
        the same inputs always produce the same hash.
        """
        evidence_id = f"EVD-{uuid.uuid4().hex[:8].upper()}"
        now = time.time()

        # Build canonical manifest (sorted keys for determinism)
        manifest = {
            "evidence_id": evidence_id,
            "incident_id": incident_id,
            "session_id": session_id,
            "created_at": now,
            "analysis_results": [
                {
                    "sequence": r.get("sequence"),
                    "dsp_metrics": r.get("dsp_metrics"),
                    "quality_flags": r.get("quality_flags"),
                    "human_pattern": r.get("human_pattern"),
                    "spoof_detection": {
                        "model": r.get("spoof_detection", {}).get("model"),
                        "version": r.get("spoof_detection", {}).get("version"),
                        "score": r.get("spoof_detection", {}).get("score"),
                        "loaded": r.get("spoof_detection", {}).get("loaded"),
                    } if r.get("spoof_detection") else None,
                    "risk": {
                        "score": r.get("risk", {}).get("score"),
                        "severity": r.get("risk", {}).get("severity"),
                        "rule_triggers": r.get("risk", {}).get("rule_triggers", []),
                    } if r.get("risk") else None,
                }
                for r in analysis_results
            ],
            "risk_summary": {
                "score": risk_result.get("score") if risk_result else None,
                "severity": risk_result.get("severity") if risk_result else None,
            } if risk_result else None,
            "metadata": {
                "aggregation_version": "1.0.0",
                "hash_algorithm": "SHA-256",
                "total_chunks": len(analysis_results),
            },
        }

        # Canonicalize: sort keys recursively and serialize
        canonical_json = json.dumps(manifest, sort_keys=True, separators=(",", ":"))

        # Compute SHA-256 hash
        evidence_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        evidence = {
            "evidence_id": evidence_id,
            "incident_id": incident_id,
            "session_id": session_id,
            "created_at": now,
            "manifest": manifest,
            "canonical_json": canonical_json,
            "hash_algorithm": "SHA-256",
            "evidence_hash": evidence_hash,
            "verified": True,
        }

        self._evidence[evidence_id] = evidence
        logger.info(f"Evidence generated: {evidence_id} (hash: {evidence_hash[:16]}...)")

        return evidence

    def get_evidence(self, evidence_id: str) -> Optional[dict]:
        """Get evidence by ID."""
        return self._evidence.get(evidence_id)

    def verify_evidence(self, evidence_id: str) -> dict:
        """Verify evidence hash integrity.

        Returns:
            {
                "verified": bool,
                "evidence_id": str,
                "stored_hash": str,
                "computed_hash": str,
                "match": bool,
            }
        """
        evidence = self._evidence.get(evidence_id)
        if not evidence:
            return {"verified": False, "error": "Evidence not found"}

        # Recompute hash from manifest
        canonical_json = json.dumps(evidence["manifest"], sort_keys=True, separators=(",", ":"))
        computed_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        return {
            "verified": True,
            "evidence_id": evidence_id,
            "stored_hash": evidence["evidence_hash"],
            "computed_hash": computed_hash,
            "match": evidence["evidence_hash"] == computed_hash,
        }


# Singleton instance
_incident_service: Optional[IncidentService] = None


def get_incident_service() -> IncidentService:
    """Get or create the incident service singleton."""
    global _incident_service
    if _incident_service is None:
        _incident_service = IncidentService()
    return _incident_service
