# VoxVerity Total Pipeline - End to End Q&A

Mic to chain in one pass: how browser capture, the AI service, Next.js risk write-back, alerts, evidence, and blockchain fit together in the real code.

## MEDIUM - End-to-end flow (Q1-Q20)

### Q1: Where does microphone capture start, and what does `useRealtimeMic` set up first?

Capture starts in the browser inside `useRealtimeMic` in `apps/web/lib/realtime.ts`. Calling `start()` clears prior chunks and waveform state, generates a `crypto.randomUUID()` session id, and fetches a short-lived token from `POST /api/ws-token`. It then opens a WebSocket with `aiRealtimeWsUrl(id, wsToken)` from `apps/web/lib/ai-service.ts`, which targets `/v1/realtime/{sessionId}`. On open it sends `hello` followed by `start_session` with the `source` and `model` (default `aasist_voiceprint`). Only after the socket exists does it touch audio hardware, so signaling is ready before the first sample exists.

### Q2: How does the browser guarantee 16kHz mono PCM before anything is sent?

`apps/web/lib/realtime.ts` creates the capture graph with `new AudioContext({ sampleRate: 16000 })` and a mono `ScriptProcessorNode(4096, 1, 1)` fed by `createMediaStreamSource`. Every `onaudioprocess` callback receives one channel (`getChannelData(0)`), so stereo mics collapse to mono at the source node. Samples accumulate in a `Float32Array` buffer until `bufferedSamples >= 16000 * (chunkMs / 1000)`, with the default `chunkMs` of 3000 producing 48000 samples per chunk. Conversion uses `floatToPcm16Base64` from `apps/web/lib/ai-service.ts`, which clamps to [-1, 1] and packs to signed 16-bit little-endian bytes before base64 encoding. The chunk is sent with explicit `encoding: "pcm_s16le"` and `sample_rate: 16000` labels.

### Q3: Why 3-second chunks, and where is that interval enforced?

The 3s window is enforced purely in the browser by the `targetSamples` threshold in `apps/web/lib/realtime.ts`: `16000 * ((opts?.chunkMs ?? 3000) / 1000)`. Audio callbacks fire roughly every 256ms (4096 samples at 16kHz), and only when the accumulated buffer crosses 48000 samples does the code concatenate, sequence, timestamp, and send one `audio_chunk`. This keeps network and inference load predictable at about 20 messages per minute per call. The AI service does not re-chunk; `services/ai-service/app/realtime/routes.py` treats each `audio_chunk` as one unit in `_analyze_chunk`. The dashboard copy also assumes 3s math, for example the LivePage summary estimates duration as `chunks * 3`.

### Q4: What travels over the realtime WebSocket in each direction?

The browser (client in `apps/web/lib/realtime.ts`) sends `hello`, `start_session`, repeated `audio_chunk` frames (`sequence`, `audio_b64`, `encoding`, `sample_rate`), and finally `stop_session`. The AI service (server in `services/ai-service/app/realtime/routes.py`) replies with `hello` ack, `session_started`, per-chunk `ack`, per-chunk `analysis_complete` carrying the full `result` object, plus `risk_update`, `session_stopped`, `alert_created`, and `server_error` message types. Each `audio_chunk` carries a monotonically increasing `sequence` starting at 1, and the client records `sentAt.set(seq, Date.now())` so round-trip latency can be computed when the matching result returns. The server echoes that same `sequence` inside the analysis payload so browser, AI service, and database rows stay aligned.

### Q5: Where does the room-code call flow live, and how do two browsers find each other?

Room orchestration lives in `useCall` in `apps/web/lib/call.ts` plus two Next.js routes: `POST /api/call-rooms` (create) and `POST /api/call-rooms/join` (join). The creator calls `createRoom()`, which stores `call_id` and a 6-character `room_code`, sets `isHost=true`, and opens signaling to `/v1/webrtc/{callId}` with role `"caller"`. The joiner types the code into `LivePage.tsx`, which calls `joinRoom(code)`; the code is uppercased, stripped to `[A-Z0-9]{6}`, resolved to the same `call_id`, and signaling opens with role `"receiver"`. Because `call.id` doubles as the WebRTC signaling room id, both sockets land in the same AI-service signaling room and SDP can be exchanged.

### Q6: How does WebRTC signaling actually connect the two peers?

Signaling runs over a WebSocket built by `signalingUrl(roomId, token)` in `apps/web/lib/call.ts`, pointing at the AI service path `/v1/webrtc/{roomId}` with a `POST /api/ws-token` JWT attached. Each side sends `{ type: "join", role, peer_id, peer_name }`, and the service relays `peer_joined` / `call_started`, `offer`, `answer`, `ice_candidate`, `hangup`, and `peer_left` frames. The creator (`role: "caller"`) runs `startRtc("caller")`, adds local mic tracks, creates an offer, and sends its SDP; the joiner answers via `handleOffer`. ICE uses a public STUN server (`stun:stun.l.google.com:19302`), and `pc.ontrack` assembles the incoming tracks into `remoteStream`. Either side hanging up sends `{ type: "hangup" }`, which flips both state machines to `ended` and triggers cleanup.

### Q7: What is the caller-only audio policy, and how is it enforced in code?

The policy is that the host monitors the joiner's voice, never their own, and it is enforced in three places. First, `LivePage.tsx` only mounts host-side `LiveMonitoring` with `remoteStream={call.remoteStream}` when `call.isHost && status === "active"`. Second, `LiveMonitoring.tsx` passes `stream: remoteStream` plus `requireStream: true` into `useRealtimeMic`, and its auto-start effect returns early while `remoteStream` is null so it can never silently fall back to the host mic. Third, `useRealtimeMic` in `apps/web/lib/realtime.ts` refuses to call `getUserMedia` when `requireStream` is set without an external stream, surfacing "The caller's audio stream is not available yet" instead. The joiner side renders `SelfMonitor` (mic level only, no analysis), so only one voice per call is ever scored.

### Q8: How does the host both hear and analyze the caller without double audio?

`LivePage.tsx` binds the WebRTC `remoteStream` to a hidden `<audio autoPlay>` element, which is the playback path the host hears. That exact same `MediaStream` object is handed to `LiveMonitoring` and then to `useRealtimeMic` as the `stream` option, where `createMediaStreamSource(stream)` taps it for analysis. To avoid doubling, `useRealtimeMic` only connects the `ScriptProcessorNode` to `ctx.destination` (speakers) when the source is the local mic (`!refs.current.external`); external peer audio skips that connection with an explicit comment. External tracks are also never stopped by the analyzer (`stop()` checks `refs.current.external`), because track lifetime belongs to `useCall` cleanup and the `<audio>` element. One stream therefore feeds two sinks: ears and model.

### Q9: What does the AI service do the moment one chunk arrives?

Inside `services/ai-service/app/realtime/routes.py`, the socket receive loop parses JSON and hands `audio_chunk` frames to a session queue via the WS manager; a separate `_process_chunks_loop` task polls `session.get_next_chunk()` every 100ms. `_analyze_chunk` base64-decodes the payload and unpacks `pcm_s16le` with `struct` into float samples, falling back to WAV decode for other encodings. It then runs `compute_metrics` plus `quality_flags` (DSP), `analyze_human_pattern` (prosody-ish descriptor), the AASIST wrapper `predict`, an optional voiceprint `verify`, and finally `risk_engine.evaluate(signals)`. The assembled dict (`sequence`, `dsp_metrics`, `quality_flags`, `human_pattern`, `spoof_detection`, `speaker_verification`, `no_speech`, `acoustic_anomaly`, `risk`, `source`) is pushed back as `analysis_complete` and also checked against the alert service.

### Q10: What do the DSP, AASIST, and ECAPA stages each contribute?

DSP (`compute_metrics` / `quality_flags` in `services/ai-service/app/dsp/analyzer.py`) produces cheap per-chunk facts such as RMS energy, spectral centroid, silence ratio, dynamic range, clipping, low-energy, and very-short flags. AASIST-L (`get_aasist().predict` in `services/ai-service/app/models/aasist_wrapper.py`) scores anti-spoofing as a 0-100 bona fide value with a severity label, or a tagged heuristic fallback when weights are absent. Speaker verification (`get_voiceprint().verify`, backed by ECAPA-TDNN embeddings in `services/ai-service/app/models/voiceprint.py` and `ecapa_wrapper.py`) returns cosine similarity 0-1 plus match and confidence against the enrolled voiceprint, and it is skipped for silent chunks. The risk engine treats these as independent signals with weights 0.40 / 0.20 / 0.20, so no single stage can dictate the score alone.

### Q11: How is the 0-100 risk score actually computed on the AI service?

`RiskEngine.evaluate` in `services/ai-service/app/risk/engine.py` starts from a neutral `base_risk = 50` and blends each available signal sequentially with `base * (1 - w) + signal_risk * w`. Spoof risk is `100 - normalized_score` at weight 0.40, human-pattern risk is `100 - human_score` at 0.20, speaker risk is `(1 - similarity) * 100` at 0.20, and acoustic anomaly blends at 0.10. Mitigations subtract 15 for a verified speaker match and 5 for clean high-quality audio, then the total is clamped to 0-100. Severity bands are LOW 0-25, MEDIUM 26-50, HIGH 51-75, CRITICAL 76-100, each with a canned recommendation. The output includes score, severity, rule triggers, contributing factors, explanation, adjustments, acoustic anomaly, and model versions.

### Q12: What happens on the browser the instant `analysis_complete` arrives?

The `ws.onmessage` handler in `apps/web/lib/realtime.ts` parses the result, fires `opts?.onResult?.(result)` first so `LivePage` can persist it, then maps AI-service fields into a `LiveChunk` for rendering. It reads `risk.score` / `risk.severity`, `spoof_detection.normalized_score`, `human_pattern` score and description, `speaker_verification` similarity and match, and `no_speech`, computing acoustic anomaly locally via `computeAcousticAnomaly` as a mirror of the server formula when needed. Round-trip latency comes from the `sentAt` map keyed by `sequence`, and the chunk list is capped to the last 200 entries. `LiveMonitoring.tsx` then fans that one chunk out to the risk meter, spoof panel, speaker ring, acoustic bars, prosody card, chunk table, and session footer.

### Q13: How does a chunk get from the AI service into the dashboard database?

`LivePage.tsx` defines `onChunk`, which appends every host-side result to a local `chunkLog` (capped at 1000) and fires `POST /api/risk-events` with `{ call_id, result }`. The route in `apps/web/app/api/risk-events/route.ts` authenticates via `requireOrg`, verifies the call belongs to that org, recomputes risk with the TypeScript engine, inserts one `analysis_results` row, rolls worst-risk into the `calls` row, and opens an `alerts` row when severity is HIGH or CRITICAL. Because the dashboard reads `analysis_results`, `calls`, and `alerts` through Supabase Realtime (see `useSupabaseTable` in `apps/web/lib/realtime.ts`), every other viewer updates without refresh. The browser is therefore a courier: analysis happens in Python, authority happens in Next.js plus Postgres.

### Q14: What exactly does `/api/risk-events` write on every chunk?

The route performs four writes in order: one `analysis_results` insert (chunk sequence, recomputed score and severity, spoof score scaled to 0-1, speaker similarity, acoustic anomaly, dsp metrics, quality flags, model versions, explanation notes), one `calls` update (worst `risk_score`, derived worst severity, and `alert_count` incremented only when the chunk scores 51 or more), one conditional `alerts` insert with trigger rules, contributing signals, recommended action, and threat title, and one audit row (`risk.chunk_written`). Severity derivation is `>= 76 CRITICAL, >= 51 HIGH, >= 26 MEDIUM, else LOW`. Alert dedup queries for an existing `Open` or `Investigating` alert at the same severity before inserting, giving at most one open alert per call per severity. All writes are org-scoped through `requireOrg`.

### Q15: Where do alerts surface, and what opens versus dedups them?

Alerts are opened server-side in `apps/web/app/api/risk-events/route.ts` whenever a recomputed chunk scores 51+, and in parallel the AI service can emit `alert_created` over the socket via `get_alert_service().check_and_create_alert` in `services/ai-service/app/realtime/routes.py`. The Next.js path dedups with a `maybeSingle()` lookup for an open alert on the same `call_id` and `severity`, so a long HIGH stretch creates one HIGH alert rather than one per chunk, while an escalation to CRITICAL opens a second row. On screen, `LiveMonitoring.tsx` subscribes with `useSupabaseTable("alerts")`, shows connection state plus the latest realtime event, and flips its threat banner at `risk >= 51` with Verify, Escalate, and Create Incident actions. The post-call summary in `LivePage.tsx` also counts `HIGH+ chunks` so reviewers see density, not just the peak.

### Q16: What is `/api/risk-policy` for, and who can change it?

`apps/web/app/api/risk-policy/route.ts` exposes the org-level risk configuration stored in the `risk_policies` table. `GET` returns the single active policy for the caller's org, and `PATCH` accepts `thresholds`, `weights`, `verification_threshold`, `auto_escalation`, `sensitivity`, `model_version`, `band_actions`, and `name`, ignoring any other keys. Both handlers gate on `requireOrg`, so only authenticated org members read or mutate their own policy, and every update writes an audit row (`policy.update`). It is the intended control plane for tuning bands and weights per deployment without redeploying code. The realtime scoring path reads its defaults from `DEFAULT_POLICY` in `services/ai-service/app/risk/engine.py`, so this route is the admin surface that future work can wire into per-chunk evaluation.

### Q17: What happens when a call ends, step by step?

`hangup()` in `apps/web/lib/call.ts` sends `{ type: "hangup" }` over signaling, fires `PATCH /api/call-rooms` to close the room server-side, sets status to `ended`, and stops all local and remote tracks plus both sockets. In `useRealtimeMic`, `stop()` sends `stop_session` and closes the realtime socket without stopping externally owned peer tracks. `LivePage.tsx` then swaps the active-call card for a host-side call summary computed from `chunkLog`: chunk count, average and peak risk, HIGH+ chunk count, average spoof and speaker similarity, and average acoustic anomaly. The server complement is `finalizeCallEvidence` in `apps/web/lib/evidence.ts`, which marks the call `completed` with `ended_at` and mints the evidence fingerprint plus blockchain registration.

### Q18: How do evidence fingerprints get created, and what is hashed?

`finalizeCallEvidence(ctx, callId)` in `apps/web/lib/evidence.ts` reloads the call's id, org, final risk score and severity, caller display, and start time, then marks it completed. It builds a small JSON manifest with `call_id`, `risk_score`, `risk_severity`, `created_by`, `created_at`, and pinned `model_versions` (`risk_engine v1.0.0`, `aasist_l v1.0`, `ecapa_tdnn v1.0`), and hashes the canonical `JSON.stringify` with SHA-256 hex. Only that hash plus the manifest go into `evidence_records` with `hash_algorithm: "SHA-256"`; no audio, embeddings, or PII beyond the caller label are stored. The function is fail-soft by design: any failed step returns early without throwing, so evidence problems can never break hangup or the API response.

### Q19: How does an evidence hash reach the blockchain, and what is stored on-chain?

`apps/web/lib/evidence.ts` calls `registerEvidenceOnChain(evidence_hash, evidence.id, new Date())` from `apps/web/lib/blockchain.ts`, a server-only module using `ethers` against the `VoiceIntegrityRegistry` contract. The client converts the hash and record id with `toBytes32`, then calls `registerEvidence(recordId, evidenceHash, createdAtUnix)` on Polygon Amoy (`BLOCKCHAIN_NETWORK="polygon-amoy"`, chain id 80002). On success it inserts a `confirmed` row in `blockchain_registrations` with contract address, tx hash, and block number, and flips the evidence row to `verified: true`. When env (`BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, `VOICE_REGISTRY_ADDRESS`) is missing or the RPC fails, it stores a `not_configured` or `failed` registration row instead, so the app keeps working offline.

### Q20: Where does each pipeline stage physically run?

Mic capture, 16kHz resampling, 3s framing, base64 packing, waveform rendering, and chunk display run in the browser (`apps/web/lib/realtime.ts`, `apps/web/components/LiveMonitoring.tsx`, `apps/web/components/LivePage.tsx`). Auth, room codes, org scoping, risk recomputation, database writes, alert fan-out, evidence hashing, and chain submission run on the Next.js server (`apps/web/app/api/*`, `apps/web/lib/evidence.ts`, `apps/web/lib/blockchain.ts`) backed by Supabase Postgres. DSP, AASIST inference, ECAPA embeddings, voiceprint matching, Python risk scoring, WebRTC signaling relay, and realtime chunk fan-out run in the FastAPI AI service (`services/ai-service/app/realtime/routes.py`, `services/ai-service/app/risk/engine.py`, `services/ai-service/app/main.py`). The chain itself (Polygon Amoy) only ever sees 32-byte hashes, never audio or biometrics.

## HARD - Deep design (Q21-Q30)

### Q21: How is backpressure handled when the AI service cannot keep up with 3s chunks?

The design sheds load at the producer rather than building an unbounded server queue. The browser only sends the next chunk when `bufferedSamples >= targetSamples` and `ws.readyState === OPEN`, so a stalled socket naturally pauses sends while audio keeps buffering in the local `Float32Array` window. On the server, `manager.handle_message` enqueues per session and `_process_chunks_loop` in `services/ai-service/app/realtime/routes.py` drains one chunk per iteration with `await asyncio.sleep(0.1)` idle waits, so slow inference delays `analysis_complete` instead of dropping ordering. The visible symptom is rising `latencyMs` (computed from the `sentAt` map in `apps/web/lib/realtime.ts`) and a growing chunk-table gap, not silent data loss. If overload persists, sessions hit TTL sweep or disconnect, which surfaces as `error` / `stopped` state in the UI rather than a frozen meter.

```
BROWSER (producer)              AI SERVICE (consumer)
+---------------+               +-------------------------------+
| mic 16kHz     |  audio_chunk  | session queue (per session id)|
| buffer 48k    |-- seq N ----->|  [N][N+1][N+2] ...            |
| send if OPEN  |<-- ack N -----| _process_chunks_loop          |
+---------------+               |  take 1 -> _analyze_chunk     |
        ^                       |  slow? loop lags, queue grows |
        | ws not OPEN: hold     +---------------+---------------+
        | buffer locally                        | analysis_complete N
        +---------------------------------------+
NOTE: backpressure signal = latencyMs rise + ack gap, not an error frame.
```

### Q22: What is the per-chunk latency budget, and where does time actually go?

The hard budget is the chunk interval itself: 3000ms of audio must be scored before the next chunk finishes accumulating, or results lag behind the live conversation. In practice the budget splits into browser framing (fixed 3000ms accumulation plus base64 encode of 96000 bytes), network transit (WebSocket text frame each way), Python decode plus DSP plus model inference in `_analyze_chunk`, and Next.js write-back (`POST /api/risk-events`) which runs outside the realtime loop. The UI measures only the realtime slice via `Date.now() - sentAt.get(seq)` and shows it as Chunk Latency in the session footer of `apps/web/components/LiveMonitoring.tsx`. Because persistence is fire-and-forget from `LivePage.tsx` (`void fetch(...)` with no await), a slow database never blocks the next `analysis_complete`. Operators should watch chunk latency, not wall-clock call length: sustained values near or above 3000ms mean the dashboard is describing the past.

```
TIMELINE FOR CHUNK N (3s budget)
|0ms        buffer fills 3000ms          |3000ms send
| encode (~10ms) | net up (~50-200ms) | server infer (~200-1500ms) |
| net down | render + onResult POST (async, off budget) |
|--- must complete before chunk N+1 finishes at 6000ms ---|
BROWSER: sentAt[N]=t0 ......... recv analysis_complete[N]=t1, latency=t1-t0
NEXT.JS: /api/risk-events runs in parallel, never gates t1.
```

### Q23: Is chunk delivery exactly-once, at-least-once, or at-most-once, and why is that the right trade?

Realtime delivery is at-most-once with at-least-once persistence semantics layered on top, and that split is deliberate. The socket path (`audio_chunk` to `analysis_complete` in `services/ai-service/app/realtime/routes.py`) has no retry: if the socket dies mid-chunk, that analysis is lost to the live view and the browser will not resend the same `sequence`. But the durable path treats each received `analysis_complete` as an independent `POST /api/risk-events` insert keyed by content rather than constrained to one row per sequence, so redelivered results would create two `analysis_results` rows instead of corrupting one. Sequence numbers are display and latency keys (`LiveChunk.sequence` in `apps/web/lib/realtime.ts`), not primary keys, so duplicates are visible but harmless. This favors liveness (never stall the call to repair one 3s window) while keeping the audit trail append-only.

```
BROWSER              SOCKET (at-most-once)        DB (append-only)
seq 7 --send--> X (lost, no retry)      nothing stored, meter skips 7
seq 8 --send--> analysis_complete[8] --POST--> analysis_results row seq 8
seq 8 --dup--> analysis_complete[8] --POST--> SECOND row seq 8 (visible dup)
RULE: sequences order the UI; only (call_id, result hash) defines truth.
TRADE: lose at most one live window, never block the call on repair.
```

### Q24: What happens when chunks arrive out of order or with gaps?

Ordering is preserved by construction on the AI-service side because each session has a single FIFO queue drained by one `_process_chunks_loop` coroutine, so results leave in the same order chunks arrived. Gaps still occur when a chunk is dropped, fails `_analyze_chunk`, or the socket blips; the browser then shows noncontiguous `sequence` values in the chunk table of `apps/web/components/LiveMonitoring.tsx` (for example 41 then 43). The client does not reorder or interpolate: `setChunks((prev) => [...prev.slice(-199), next])` appends arrival order, and `latest` is simply the last arrival. Downstream math tolerates this because the summary in `LivePage.tsx` averages over whatever arrived and `risk-events` writes each chunk independently. A gap therefore reads as missing evidence for that 3s window, not as a zero-risk window, which is the honest representation.

```
ARRIVAL ORDER (server FIFO)      BROWSER APPEND-ONLY LIST
send 41,42,43 -> queue [41,42,43]
process 41 -> complete 41 -------> chunks [..., 41], latest=41
process 42 -> ERROR, send_error -> chunks unchanged, error banner
process 43 -> complete 43 -------> chunks [..., 41, 43], latest=43
SUMMARY: avg over {41,43}; seq 42 = missing evidence, never filled with 0.
UI TABLE (newest first): 43, 41  (gap visible, not hidden).
```

### Q25: What are the reconnect and resume semantics for each socket?

There is no resume on either socket: reconnect always means a new logical stream, never a continuation. The realtime socket is bound to a `crypto.randomUUID()` session id created in `useRealtimeMic`, and the server validates it with `is_valid_uuid`, tracks TTL with `touch`/`sweep`, and kills stale sessions every 30s (`_sweep_stale_sessions` in `services/ai-service/app/realtime/routes.py`). Closing and pressing Start again mints a fresh session id with `seq` reset to 1, so the new run cannot be confused with the old one. The signaling socket in `apps/web/lib/call.ts` behaves the same way: `onclose` during `calling` or `active` flips to `ended` plus cleanup, and rejoining requires a new `joinRoom` with the 6-char code. In-progress audio at disconnect is discarded on both ends; history survives only as already-persisted `analysis_results` rows.

```
RECONNECT = NEW SESSION (no resume)
live --ws close--> state=stopped, seq frozen at N
user presses Start --> new UUID, seq=1, chunks=[] reset
server: old session TTL-swept after 30s sweep loop
call --signaling close--> status=ended + cleanup tracks/sockets
rejoin --> POST /api/call-rooms/join again, fresh offer/answer
PERSISTED ROWS: analysis_results for old call_id remain queryable.
```

### Q26: Why does Next.js recompute risk instead of trusting the AI-service score?

The AI-service score is an input signal, not an authority decision, because the browser-adjacent Python process is outside the org trust boundary. `POST /api/risk-events` in `apps/web/app/api/risk-events/route.ts` therefore rebuilds `RiskSignals` from the raw per-signal fields (`spoof_detection`, `human_pattern`, `speaker_verification`, `dsp_metrics`, `quality_flags`, `no_speech`) and runs the TypeScript `evaluateRisk` from `apps/web/lib/risk-engine.ts` before writing anything. This lets org policy (thresholds and weights owned via `apps/web/app/api/risk-policy/route.ts`) override model enthusiasm, pins the persisted score to auditable code and `model_versions`, and prevents a compromised or stale AI service from injecting arbitrary severities into `calls` and `alerts`. The AI-service number still drives the live meter for responsiveness, but only the recomputed number reaches Postgres. That split (fast hint vs. authoritative write) is the core trust design.

```
AI SERVICE (untrusted hint)        NEXT.JS (authority)
risk:{score:82,HIGH}  ----result---> rebuild signals from raw fields
spoof_human_spk_dsp ----fields----> evaluateRisk() with org policy
                                      | score 64 = HIGH? write it
                                      | audit risk.chunk_written
BROWSER METER: shows 82 immediately (responsiveness).
DATABASE: stores 64 (policy). Disagreement is expected and logged.
ATTACK CUT: forged score without matching raw fields cannot survive recompute.
```

### Q27: What is the failure cascade if the AI service dies mid-call?

Failure is contained in rings: realtime analysis stops, the call may survive briefly, and already-written data is never rolled back. The browser sees `ws.onerror` ("is the AI service running on :8000?") in `useRealtimeMic` and `Signaling server unreachable` in `useCall`, because both the realtime path (`/v1/realtime`) and signaling path (`/v1/webrtc`) terminate in `services/ai-service/app/main.py`. In-flight chunks never produce `analysis_complete`, so `onChunk` stops firing and no new `analysis_results` or `alerts` rows appear; the meter freezes on the last chunk. WebRTC peer audio can persist for a short while if ICE is already established, but hangup signaling and rejoin both fail. Recovery is manual: restart the AI service, re-create or rejoin the room, and start a new analysis session; the partial call history remains in Supabase and the summary covers only analyzed chunks.

```
AI SERVICE DOWN
+------------------+     +-----------------+     +--------------+
| BROWSER          |     | NEXT.JS+SUPABASE|     | CHAIN        |
| realtime: error  |     | old rows safe   |     | untouched    |
| signaling: failed|     | new writes stop |     | no evidence  |
| webrtc: audio    |     | summary partial |     | yet minted   |
| may linger, then |     | hangup PATCH    |     |              |
| ended+cleanup    |     | may 500         |     |              |
+------------------+     +-----------------+     +--------------+
RECOVERY: restart :8000 -> create/join room -> new session id -> fresh seq 1.
```

### Q28: How do rolling averages and peak-risk interact without hiding spikes?

The UI deliberately shows both: `avgRisk` smooths, while `maxRisk` and `HIGH+ chunk count` preserve spikes. `useRealtimeMic` in `apps/web/lib/realtime.ts` computes `avgRisk` as the mean over all retained chunks (up to 200), which is stable enough for the "avg risk" label next to the live indicator. `LivePage.tsx` adds `maxRisk` (`Math.max(...risks)`) and `highChunks` (count of `>= 51`) for the post-call summary, and the server keeps the worst score on the `calls` row (`Math.max(call.risk_score, score)` in `apps/web/app/api/risk-events/route.ts`). A single terrifying chunk therefore cannot be averaged away: it survives as peak risk, worst severity, an alert row, and an incremented `alert_count`. Reviewers get the trend and the worst moment side by side, which matches the "model score, not verdict" framing in the threat banner.

```
CHUNK SCORES:  [12, 18, 88, 20, 15]
avgRisk  = 30.6 -> shows 31 (calm trend)
maxRisk  = 88   -> peak preserved
highChunks = 1  -> density preserved
calls row: risk_score=88 HIGH, alert_count+1, alerts row opened
UI: meter flashes 88 live, banner trips at >=51, summary shows both.
READING: average answers "how was the call", peak answers "what needs review".
```

### Q29: Where can data leak across orgs, and what stops it?

Every durable write is org-scoped at the API boundary, and the two sockets carry independent auth. `requireOrg` in `POST /api/risk-events`, `GET/PATCH /api/risk-policy`, `POST /api/call-rooms`, and `POST /api/call-rooms/join` binds each request to one `orgId`, and `risk-events` additionally re-checks that the target call belongs to that org before writing. Realtime and signaling sockets present the short-lived `POST /api/ws-token` JWT as `?token=`, verified by `verify_ws_token` in `services/ai-service/app/core/ws_auth.py` with origin allowlist and per-IP caps enforced in `services/ai-service/app/realtime/routes.py`. Supabase reads go through the anon-key path with RLS (see the `useSupabaseTable` comment referencing migration 003), while evidence and chain writes use the service client only inside server code (`apps/web/lib/evidence.ts`, `apps/web/lib/blockchain.ts`). The remaining risk is misconfigured RLS or a leaked service key, which is why `service-role` keys must never enter client bundles.

```
BROWSER (anon key + RLS)     NEXT.JS (requireOrg)        AI SERVICE (JWT+origin)
mic chunks --token---------> verify_ws_token, origin OK
POST risk-events --session-> requireOrg -> call.org == ctx.org?
                             | match: write scoped rows + audit
                             | mismatch: 404, no write
SUPABASE: RLS denies cross-org SELECT even with a valid anon key.
BLOCKCHAIN: only hash bytes32 leaves the org boundary, never audio/PII.
```

### Q30: What is retained, what is ephemeral, and how does privacy survive the pipeline?

Raw audio is ephemeral everywhere by design: the browser holds at most one 3s `Float32Array` plus base64 text in flight, the AI service decodes to a numpy array inside `_analyze_chunk` and drops it on return, and nothing in `analysis_results`, `evidence_records`, or chain payloads stores samples. What persists in Postgres is derived data only: per-chunk scores and DSP facts (`analysis_results`), rolled-up call risk (`calls`), alert records, the evidence manifest plus SHA-256 hash (`evidence_records`), and tx metadata (`blockchain_registrations`). The chain sees only `bytes32` hash plus record id via `registerEvidence` in `apps/web/lib/blockchain.ts`, so verification (`verifyEvidence`) works without revealing voice or content. Mic access itself stays user-gated through `getUserMedia` with visible LIVE / waiting / denied states, and `finalizeCallEvidence` plus audit rows give a retention story reviewers can actually query.

```
MIC (ephemeral) -> WS TEXT (ephemeral) -> NUMPY (ephemeral, fn scope)
  3s buffer, base64 frame, decoded samples: all dropped after scoring
PERSISTED (Supabase): analysis_results, calls roll-up, alerts, evidence manifest+hash
ANCHORED (Polygon Amoy): bytes32 hash + record id + timestamp only
PRIVACY INVARIANTS:
  1. raw audio never touches Postgres or chain.
  2. embeddings never leave the AI-service process.
  3. chain payload is reproducible from manifest, reveals nothing alone.
  4. mic state always visible (live/waiting/denied), never silent.
```

## Rapid-fire one-liners

| # | Question | Answer |
|---|----------|--------|
| 1 | Capture sample rate? | 16kHz mono via `AudioContext({ sampleRate: 16000 })` in `apps/web/lib/realtime.ts`. |
| 2 | Chunk size? | 3s (48000 samples) framed by `targetSamples` in `apps/web/lib/realtime.ts`. |
| 3 | Chunk wire format? | Base64 `pcm_s16le` `audio_chunk` with `sequence` over `/v1/realtime/{sessionId}`. |
| 4 | Who is analyzed on a call? | The joiner: host analyzes `remoteStream`, never its own mic (`LivePage.tsx`, `call.ts`). |
| 5 | Room code format? | 6-char `[A-Z0-9]` from `POST /api/call-rooms`, resolved by `POST /api/call-rooms/join`. |
| 6 | Signaling path? | `ws(s):///v1/webrtc/{callId}` with offer, answer, and ICE relay (`call.ts`). |
| 7 | Silence handling? | `no_speech` gate caps risk at 8 so quiet chunks stay LOW (`engine.py`). |
| 8 | Risk bands? | LOW 0-25, MEDIUM 26-50, HIGH 51-75, CRITICAL 76-100 (`engine.py`, `risk-events`). |
| 9 | Who writes the dashboard truth? | `POST /api/risk-events` recomputes with `evaluateRisk` then writes Postgres. |
| 10 | What reaches the chain? | Only the SHA-256 manifest hash via `VoiceIntegrityRegistry` on Polygon Amoy (`blockchain.ts`). |
