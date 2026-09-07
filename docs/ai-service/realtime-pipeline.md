# Realtime Pipeline & Metrics Reference

The browser streams 3-second audio chunks over a WebSocket; the AI service
analyzes each chunk and returns a full `analysis_complete` payload.

- Server: `services/ai-service/app/realtime/routes.py`, `manager.py`
- Client: `apps/web/lib/realtime.ts` (`useRealtimeMic`)

## WebSocket protocol — `/v1/realtime/{session_id}`

Client → server (JSON):

| Message | Payload |
|---|---|
| `hello` | — |
| `start_session` | `{ source, model }` |
| `audio_chunk` | `{ sequence, audio_b64, encoding: "pcm_s16le", sample_rate: 16000 }` |
| `set_model` | `{ model }` (mid-session switch) |
| `stop_session` | — |

Server → client:

| Message | Payload |
|---|---|
| `hello` / `session_started` | session id, source, model |
| `ack` | `{ sequence, queue_size }` per chunk |
| `analysis_complete` | the full result object (below) |
| `risk_update` | `{ score, severity, recommendation }` |
| `alert_created` | when a chunk crosses HIGH/CRITICAL |
| `model_set` | after `set_model` |
| `session_stopped` / `server_error` | lifecycle |

Security: origin allowlist, per-IP connection cap, short-lived JWT
(`?token=` from `/api/ws-token`), UUID session ids, stale-session sweep.

## Per-chunk analysis steps

1. Decode PCM (s16le → float32 [-1, 1]).
2. DSP metrics + quality flags (`app/dsp/analyzer.py`).
3. Human-pattern descriptor (`app/dsp/human_pattern.py`, heuristic).
4. **Voice-activity gate** — if `low_energy` or `silence_ratio > 0.85`,
   the chunk is flagged `no_speech: true` and risk is clamped to ≤ 8 (LOW).
5. Anti-spoof: AASIST-L ONNX (or heuristic per model selection).
6. Speaker verification: ECAPA embedding vs enrolled voiceprint (skipped for
   `no_speech` chunks or when no voiceprint / heuristic model).
7. Risk engine evaluates all signals deterministically.

## `analysis_complete.result` — metrics reference

### `dsp_metrics` (per chunk, 16 kHz mono)

| Key | Meaning |
|---|---|
| `rms_energy` | root-mean-square amplitude (0–1 scale) |
| `spectral_centroid_hz` | brightness of the spectrum |
| `silence_ratio` | fraction of silent frames (0–1) |
| `dynamic_range_db` | loudness spread |
| `zero_crossing_rate` | speechiness proxy |
| `clipping_ratio` | fraction of samples at full scale |
| `dbfs` | overall level in dBFS |
| `duration_s` | chunk duration |

### `quality_flags`

`low_energy`, `clipping_detected`, `silence_detected`, `very_short`, `decode_ok`.

### `human_pattern`

| Key | Meaning |
|---|---|
| `score` | 0–100 **naturalness** (higher = more natural dynamics), heuristic |
| `label` | always `acoustic_dynamics` |
| `description` | human-readable verdict |
| `quality` | `good` / `degraded` / `poor` |
| `method` | `heuristic_dsp` |

### `spoof_detection`

| Key | Meaning |
|---|---|
| `normalized_score` | 0–100 **bona-fide** score (higher = more natural) |
| `severity_label` | from calibration: `HIGH_SPOOF_SIGNAL` … `HIGH_BONAFIDE_SIGNAL`, `UNCERTAIN` |
| `score` | raw 0–1 bona-fide probability |
| `confidence` | max softmax |
| `fallback` / `loaded` | heuristic vs real model |

> Class semantics: **class 0 = bona fide** (verified empirically). The UI shows
> "Synthetic Voice Signal" as `100 − normalized_score`.

### `speaker_verification` (only when a voiceprint is enrolled)

| Key | Meaning |
|---|---|
| `similarity` | 0–1 cosine to the enrolled voiceprint |
| `match` | `similarity ≥ 0.70` |
| `confidence` | `high` / `medium` / `low` / `none` |
| `enrolled_name` | the trained voiceprint name |

### `acoustic_anomaly` (0–100, higher = more anomalous)

Computed from DSP + quality flags (clipping, low energy, silence ratio,
duration, dynamic range).

### `no_speech` (boolean)

Silence gate fired — this chunk contained no speech; risk is clamped LOW.

### `risk`

| Key | Meaning |
|---|---|
| `score` | 0–100 |
| `severity` | `LOW` 0–25 · `MEDIUM` 26–50 · `HIGH` 51–75 · `CRITICAL` 76–100 |
| `recommendation` | operator guidance |
| `contributing_factors` | per-signal breakdown with weights |
| `rule_triggers` | e.g. `SPOOF_SIGNAL_LOW`, `SPEAKER_MATCH_HIGH` |
| `explanation` | human-readable summary |
| `policy_version` | `1.0.0` |

See [risk-engine.md](risk-engine.md) for the scoring details.

## Persistence

Each chunk is posted by the browser to `POST /api/risk-events`, which:

1. Recomputes the score with the TypeScript risk mirror
   (`apps/web/lib/risk-engine.ts`) for consistency;
2. Writes an `analysis_results` row (risk, spoof, speaker similarity, DSP,
   model versions);
3. Rolls worst/latest risk + alert count into the `calls` row;
4. Opens an alert when a chunk crosses HIGH/CRITICAL.