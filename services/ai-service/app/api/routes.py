from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.dsp.analyzer import decode_wav_pcm, compute_metrics, quality_flags
from app.dsp.human_pattern import analyze_human_pattern
from app.models.aasist_wrapper import get_aasist
from app.models.ecapa_wrapper import get_ecapa
from app.analysis.aggregator import get_aggregator
from app.risk.engine import get_risk_engine
from app.risk.alerts import get_alert_service

router = APIRouter()


# ── Schemas ──

class SessionCreate(BaseModel):
    user_id: Optional[str] = None
    source: str = "webrtc"


class SessionResponse(BaseModel):
    session_id: str
    status: str
    created_at: str


class ChunkMetadata(BaseModel):
    session_id: str
    sequence: int
    captured_at: str
    duration_ms: int = 3000
    sample_rate: int = 16000
    channels: int = 1
    encoding: str = "pcm_s16le"


class AnalysisResult(BaseModel):
    session_id: str
    chunk_sequence: int
    risk_score: int = 0
    risk_severity: str = "LOW"
    spoof_score: Optional[float] = None
    speaker_similarity: Optional[float] = None
    acoustic_anomaly: Optional[float] = None
    dsp_metrics: dict = {}
    quality_flags: dict = {}
    model_versions: dict = {}


# ── In-memory session store (Phase 17: minimal) ──
sessions: dict[str, dict] = {}


# ── Routes ──

@router.post("/sessions", response_model=SessionResponse)
async def create_session(data: SessionCreate):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "id": session_id,
        "user_id": data.user_id,
        "source": data.source,
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
        "chunks": [],
    }
    return SessionResponse(
        session_id=session_id,
        status="active",
        created_at=sessions[session_id]["created_at"],
    )


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]


@router.post("/sessions/{session_id}/chunks")
async def ingest_chunk(session_id: str, metadata: ChunkMetadata):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    session["chunks"].append(metadata.model_dump())

    # Phase 20+: Run DSP, Phase 22+: Run AASIST-L, Phase 24+: Run ECAPA-TDNN
    result = AnalysisResult(
        session_id=session_id,
        chunk_sequence=metadata.sequence,
        risk_score=0,
        risk_severity="LOW",
        dsp_metrics={"status": "pending_implementation"},
        quality_flags={"decoded": True},
    )
    return result


@router.post("/analyze/file")
async def analyze_file(file: UploadFile = File(...)):
    contents = await file.read()
    size_bytes = len(contents)

    result = {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": size_bytes,
        "size_kb": round(size_bytes / 1024, 1),
    }

    # Try to decode and analyze
    samples = decode_wav_pcm(contents)
    if samples:
        import numpy as np
        metrics = compute_metrics(samples)
        flags = quality_flags(metrics)
        human_pattern = analyze_human_pattern(metrics)

        # Run AASIST-L spoof detection
        aasist = get_aasist()
        audio_np = np.array(samples, dtype=np.float32)
        aasist_result = aasist.predict(audio_np)

        # Run risk engine
        risk_engine = get_risk_engine()
        risk_result = risk_engine.evaluate({
            "spoof_detection": aasist_result,
            "human_pattern": human_pattern,
            "quality_flags": flags,
            "dsp_metrics": metrics,
        })

        # Aggregate all signals into versioned result
        aggregator = get_aggregator()
        analysis = aggregator.aggregate(
            dsp_metrics=metrics,
            quality_flags=flags,
            human_pattern=human_pattern,
            spoof_detection=aasist_result,
        )

        result["dsp_metrics"] = metrics
        result["quality_flags"] = flags
        result["human_pattern"] = human_pattern
        result["spoof_detection"] = aasist_result
        result["analysis"] = analysis
        result["risk"] = risk_result
        result["status"] = "analyzed"
    else:
        result["dsp_metrics"] = None
        result["quality_flags"] = {"decode_ok": False}
        result["human_pattern"] = None
        result["spoof_detection"] = None
        result["analysis"] = None
        result["status"] = "decode_failed"
        result["message"] = "Could not decode audio. Only WAV (PCM) format is supported for analysis."

    return result


class SpeakerEnrollRequest(BaseModel):
    user_id: str
    name: Optional[str] = ""


class SpeakerVerifyRequest(BaseModel):
    user_id: str


@router.post("/speaker/enroll")
async def speaker_enroll(
    file: UploadFile = File(...),
    user_id: str = "",
    name: str = "",
):
    """Enroll a speaker with a reference audio sample."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    contents = await file.read()
    samples = decode_wav_pcm(contents)
    if samples is None:
        raise HTTPException(status_code=400, detail="Could not decode audio. Only WAV (PCM) is supported.")

    import numpy as np
    ecapa = get_ecapa()
    audio_np = np.array(samples, dtype=np.float32)
    result = ecapa.enroll_speaker(user_id, audio_np, name)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])

    return result


@router.post("/speaker/verify")
async def speaker_verify(
    file: UploadFile = File(...),
    user_id: str = "",
):
    """Verify a speaker against enrolled reference."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    contents = await file.read()
    samples = decode_wav_pcm(contents)
    if samples is None:
        raise HTTPException(status_code=400, detail="Could not decode audio. Only WAV (PCM) is supported.")

    import numpy as np
    ecapa = get_ecapa()
    audio_np = np.array(samples, dtype=np.float32)
    result = ecapa.verify_speaker(user_id, audio_np)

    return result


@router.post("/risk/evaluate")
async def risk_evaluate(
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
):
    """Evaluate risk for an audio file."""
    contents = await file.read()
    samples = decode_wav_pcm(contents)
    if samples is None:
        raise HTTPException(status_code=400, detail="Could not decode audio. Only WAV (PCM) is supported.")

    import numpy as np
    metrics = compute_metrics(samples)
    flags = quality_flags(metrics)
    human_pattern = analyze_human_pattern(metrics)

    aasist = get_aasist()
    audio_np = np.array(samples, dtype=np.float32)
    aasist_result = aasist.predict(audio_np)

    # Run risk engine
    risk_engine = get_risk_engine()
    risk_result = risk_engine.evaluate({
        "spoof_detection": aasist_result,
        "human_pattern": human_pattern,
        "quality_flags": flags,
        "dsp_metrics": metrics,
    })

    return risk_result


@router.get("/alerts")
async def list_alerts(
    session_id: Optional[str] = None,
    active_only: bool = False,
):
    """List alerts, optionally filtered by session."""
    alert_service = get_alert_service()
    if session_id:
        alerts = alert_service.get_session_alerts(session_id)
    elif active_only:
        alerts = alert_service.get_active_alerts()
    else:
        alerts = alert_service.get_recent_alerts()
    return {"alerts": alerts}


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, user_id: str = "operator"):
    """Acknowledge an alert."""
    alert_service = get_alert_service()
    alert = alert_service.acknowledge_alert(alert_id, user_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/models")
async def list_models():
    aasist = get_aasist()
    ecapa = get_ecapa()
    return {
        "models": [
            {
                "id": "AASIST-L",
                "name": "Audio Anti-Spoofing",
                "version": aasist.status["version"],
                "status": "loaded" if aasist.status["loaded"] else "not_loaded",
                "license": aasist.status["license"],
                "source": aasist.status["source"],
                "error": aasist.status["error"],
            },
            {
                "id": "ECAPA-TDNN",
                "name": "Speaker Embeddings",
                "version": ecapa.status["version"],
                "status": "loaded" if ecapa.status["loaded"] else "not_loaded",
                "license": ecapa.status["license"],
                "source": ecapa.status["source"],
                "error": ecapa.status["error"],
                "enrollment_count": ecapa.status["enrollment_count"],
            },
        ]
    }


@router.get("/config")
async def get_config():
    return {
        "sample_rate": 16000,
        "chunk_duration_ms": 3000,
        "model_window_samples": 64600,
        "risk_bands": {"low": 25, "medium": 50, "high": 75},
    }
