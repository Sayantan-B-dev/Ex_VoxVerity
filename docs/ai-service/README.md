# VoxVerity AI Service — Feature Documentation

This folder documents the AI service (`services/ai-service`, FastAPI + Python 3.13)
and everything added for real-time voice integrity analysis.

| Document | Covers |
|---|---|
| [voiceprint-training.md](voiceprint-training.md) | "Train with your voice" app — record, train, test, files, privacy |
| [model-selection.md](model-selection.md) | Client-side model selection (Settings → Model tab) and the realtime protocol |
| [realtime-pipeline.md](realtime-pipeline.md) | The WebSocket analysis pipeline and every metric it produces |
| [risk-engine.md](risk-engine.md) | The 0–100 risk score: weights, signals, severity bands, silence gate |

REST/WS API reference: [`docs/api/ai-service.md`](../api/ai-service.md)

---

## Architecture (high level)

```
Browser A (host / monitor)          Browser B (caller, analyzed)
  ─ creates room                        ─ joins with the 6-char code
  ─ hears B over WebRTC                 ─ speaks; their mic feeds WebRTC
  ─ chunks B's REMOTE stream ─────┐      and a local-only self monitor
                                  ▼
                    ┌──────────────────────────┐
                    │  AI Service  (:8000)     │
                    │  /v1/realtime/{session}  │  3s PCM chunks in
                    │                          │
                    │  DSP metrics             │  numpy / scipy / librosa
                    │  Human pattern (heuristic)│
                    │  AASIST-L (ONNX)          │  anti-spoof signal
                    │  ECAPA-TDNN (voiceprint)  │  speaker similarity
                    │  Risk engine              │  0–100 + severity
                    └──────────┬───────────────┘
                               │ analysis_complete (JSON)
                               ▼
              Browser A dashboard: waveform, risk meter, 4 signal panels,
              chunk table, speaking indicator, post-call summary
              → /api/risk-events persists each chunk to Supabase
```

## Key design decisions

1. **Roles (do not mix up).** The person who **creates** the room is the
   **host** — they are the *receiver/monitor* and their dashboard analyzes the
   other person's voice. The person who **joins** is the **caller** — *their*
   voice is integrity-checked. The host's dashboard chunks the caller's audio
   received over WebRTC (`remoteStream`), never the host's own microphone.
2. **The host's analysis never falls back to its own mic.** Analysis starts
   only after the caller's remote stream has arrived (`requireStream` guard +
   auto-start gate). If it started early, the dashboard would analyze the
   host's own voice — muted or not.
3. **Voice activity gate.** Chunks with no speech report `no_speech: true`
   and a LOW risk instead of spiking the meter on silence.
4. **AASIST-L class semantics.** Empirically verified: logits class **0** is
   the bona-fide class (natural speech fires class 0; silence is a coin-flip).
   The wrapper reads class 0 — an inverted mapping made real voices score as
   high risk.
5. **Voiceprint is a local file**, never uploaded, never on-chain, never
   logged. Raw audio is never persisted by the pipeline.
6. **Client-selectable model.** The browser sends its chosen model id with
   `start_session`; the service validates it and applies it per session.

## Quickstart (local)

```bash
# 1. Dependencies (already installed on the dev machine)
cd services/ai-service
pip install -r requirements.txt        # includes sounddevice for the trainer

# 2. Train a voiceprint (optional but recommended)
python scripts/train_voiceprint.py     # record ~1 min → Train voiceprint

# 3. Run the service
python -m uvicorn app.main:app --reload --port 8000

# 4. Sanity checks
curl http://localhost:8000/health
curl http://localhost:8000/v1/models
curl http://localhost:8000/v1/voiceprint/status

# 5. Tests
python -m pytest tests/ -q             # 28 tests
```

## Model artifacts & voiceprints

```
services/ai-service/model_artifacts/
  aasist-l.onnx                        # AASIST-L ONNX export (~766 KB)
  voiceprints/
    voiceprint.npz                     # 192-dim float32 ECAPA embedding
    voiceprint.json                    # metadata: name, chunks, duration, date
```

- `voiceprint.npz` + `voiceprint.json` are written by the trainer app and read
  by the service on demand. The manager auto-reloads when the file changes on
  disk (mtime check), so training works without a service restart.
- Deleting both files (or "Reset" in the trainer) removes the enrollment.