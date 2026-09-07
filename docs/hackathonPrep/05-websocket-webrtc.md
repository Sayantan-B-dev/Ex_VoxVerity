# WebSocket + WebRTC: Realtime Audio and Signaling

This guide covers the two sockets in VoxVerity: the analysis socket and the call signaling socket.
Every answer below is grounded in the six source files listed in Q1, not in generic WebSocket theory.

## Q1: Why does VoxVerity use WebSockets instead of REST for realtime audio?
**A:** REST is request/response, so the browser would have to POST every 3 seconds and poll for results, which adds latency and HTTP overhead per chunk. The analysis socket at `/v1/realtime/{session_id}` in `services/ai-service/app/realtime/routes.py` keeps one long-lived TCP connection open and pushes `analysis_complete` plus `risk_update` the moment `_process_chunks_loop` finishes a chunk. The queue model in `services/ai-service/app/realtime/manager.py` (with `ack` per chunk and `queue_size`) only works well over a persistent bidirectional channel. REST is still used for everything else (room create/join, token minting, presence heartbeat). So the rule is simple: REST for control-plane actions, WebSocket for the hot audio path. Judges like the one-liner that REST moves documents while sockets move streams.

## Q2: What are the two sockets and what job does each one do?
**A:** Socket one is the analysis socket `WS /v1/realtime/{session_id}`, implemented by `services/ai-service/app/realtime/routes.py` plus `services/ai-service/app/realtime/manager.py`, and its job is browser-to-server audio streaming with per-chunk verdicts. Socket two is the signaling socket `WS /v1/webrtc/{room_id}`, implemented by `services/ai-service/app/realtime/signaling.py`, and its job is browser-to-browser call setup by relaying SDP offers/answers and ICE candidates. Crucially, signaling never carries audio bytes; the actual voice travels peer-to-peer over `RTCPeerConnection` created in `apps/web/lib/call.ts`. The frontend builds both URLs the same way, replacing `http` with `ws` and appending `?token=`. If the AI service on `:8000` is down, both sockets fail with explicit error states in the UI.

## Q3: What is the `/v1/realtime` protocol from the browser's first byte to the first verdict?
**A:** The client opens `aiRealtimeWsUrl(id, wsToken)` from `apps/web/lib/ai-service.ts`, where `id` is a fresh `crypto.randomUUID()` made in `apps/web/lib/realtime.ts`. On `ws.onopen` the client sends `hello` then `start_session` with `source` and `model` (see `apps/web/lib/realtime.ts` lines around `ws.onopen`). The server path in `services/ai-service/app/realtime/routes.py` validates UUID, origin, per-IP cap, and token before `manager.connect()` replies with a `hello` ack. `manager.handle_message` in `services/ai-service/app/realtime/manager.py` then flips the session from `IDLE` to `ACTIVE` on `start_session` and answers `session_started`. Only after that does the server accept `audio_chunk` messages; anything sent while `IDLE` gets `server_error: Session not active`.

## Q4: What are the exact client-to-server message types on the analysis socket?
**A:** There are six, all handled in `WebSocketManager.handle_message` in `services/ai-service/app/realtime/manager.py`: `hello`, `start_session`, `set_model`, `audio_chunk`, `stop_session`, and `ping`. The docstring in `services/ai-service/app/realtime/routes.py` lists five (it omits `set_model`), so the manager is the authoritative list. `hello` echoes session state, `start_session` sets `source` and `model` and activates the session, and `set_model` switches between `aasist_voiceprint`, `aasist`, and `heuristic` mid-session with an invalid value falling back to `aasist_voiceprint`. `audio_chunk` carries `sequence`, `audio_b64`, and optional `captured_at`/`duration_ms`, while `stop_session` moves the session to `STOPPED`. Unknown types get `server_error: Unknown message type`.

## Q5: What are the exact server-to-client message types on the analysis socket?
**A:** The server emits `hello`, `session_started`, `model_set`, `ack`, `analysis_complete`, `risk_update`, `alert_created`, `session_stopped`, `server_error`, and `pong`, per `services/ai-service/app/realtime/manager.py`. Each `audio_chunk` gets an `ack` with `sequence` and `queue_size`, which `apps/web/lib/realtime.ts` uses to measure latency via its `sentAt` map. Each processed chunk produces `analysis_complete` carrying the full `result` dict plus a separate lightweight `risk_update` with `score`, `severity`, and `recommendation` for easy UI binding. `alert_created` only fires when `check_and_create_alert` in `services/ai-service/app/realtime/routes.py` crosses a threshold. `pong` answers `ping` with a server timestamp, and every failure path uses `server_error` with a human-readable `message`.

## Q6: How does 3-second chunk framing work in the browser?
**A:** `useRealtimeMic` in `apps/web/lib/realtime.ts` creates an `AudioContext` pinned to 16000 Hz and a `ScriptProcessorNode(4096, 1, 1)` tapped from either the mic or an external peer stream. It computes `targetSamples = 16000 * ((chunkMs ?? 3000) / 1000)`, which is 48000 samples for the default 3 seconds, and accumulates `Float32Array` slices until the buffer is full. Only when the buffer is full AND `ws.readyState === WebSocket.OPEN` does it serialize and send, so backpressure on a closed socket drops the window instead of throwing. The sequence counter `refs.current.seq` increments per chunk and `sentAt.set(seq, Date.now())` records the send time for latency math. This fixed-cadence design matches `CHUNK_DURATION_MS = 3000` on the server in `services/ai-service/app/realtime/manager.py`.

## Q7: What exactly is inside an `audio_chunk`, and why base64 PCM?
**A:** Each chunk is JSON: `{type: "audio_chunk", sequence, audio_b64, encoding: "pcm_s16le", sample_rate: 16000}`, built in `apps/web/lib/realtime.ts` with `floatToPcm16Base64(out)` from `apps/web/lib/ai-service.ts`. That helper clamps each float to [-1, 1], scales to int16, then `btoa`s the raw bytes in 0x8000-byte slices. Base64 is used because the socket speaks JSON text frames (`receive_text` in `services/ai-service/app/realtime/routes.py`), so binary must ride inside a string field. The server decodes with `base64.b64decode` then `struct.unpack("<...h")` for `pcm_s16le` in `services/ai-service/app/realtime/routes.py`, falling back to WAV decode for other encodings. Empty or undecodable payloads return `{"error": ...}` instead of crashing the processing loop.

## Q8: What is the signaling room lifecycle in `signaling.py`?
**A:** The `Room` class in `services/ai-service/app/realtime/signaling.py` starts `IDLE`, moves to `RINGING` when exactly one peer (caller or receiver slot) has joined, moves to `ACTIVE` when both slots are filled, and moves to `ENDED` when a `hangup` arrives or both peers disconnect. Transitions happen inside `add_peer` and the `hangup`/disconnect handlers, and every join or SDP relay calls `get_room_ttl().touch(room_id)` to keep the room alive. There are no `ring`, `accept`, `reject`, or `busy` wire messages on this socket despite what the question brief suggests; contention is handled by rejecting a second claim on an occupied slot with `Room already has a caller/receiver`. The server notifies the remaining peer with `peer_left` on disconnect and `hangup` on explicit hangup. When both slots empty, the room is popped from the `rooms` dict and its TTL entry removed.

## Q9: How do 6-character room codes work, and how do they relate to room IDs?
**A:** The 6-character code is the human-shareable secret and the `call.id` UUID is the actual signaling room ID, per `apps/web/app/api/call-rooms/route.ts` and `apps/web/lib/call.ts`. `generateRoomCode()` draws 6 characters with `crypto.randomBytes` from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, deliberately excluding ambiguous `0/O/1/I/L`, and `reserveRoomCode` retries up to 8 times against the `calls` table for uniqueness. `createRoom()` in `apps/web/lib/call.ts` POSTs to `/api/call-rooms` and stores both `call_id` and `room_code`, then opens signaling on the `call_id`. `joinRoom(code)` normalizes with `trim().toUpperCase()`, POSTs to `/api/call-rooms/join`, which enforces `/^[A-Z0-9]{6}$/` and only returns rooms with `status: active`. The code is the access control: anyone signed in with a valid code can join, even across organizations.

## Q10: What is the origin allowlist exact-match gotcha?
**A:** `OriginValidator` in `services/ai-service/app/core/ws_auth.py` defaults to exactly four strings: `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3001`, and `http://127.0.0.1:3001`. The check is `origin in self.allowed`, which is a strict string equality, so `http://localhost:3000/` with a trailing slash, `https://localhost:3000`, or port `3002` all fail. A missing `Origin` header (curl, server-to-server) returns `True` because non-browser clients do not send it. Both `routes.py` and `signaling.py` accept the socket first, send `server_error`/`error` with `Origin not allowed`, then close with code 4003. In production the set must be reconfigured via `configure_ws_security(allowed_origins=...)` or every deployed frontend domain gets rejected.

## Q11: How does the HMAC token flow work end to end?
**A:** The browser calls `POST /api/ws-token` in `apps/web/app/api/ws-token/route.ts`, which requires an auth session and signs `{sub: userId}` with `WS_TOKEN_SECRET` using `jose` `SignJWT` HS256. Both `apps/web/lib/call.ts` (`openSignaling`) and `apps/web/lib/realtime.ts` (`start`) fetch this token and append `?token=` to the socket URL via `signalingUrl` and `aiRealtimeWsUrl`. The AI service verifies with `verify_ws_token` in `services/ai-service/app/core/ws_auth.py` using the same secret: split into three parts, recompute HMAC-SHA256, `hmac.compare_digest`, parse the payload, and reject if `time.time() > exp`. A bad or expired token gets an accepted-then-closed socket with `Invalid or expired token` and close code 4001. The two secrets must match exactly or every browser connection is rejected.

## Q12: Why does the token expire after 60 seconds, and what happens without one?
**A:** `setExpirationTime("60s")` in `apps/web/app/api/ws-token/route.ts` keeps the token a short-lived handshake credential rather than a session cookie, limiting replay value if a URL leaks into logs. The server treats expiry as failure in `verify_ws_token` (`time.time() > exp` returns `None`), so a token minted a minute ago is already dead for new connections. If `WS_TOKEN_SECRET` is unset, the route returns 503 and the frontend connects with no token at all, which both `routes.py` and `signaling.py` explicitly allow as dev-mode fallback for non-browser clients. That fallback is convenient for local demos but must never be relied on in production. Existing connections are unaffected by token expiry because the token is checked once at upgrade time.

## Q13: What are the per-IP connection caps and how are they enforced?
**A:** `WsConnectionLimiter` in `services/ai-service/app/core/ws_auth.py` defaults to `max_per_ip = 5` and counts active sockets per `websocket.client.host` in a plain dict. Both `routes.py` and `signaling.py` call `limiter.try_acquire(client_ip)` before accepting real traffic, and on failure they accept, send `Too many connections`, and close with code 4008. Every exit path calls `limiter.release(client_ip)` in a `finally` block so a crashed handler cannot leak a slot. The cap covers both socket types together since they share the module-level singleton from `get_connection_limiter()`. Five is enough for a two-browser demo on one machine (analysis plus signaling each) but a load test from one NAT IP will hit it fast.

## Q14: What are the room and session TTLs, and what sweeps them?
**A:** `get_room_ttl()` is 600 seconds (10 minutes) and `get_session_ttl()` is 300 seconds (5 minutes), defined as module singletons in `services/ai-service/app/core/ws_auth.py` and reconfigurable via `configure_ws_security`. Activity refreshes the clock: `routes.py` touches the session TTL on connect and every received text frame, and `signaling.py` touches the room TTL on join plus every `offer`/`answer`/`ice_candidate` relay. Background tasks `_sweep_stale_sessions` and `_sweep_stale_rooms` wake every 30 seconds, call `TTLTracker.sweep`, then close or notify the leftovers (session close code 4001 `Session expired`, room `error: Room expired due to inactivity`). Disconnect handlers call `remove()` so clean exits do not linger. A silent open socket with no messages still dies within TTL plus up to 30 seconds of sweep delay.

## Q15: What do close codes 4000, 4001, 4003, and 4008 mean?
**A:** All four are application codes sent after an accept-then-close pattern in both `routes.py` and `signaling.py`, because FastAPI needs the accept before it can send a JSON error and a close frame. 4000 means the path ID failed `is_valid_uuid`, which enforces a strict UUIDv4 regex in `services/ai-service/app/core/ws_auth.py`. 4001 means authentication or liveness failure: bad/expired `?token=` at connect time, or a swept idle session (`Session expired`). 4003 means the browser `Origin` header was present but not in the allowlist. 4008 means the per-IP connection cap was hit (`Too many connections` / `Rate limited`).

## Q16: What does the receiver's browser do differently from the caller's browser?
**A:** The naming is confusing, so follow `apps/web/lib/call.ts` exactly: `createRoom()` (the host who will monitor) opens signaling with role `"caller"`, and `joinRoom()` (the guest whose voice is checked) opens signaling with role `"receiver"`. The comment block in `call.ts` states the host's dashboard analyzes the other person's voice while the host's own mic is only for call audio. Whichever side receives `peer_joined` or `call_started` sets status to `active` and calls `startRtc(role)`, but only role `"caller"` creates the SDP offer; the `"receiver"` side answers via `handleOffer`. The monitoring side then feeds the WebRTC remote stream into `useRealtimeMic({stream: remoteStream, requireStream: true})` instead of its own mic. Mute via `toggleMute` just flips `track.enabled` locally on either side.

## Q17: How does heartbeat and presence actually work in this codebase?
**A:** There are three separate mechanisms and they must not be conflated. One, the analysis socket supports `ping`/`pong`: the client may send `{type: "ping"}` and `manager._handle_ping` replies `{type: "pong", timestamp}` per `services/ai-service/app/realtime/manager.py`, but the frontend never sends it on a timer. Two, liveness on both sockets is implicit: every received frame calls `TTLTracker.touch`, so message flow itself is the heartbeat and silence leads to sweep. Three, user presence is a completely different REST system: `usePresence` in `apps/web/lib/presence.ts` POSTs `/api/presence` every 15 seconds, the server prunes rows with `last_seen` older than 45 seconds, and the list syncs over Supabase Realtime on the `presence` table. In-call status display comes from that table, not from the AI service sockets.

## Q18: What happens when the caller hangs up, loses network, or sends garbage?
**A:** Explicit hangup sends `{type: "hangup"}`, which `signaling.py` relays to the peer as `hangup`, sets the room state to `ENDED`, while `call.ts` also PATCHes `/api/call-rooms` to mark the call `completed` and finalize evidence. Network loss raises `WebSocketDisconnect`, which hits the `finally` block: the peer slot is removed, the remaining peer gets `peer_left`, and an empty room is deleted. Garbage input is handled without crashing: non-JSON text gets `error: Invalid JSON`, unknown types get `error: Unknown message type`, bad roles get `Invalid role`, and non-UUID `peer_id` gets `Invalid peer ID`. On the analysis side the equivalents are `Invalid JSON`, `Unknown message type`, and per-chunk errors like `Session not active` or `Queue full` in `services/ai-service/app/realtime/manager.py`.

## Q19: How does the frontend surface socket failures to the user?
**A:** Both hooks keep explicit status machines instead of silent retries. `useRealtimeMic` in `apps/web/lib/realtime.ts` moves `idle` to `connecting` to `live`, with `error` carrying messages like `Realtime WebSocket failed - is the AI service running on :8000?` and `onclose` mapping a live socket to `stopped`. `useCall` in `apps/web/lib/call.ts` moves `idle` to `calling` to `active` to `ended`/`failed`, where `onerror` reports `Signaling server unreachable - is the AI service running on :8000?` and server `error` frames set `failed` plus cleanup. `cleanup()` closes the socket and peer connection and stops local mic tracks, while `stop()` in `realtime.ts` deliberately never stops external peer-stream tracks. Neither hook auto-reconnects, so the UI must offer an explicit retry button. That no-magic behavior is actually a judging plus: failures are visible, not hidden behind a spinner.

## Q20: Where does STUN fit, and what ICE server does the code use?
**A:** `RTC_CONFIG` in `apps/web/lib/call.ts` sets exactly one ICE server: `{urls: "stun:stun.l.google.com:19302"}`, with no TURN server configured. STUN lets each browser discover its public reflexive candidate so the SDP offer/answer exchange relayed through `signaling.py` can attempt a direct peer-to-peer media path. ICE candidates trickle over the signaling socket as `{type: "ice_candidate", candidate}` via `pc.onicecandidate`, and the remote side calls `addIceCandidate` with failures swallowed. Because there is no TURN, symmetric NATs or locked-down networks can fail to establish media even while signaling looks healthy. For a hackathon demo this means both laptops should be on the same permissive Wi-Fi or the media leg may never connect.

## Q21: Why are signaling and media separate channels, and what breaks if you merge them?
**A:** Signaling carries kilobytes of SDP and ICE JSON through the FastAPI server in `services/ai-service/app/realtime/signaling.py`, while media carries a continuous 16 kHz audio flow directly between browsers via `RTCPeerConnection` in `apps/web/lib/call.ts`. The server relay path (`_send(other, data)`) is cheap because it forwards tiny text frames, whereas proxying Opus audio through Python would add latency, CPU cost, and a scaling bottleneck. Separation also matches trust boundaries: the AI service attests handshake relay and analysis, but the voice itself never has to be stored server-side for the call to work. The monitoring tap is a third leg: the host browser forks the already-arriving remote stream into the analysis socket with `useRealtimeMic({stream: remoteStream})`. Merging media into the signaling socket would couple call survival to Python event-loop health and destroy the peer-to-peer latency budget.

```
Browser A (host)                    AI service :8000                  Browser B (joiner)
     |                              signaling WS                        |
     |--- join(caller) -------------> Room(call.id)                      |
     |<-- joined(RINGING) ------------ |                                 |
     |                                   |<---------- join(receiver) ---|
     |<-- peer_joined ----------------- | ------------ joined(ACTIVE)->|
     |<-- call_started ---------------- | ------------ call_started ->|
     | ===== SDP offer/answer + ICE relayed as tiny JSON frames ====== |
     |<================ WebRTC media (Opus, peer-to-peer) ============>|
     |<-- remote MediaStream ---(local fork)--> analysis WS /v1/realtime|
     |--- audio_chunk x N ----------> analysis_complete/risk_update --->|
```

## Q22: What NAT and STUN considerations apply to this browser-to-browser audio?
**A:** The only NAT traversal aid in `apps/web/lib/call.ts` is Google public STUN, which solves full-cone and restricted-cone NATs by revealing the public mapping but cannot relay through symmetric NATs or UDP-blocking firewalls. The offer/answer plus trickled `ice_candidate` messages relayed by `services/ai-service/app/realtime/signaling.py` negotiate host, srflx, and (missing) relay candidates, and without a TURN server there is no relay candidate to fall back to. Same-machine two-browser testing works because host candidates succeed, and same-Wi-Fi demos usually work via srflx or host paths. Judge-venue networks with client isolation or symmetric NAT will show the classic symptom: signaling reaches `ACTIVE` and `call_started` fires, yet `pc.ontrack` never yields audio. The fix is to add a TURN server to `RTC_CONFIG` and pass its credentials without touching the signaling protocol.

```
Browser A (venue NAT)            STUN (google)              Browser B (phone hotspot)
  | -- binding request ---------> |                                |
  | <-- srflx candidate:port ---- |                                |
  | -- offer(+srflx A) --[signaling.py relay]--> B                 |
  | <-- answer(+srflx B) -[signaling.py relay]-- B                 |
  | -- ICE checks A<->B .......... connectivity checks ..........>|
  | == success: host/srflx path opens, Opus flows peer-to-peer == |
  | == symmetric NAT both sides + no TURN: checks fail, silence ==|
```

## Q23: What exactly happens step by step on a network drop mid-call?
**A:** The media leg and the two sockets fail independently, which is why the UX has three separate states. First the `RTCPeerConnection` ICE layer notices missing consent responses while the signaling socket may still look open, so remote audio freezes before any UI state changes. Then the signaling socket in `services/ai-service/app/realtime/signaling.py` raises `WebSocketDisconnect`, runs `room.remove_peer`, notifies the survivor with `peer_left`, and `call.ts` `onclose` flips `calling`/`active` to `ended` plus `cleanup()` closing the peer connection and stopping local tracks. Separately the analysis socket in `services/ai-service/app/realtime/routes.py` disconnects, `manager.disconnect` marks the session `STOPPED`, and `realtime.ts` `onclose` flips `live` to `stopped`. The `calls` row stays `active` until someone calls `hangup()` which PATCHes `/api/call-rooms`, so a drop without hangup leaves a joinable room until the 10-minute room TTL sweep deletes it.

```
t0  media flowing, signaling OPEN, analysis OPEN (chunks every 3s)
t1  network drops: Opus/RTP stops, ICE consent fails (audio freezes)
t2  signaling WS times out -> WebSocketDisconnect -> peer_left -> UI ended
t3  analysis WS times out -> manager.disconnect -> session STOPPED -> UI stopped
t4  calls row still active (no PATCH happened); room TTL keeps ticking
t5  within 10 min + 30 s sweep: room swept, rejoin with code returns 404
```

## Q24: What is the reconnect token-refresh race, and how does this code handle it?
**A:** Tokens live 60 seconds from `POST /api/ws-token` in `apps/web/app/api/ws-token/route.ts`, so any reconnect after a minute needs a fresh token, and neither `apps/web/lib/call.ts` nor `apps/web/lib/realtime.ts` caches the old one. The correct order already coded in both `openSignaling` and `start` is fetch-then-connect: `await fetch("/api/ws-token")` first, then `new WebSocket(url(token))`, with a catch that falls back to a tokenless URL in dev. The race appears when a retry fires with a stale stored token instead of refetching, or when two parallel retries each fetch and the slower one wins with an older-but-still-valid token while the faster connection already occupies the caller slot and the loser gets `Room already has a caller`. Because there is no auto-reconnect loop in either hook, the app sidesteps thundering-herd retries entirely: the user presses retry, exactly one fetch-then-connect runs. A future auto-reconnect must serialize attempts, refetch per attempt, and treat close 4001 as refresh-and-retry-once while 4003 and 4008 must not retry.

```
attempt N:  fetch /api/ws-token --(60 s TTL)--> token_n
            new WebSocket(...?token=token_n) --> 4001 Auth failed (expired)
            |
            +--> CORRECT: fetch token_n+1, connect once, joined OK
            +--> RACE BUG: two parallel retries, loser gets Room already
                   has a caller, winner holds the slot
```

## Q25: What backpressure behavior exists when the AI service is slower than chunk cadence?
**A:** The browser sends open-loop every 3 seconds with no congestion window: `proc.onaudioprocess` in `apps/web/lib/realtime.ts` fires whenever the buffer fills and the socket is open, regardless of how many `ack`s are outstanding. The server absorbs bursts in `RealtimeSession.chunk_queue` in `services/ai-service/app/realtime/manager.py` up to `MAX_QUEUE_SIZE = 50`, which at 3 seconds per chunk is about 150 seconds of backlog, and `add_chunk` returns `False` past that, flipping the session to `DEGRADED` and replying `Queue full, session degraded`. The drain side is `_process_chunks_loop` in `services/ai-service/app/realtime/routes.py`, which pops one chunk, awaits `_analyze_chunk`, sends `analysis_complete` plus `risk_update`, and sleeps 0.1 s when empty. Recovery is built in: `get_next_chunk` flips `DEGRADED` back to `ACTIVE` once the queue drains below 25. The gap is that the client never reads `queue_size` from `ack` to slow down, so sustained overload cycles between DEGRADED and ACTIVE instead of stabilizing.

```
browser (every 3 s)        server queue (cap 50)        analyzer loop
  chunk seq N  --send-->   [N ... N+49] (150 s audio)
  chunk N+1    --send-->   [FULL] -> DEGRADED + Queue full error
                               | pop one, await _analyze_chunk
                               | send analysis_complete + risk_update
  client ignores queue_size <-- ack(queue_size=48)  (no slowdown)
                               | drains below 25 -> ACTIVE (recovered)
```

## Q26: How would you scale these WebSockets beyond one Python process?
**A:** Today both sockets are single-process in-memory: `rooms` is a module dict in `services/ai-service/app/realtime/signaling.py` and the manager singleton holds `connections` and `sessions` in `services/ai-service/app/realtime/manager.py`. Two browsers landing on different workers would never share a room, and TTL sweeps in each process would disagree. The minimal fix is sticky sessions at the load balancer keyed on the path ID (`session_id` / `room_id`) so both peers of a call always hit the same worker, which requires zero code changes. The durable fix is moving `rooms`, `sessions`, and TTL stamps into Redis with pub/sub fan-out for `offer`/`answer`/`ice_candidate` and `analysis_complete`, keeping the per-connection socket on the edge worker. `WsConnectionLimiter` would also need Redis counters since per-process dicts undercount global load. Keep the wire protocol identical so `apps/web/lib/call.ts` and `apps/web/lib/realtime.ts` need no changes.

```
sticky (minimal):   LB --[room_id hash]--> worker 2 holds Room dict
                    both peers pinned to worker 2, relay is local _send
scaled (durable):   worker 1 <--Redis pub/sub--> worker 2
                    rooms/sessions/TTL/limiter counters in Redis
                    signaling relay = publish(room_id, frame), subscribe
```

## Q27: What is the threat model split between origin checks and token auth?
**A:** The origin check in `services/ai-service/app/core/ws_auth.py` answers whether the page that opened the socket is one of ours, while the HMAC token from `apps/web/app/api/ws-token/route.ts` answers which signed-in user opened it. Origin is a weak signal: browsers send it and cannot be trusted from curl or a custom client, which is why `is_allowed(None)` returns `True` and the code comment says the API key is the real credential there. Concretely, origin blocks drive-by exfiltration from an attacker's website using the victim's browser, and exact-match prevents `evil-localhost` prefix tricks, but it never identifies the user. The token does that with a 60-second HS256 credential bound to `sub: userId`, verified by `verify_ws_token` with `compare_digest`. Defense in depth here is origin for casual cross-site abuse, token for identity, per-IP cap for connection floods, and UUID path IDs so room and session IDs are unguessable.

```
attacker.com page --Origin: attacker.com--> AI service: 4003 rejected
                                                            (even with
                                                          stolen token)
victim browser --Origin: localhost:3000 + ?token=sub-victim--> allowed,
                                                      billed as victim
curl (no Origin) --no token--> dev fallback open; --bad token--> 4001
```

## Q28: How does clock skew affect the 60-second token window?
**A:** Three clocks participate: the Next.js server minting `exp = iat + 60` in `apps/web/app/api/ws-token/route.ts`, the AI service checking `time.time() > exp` in `verify_ws_token`, and the browser that merely ferries the string. If the AI service clock runs ahead of the web server clock, a fresh token can arrive already expired and every connection closes with 4001 even though nothing else is wrong. If it runs behind, expired tokens stay usable past their nominal life, widening the replay window. The 60-second lifetime makes even 30 seconds of NTP drift material, unlike a 1-hour session cookie where the same skew is noise. Operationally this means both containers must run NTP sync, and the telltale for skew versus a wrong-secret misconfiguration is that wrong-secret fails 100 percent immediately while skew fails intermittently near the expiry boundary. A small `leeway` tolerance on `exp` would harden this without changing the protocol.

```
web server clock:  mint iat=100, exp=160 ----token---->
AI clock ahead (+90):  now=170 > 160 -> 4001 (fresh token dead)
AI clock synced:       now=110 < 160 -> payload OK, joined
AI clock behind (-90): now=020 < 160 -> OK, but stale token at
                       real t=200 still accepted (replay window)
```

## Q29: What message ordering and delivery guarantees do these sockets actually give?
**A:** Each individual TCP-backed WebSocket preserves FIFO order as long as it stays open, which is why per-chunk `sequence` numbers, `ack(sequence)`, and `sentAt` latency math in `apps/web/lib/realtime.ts` line up in practice. But nothing above TCP is guaranteed: `manager._send` and `signaling._send` both bail silently when `client_state != CONNECTED`, so a frame to a closing peer is dropped without a dead-letter queue. Analysis results can complete out of order relative to `ack`s because `_process_chunks_loop` is serial per session today yet `analysis_complete` and the separate `risk_update` are two sends that a reconnect can split. SDP ordering matters more: an `answer` arriving before its `offer` was relayed (or `ice_candidate` before `setRemoteDescription`) is handled only because `call.ts` awaits `startRtc` and `addIceCandidate` failures are swallowed with `.catch(() => undefined)`. The honest contract is at-most-once ordered delivery per open socket, with `sequence` as the idempotency key the client must use to reorder or dedupe.

```
open socket:  send seq 5, 6, 7 ---> recv 5, 6, 7 (FIFO over TCP)
closing peer: _send checks CONNECTED, drops silently (at-most-once)
analysis:     ack(6) may pass analysis_complete(5) across reconnects
signaling:    offer --must precede--> answer; early ICE is swallowed
client rule:  key UI updates by result.sequence, ignore duplicates
```

## Q30: How would you demo this live to judges without it breaking?
**A:** Rehearse the failure-free path and narrate the architecture while it runs: prebuild both containers, set the same `WS_TOKEN_SECRET` in `apps/web/.env.local` and `services/ai-service/.env`, and put both demo browsers on the same permissive Wi-Fi with the production origin added to the allowlist so 4001 and 4003 never appear on stage. Mint the room before the talk with `createRoom`, keep the 6-character code on a slide, and join from the second laptop so the audience sees `RINGING` to `ACTIVE` plus `call_started` transition into live 3-second `analysis_complete` cards. Hold a backup: one laptop running both browsers with different `micDeviceId` values (the `useCall` option exists exactly for same-machine testing) plus a pre-recorded chunk stream if venue NAT kills peer-to-peer media. Talk over the 3-second cadence gap by pointing at the `ack` latency readout and the waveform, and never live-edit env files mid-demo since secret or origin changes only take effect on restart.

```
T-30 min:  build web + ai-service, verify /health, /version
T-15 min:  open signalingUrl + aiRealtimeWsUrl manually, confirm
           joined + session_started + first analysis_complete
T-5 min:   createRoom on host, screenshot 6-char code onto slide
T+0 live:  host calling ---- code ----> guest joins --> ACTIVE
           speak 10 s --> 3 x analysis_complete cards appear
fallback:  same-machine two browsers (micDeviceId A/B) or replay
           capture; never edit WS_TOKEN_SECRET or origins on stage
```

## Rapid-fire one-liners

| # | Question | One-line answer |
|---|---|---|
| 1 | Which socket carries audio? | `/v1/realtime/{session_id}` streams base64 PCM chunks to the AI service. |
| 2 | Which socket carries SDP? | `/v1/webrtc/{room_id}` relays offer, answer, and ICE only. |
| 3 | First two client messages? | `hello` then `start_session` with source and model. |
| 4 | Chunk size and encoding? | About 3 s of 16 kHz mono int16 as base64 `pcm_s16le`. |
| 5 | Room code format? | 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, no ambiguous glyphs. |
| 6 | Room ID vs room code? | UUID `call.id` is the socket path; the code is the shareable secret. |
| 7 | Token lifetime? | 60 s HS256 JWT minted by `POST /api/ws-token`. |
| 8 | Per-IP socket cap? | 5 connections, shared across both sockets, close 4008. |
| 9 | Session vs room TTL? | 5 min sessions, 10 min rooms, swept every 30 s. |
| 10 | Close 4003 means what? | Browser Origin not on the exact-match allowlist. |
