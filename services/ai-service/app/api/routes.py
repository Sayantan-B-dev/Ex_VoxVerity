from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.dsp.analyzer import decode_wav_pcm, compute_metrics, quality_flags

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
        metrics = compute_metrics(samples)
        flags = quality_flags(metrics)
        result["dsp_metrics"] = metrics
        result["quality_flags"] = flags
        result["status"] = "analyzed"
    else:
        result["dsp_metrics"] = None
        result["quality_flags"] = {"decode_ok": False}
        result["status"] = "decode_failed"
        result["message"] = "Could not decode audio. Only WAV (PCM) format is supported for analysis."

    return result


@router.post("/speaker/enroll")
async def speaker_enroll():
    return {"status": "not_implemented", "message": "Phase 24: Speaker enrollment"}


@router.post("/speaker/verify")
async def speaker_verify():
    return {"status": "not_implemented", "message": "Phase 24: Speaker verification"}


@router.post("/risk/evaluate")
async def risk_evaluate():
    return {"status": "not_implemented", "message": "Phase 26: Risk engine"}


@router.get("/models")
async def list_models():
    return {
        "models": [
            {
                "id": "AASIST-L",
                "name": "Audio Anti-Spoofing",
                "version": "v1.0",
                "status": "not_loaded",
                "license": "MIT",
            },
            {
                "id": "ECAPA-TDNN",
                "name": "Speaker Embeddings",
                "version": "v1.0",
                "status": "not_loaded",
                "license": "Apache-2.0",
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
