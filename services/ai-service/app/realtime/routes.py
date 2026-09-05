"""WebSocket Routes for VoxVerity Realtime Audio Pipeline.

Handles browser-to-server audio streaming and analysis.
"""

import json
import asyncio
import logging
import base64
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.realtime.manager import get_ws_manager
from app.dsp.analyzer import compute_metrics, quality_flags
from app.dsp.human_pattern import analyze_human_pattern
from app.models.aasist_wrapper import get_aasist
from app.risk.engine import get_risk_engine
from app.risk.alerts import get_alert_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/v1/realtime/{session_id}")
async def realtime_audio(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for realtime audio analysis.

    Protocol:
      Client sends JSON messages:
        - hello
        - start_session
        - audio_chunk (with base64 audio data)
        - stop_session
        - ping

      Server sends JSON messages:
        - hello (ack)
        - session_started
        - ack (per chunk)
        - analysis_complete
        - risk_update
        - session_stopped
        - server_error
    """
    manager = get_ws_manager()

    try:
        await manager.connect(websocket, session_id)

        # Start chunk processing loop
        processor_task = asyncio.create_task(
            _process_chunks_loop(session_id)
        )

        # Listen for messages
        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                    await manager.handle_message(session_id, data)
                except json.JSONDecodeError:
                    await manager._send_error(session_id, "Invalid JSON")
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    await manager._send_error(session_id, str(e))
        except WebSocketDisconnect:
            pass
        finally:
            processor_task.cancel()
            try:
                await processor_task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(session_id)


async def _process_chunks_loop(session_id: str):
    """Background task that processes audio chunks from the queue."""
    manager = get_ws_manager()

    while True:
        session = manager.get_session(session_id)
        if not session or session.state in ("STOPPED", "FAILED", "IDLE"):
            break

        chunk = session.get_next_chunk()
        if chunk:
            try:
                result = await _analyze_chunk(chunk, session.source)
                await manager.send_analysis_result(session_id, result)

                # Check if risk threshold crossed and create alert
                risk = result.get("risk", {})
                alert_service = get_alert_service()
                alert = alert_service.check_and_create_alert(
                    session_id=session_id,
                    risk_result=risk,
                    sequence=chunk["sequence"],
                )
                if alert:
                    await manager.send_alert(session_id, {
                        "type": "alert_created",
                        "alert_id": alert["alert_id"],
                        "score": alert["score"],
                        "severity": alert["severity"],
                        "sequence": alert["sequence"],
                        "recommendation": alert["recommendation"],
                    })

            except Exception as e:
                logger.error(f"Chunk processing error: {e}")
                await manager._send_error(session_id, f"Processing error: {e}")
        else:
            # No chunks available, wait
            await asyncio.sleep(0.1)


async def _analyze_chunk(chunk: dict, source: str) -> dict:
    """Analyze a single audio chunk."""
    # Decode base64 audio
    audio_b64 = chunk.get("audio_b64", "")
    if not audio_b64:
        return {"error": "No audio data"}

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception:
        return {"error": "Invalid audio data"}

    # Try to decode as WAV
    from app.dsp.analyzer import decode_wav_pcm
    samples = decode_wav_pcm(audio_bytes)

    if samples is None:
        # Try raw PCM (16-bit signed le)
        try:
            import struct
            fmt = f"<{len(audio_bytes) // 2}h"
            raw_samples = struct.unpack(fmt, audio_bytes)
            samples = [s / 32768.0 for s in raw_samples]
        except Exception:
            return {"error": "Could not decode audio"}

    if not samples:
        return {"error": "Empty audio"}

    # Compute DSP metrics
    metrics = compute_metrics(samples)
    flags = quality_flags(metrics)

    # Compute human pattern
    human_pattern = analyze_human_pattern(metrics)

    # Run spoof detection
    aasist = get_aasist()
    audio_np = np.array(samples, dtype=np.float32)
    spoof_result = aasist.predict(audio_np)

    # Run risk engine
    risk_engine = get_risk_engine()
    risk_result = risk_engine.evaluate({
        "spoof_detection": spoof_result,
        "human_pattern": human_pattern,
        "quality_flags": flags,
        "dsp_metrics": metrics,
    })

    return {
        "sequence": chunk["sequence"],
        "dsp_metrics": metrics,
        "quality_flags": flags,
        "human_pattern": human_pattern,
        "spoof_detection": spoof_result,
        "risk": risk_result,
        "source": source,
    }
