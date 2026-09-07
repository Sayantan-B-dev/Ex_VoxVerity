# AI Service API Reference

Base URL: `http://localhost:8000` (dev) — see [deployment docs](../deployment/).
All routes are under `/v1` unless noted. Browser calls need CORS allowlisted
origins; server calls can use `Authorization: Bearer <AI_SERVICE_API_KEY>`
when configured.

## Health & metadata

| Method | Path | Description |
|---|---|---|
| GET | `/health` | liveness: `{"status": "healthy"}` |
| GET | `/ready` | readiness |
| GET | `/version` | service + model versions and load status |
| GET | `/v1/config` | sample rate, chunk duration, model window, risk bands |
| GET | `/v1/models` | model list **plus** `voiceprint` status |
| GET | `/v1/languages` | language metadata |
| GET | `/v1/performance` | realtime pipeline performance / backpressure |

## Voiceprint (new)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/voiceprint/status` | `{ enrolled, name, chunk_count, duration_s, embedding_dim, model, path, created_at }` |

Training is done by the desktop app (`scripts/train_voiceprint.py`) writing
`model_artifacts/voiceprints/voiceprint.npz` — there is intentionally no
upload endpoint (raw audio is never uploaded).

## Speaker endpoints (existing, file-based)

| Method | Path | Params | Description |
|---|---|---|---|
| POST | `/v1/speaker/enroll` | `file` (WAV), `user_id`, `name` | enroll an in-memory speaker (not persisted) |
| POST | `/v1/speaker/verify` | `file` (WAV), `user_id` | verify against the in-memory enrollment |

> The realtime pipeline uses the persisted `voiceprint.npz` instead — prefer
> the trainer app over these for anything beyond testing.

## Analysis

| Method | Path | Description |
|---|---|---|
| POST | `/v1/analyze/file` | full analysis of an uploaded WAV (DSP + human pattern + AASIST + risk) |
| POST | `/v1/risk/evaluate` | risk score for an uploaded WAV |
| POST | `/v1/sessions` · GET `/v1/sessions/{id}` · POST `/v1/sessions/{id}/chunks` | REST session stubs (realtime WS is the real path) |

## Alerts & incidents

| Method | Path | Description |
|---|---|---|
| GET | `/v1/alerts` | list alerts (`session_id`, `active_only` filters) |
| POST | `/v1/alerts/{alert_id}/acknowledge` | ack an alert |
| GET | `/v1/incidents` · POST `/v1/incidents` · GET/POST `/v1/incidents/{id}/update` | incidents lifecycle |
| GET | `/v1/evidence/{id}` · POST `/v1/evidence/{id}/verify` | evidence hashes |
| GET | `/v1/audit` · GET `/v1/model-registry` | governance |

## Analytics

| Method | Path |
|---|---|
| GET | `/v1/analytics/dashboard` · `/v1/analytics/trends` · `/v1/analytics/sources` · `/v1/analytics/models` |

## WebSocket — `/v1/realtime/{session_id}`

Real-time 3s-chunk analysis. See [realtime-pipeline.md](../ai-service/realtime-pipeline.md)
for the full protocol and payload reference.

**Client → server:** `hello`, `start_session {source, model}`, `audio_chunk`,
`set_model {model}`, `stop_session`.
**Server → client:** `hello`, `session_started`, `ack`, `analysis_complete`,
`risk_update`, `alert_created`, `model_set`, `session_stopped`, `server_error`.

Auth: `?token=<JWT>` (issued by Next.js `/api/ws-token`); origin allowlist;
per-IP cap; UUID session ids.

## WebSocket — `/v1/webrtc/{room_id}`

Browser-to-browser WebRTC signaling (one host + one caller per room):

**Client → server:** `join {role: caller|receiver, peer_id, peer_name}`,
`offer`, `answer`, `ice_candidate`, `hangup`.
**Server → client:** `joined`, `peer_joined`, `call_started`, relayed
offer/answer/ICE, `hangup`, `peer_left`, `error`.

> `role` here is an internal slot name only: the room **creator** joins as
> `caller`, the joiner as `receiver`. Analysis direction is independent of
> these slots — the host (creator) analyzes the joiner's remote stream.