# VoxVerity — Engineering Gap Report

> **Date:** 2026-09-07
> **Scope:** What your described product actually needs vs. what the codebase already has, what is missing, and what can be cut. Written against the current tree (`apps/web`, `services/ai-service`, `blockchain`, `supabase`).

---

## 1. Your product, restated

1. Show the **real people who are online right now** (logged in only).
2. A person **calls** another online user; the receiver **must accept** for the call to happen.
3. A **room is created**. Audio flows for the call, **nothing is saved**.
4. **Only the caller's voice** matters — the receiver's voice is ignored for analysis. The caller's voice is played to the receiver.
5. The caller's voice is cut into **3-second chunks** and sent to a server.
6. That server talks to the **AI service (deployed separately)** which returns a **report per 3s chunk**.
7. The **Next.js server recalculates the risk score in real time** (org policy) and it shows on the **dashboard**.
8. In between, a **blockchain fingerprint** happens for evidence.

## 2. What already exists (and works)

| Piece | Where | Status |
|---|---|---|
| Auth (NextAuth DB-only, bcrypt, register/login/reset) | `apps/web/auth.ts`, `app/api/auth/*` | ✅ works |
| Identity in `app_users` + `profiles` + org membership | `supabase/migrations/full_schema.sql`, `final_seed.sql` | ✅ works |
| Mic capture → 16kHz PCM → **3s chunks** → AI-service WebSocket | `apps/web/lib/realtime.ts` (`useRealtimeMic`), `lib/ai-service.ts` | ✅ works |
| AI service realtime analysis (DSP + AASIST-L spoof + ECAPA speaker + human-pattern + risk engine + alerts) | `services/ai-service/app/realtime/*`, `app/risk/*` | ✅ works, `CHUNK_DURATION_MS = 3000` |
| WebRTC signaling with rooms + caller/receiver roles | `services/ai-service/app/realtime/signaling.py` (`/v1/webrtc/{room_id}`) | ⚠️ backend only — no UI, no accept flow |
| Live risk visualization (per-tab, session-local) | `apps/web/app/(protected)/live/page.tsx` → `components/LiveMonitoring.tsx` | ⚠️ works only in the caller's own tab |
| Risk policy CRUD (org thresholds/weights) | `apps/web/app/api/risk-policy/route.ts` | ✅ works |
| Supabase realtime subscription helper | `apps/web/lib/realtime.ts` (`useSupabaseTable`) | ✅ works |
| Evidence packaging (canonical manifest → SHA-256) + local verify | `apps/web/app/api/evidence/route.ts`, `app/api/blockchain/verify/route.ts` | ⚠️ hash exists, **on-chain write is NOT wired** |
| Solidity evidence registry + deploy script (Polygon Amoy) | `blockchain/contracts/VoiceIntegrityRegistry.sol`, `scripts/deploy.js` | ✅ contract ready |
| Full DB schema + demo seed (calls, chunks, alerts, incidents, evidence, policies, models, integrations, insights…) | `supabase/migrations/reset.sql` + `full_schema.sql`, `supabase/final_seed.sql` | ✅ ready |

## 3. What is MISSING to reach your product

Ordered by priority. P0 = blocks the core loop, P1 = needed for a usable demo, P2 = hardening.

### P0 — the core loop

| # | Gap | Why | Where it goes |
|---|---|---|---|
| 1 | **Online presence (logged-in users only)** — nothing exists today. No presence table, no heartbeat, no "who's online" list. | Your step 1 is entirely unbuilt. | New `presence` table (or Supabase Realtime Presence channel) + heartbeat API tied to the NextAuth session (`app_users`). UI on `/live`. |
| 2 | **Call initiation + accept/reject UI** — signaling rooms exist but there is no way to ring someone, no incoming-call UI, no accept/decline, no room state machine (ringing/accepted/ended). | Your step 2 is unbuilt. | Frontend call dialog on `/live`; extend `signaling.py` with `ring` / `accept` / `reject` / `busy` messages + `peer_status`. |
| 3 | **Caller-only audio policy** — nothing enforces that the receiver's voice is ignored. Both peers' microphones would currently be captured. | Your step 4 (receiver voice ignored) is unbuilt. | Client rule: only the **caller** opens the analysis stream (`useRealtimeMic`); receiver's mic is only for the WebRTC call and is never chunked/sent. Server should reject analysis chunks from the receiver role. |
| 4 | **Write-back of live risk to the dashboard** — chunk results currently live only in the caller's browser tab. The dashboard shows demo/static data. | Your step 7 is unbuilt. | Next.js WS proxy (or a small API) that, per chunk: recomputes risk with the org's policy weights (`/api/risk-policy`) and upserts `analysis_results` + updates `calls.risk_score`. Dashboard subscribes with the existing `useSupabaseTable("analysis_results")`. |
| 5 | **Blockchain fingerprint end-to-end** — evidence POST computes a SHA-256 but never calls the contract; `blockchain_registrations` is never populated; there is no `tx_hash`. | Your step 8 is unbuilt. | New server-only route (ethers, private key server-side) → `registerEvidence(evidenceHash, recordId, createdAt)` on Amoy → store `tx_hash`/`block_number` in `blockchain_registrations`; trigger on call end / high-risk chunk. Env: `VOICE_REGISTRY_ADDRESS`, `PRIVATE_KEY`, `RPC_URL` (already in `blockchain/.env` pattern). |
| 6 | **Deploy the AI service somewhere reachable** — default is `http://localhost:8000`. | Your step 6 assumes a separate deployment. | Deploy `services/ai-service` (FastAPI + PyTorch), set `AI_SERVICE_URL` (server) and `NEXT_PUBLIC_AI_SERVICE_URL` (browser) + `AI_SERVICE_API_KEY` in `apps/web/.env.local`. |

### P1 — needed for a believable demo

| # | Gap | Notes |
|---|---|---|
| 7 | Call session row per room | Create `calls` on room creation, update status/risk on end. "Nothing saves" applies to **audio**, not call metadata. |
| 8 | Presence reconnect/refresh handling | Heartbeat interval + stale timeout so "online" is honest. |
| 9 | Busy/occupied state | A user in a call should not be ringable a second time. |

### P2 — hardening (required before anyone real uses it)

| # | Gap | Notes |
|---|---|---|
| 10 | **WebSocket auth + origin checks** | `signaling.py` and `realtime/routes.py` accept any connection. AGENTS.md mandates authenticated, origin-checked sockets. |
| 11 | Rate limiting / abuse on signaling | Currently in-memory only; fine for demo, not beyond. |
| 12 | Room/session TTL + cleanup | `rooms` and `WebSocketManager` never expire idle sessions. |

## 4. What you DON'T need (cut list)

### 4.1 Sidebar / pages — verdict per nav item (shown on all pages today)

Your described product needs **presence + calling + live risk + evidence fingerprint**. Everything else is either secondary or dead weight for now.

| Nav item | Verdict | Reason |
|---|---|---|
| **Main → Dashboard** | ✅ **KEEP** (simplify) | This is where live risk lands. Remove the marketing widgets (see 4.2). |
| **Main → Live Monitor** | ✅ **KEEP** | **This is your product.** Presence list → call → live analysis. |
| **Main → Calls** | ✅ **KEEP** | Call history after a call ends. |
| **Main → Analysis** | 🟡 DEFER | Per-chunk breakdown is useful, but the live monitor already shows it. Revisit after P0. |
| **Main → Profile** | ✅ **KEEP** (minimal) | Identity/settings shell. |
| **SecOps → Alerts** | 🟡 DEFER | Alerts engine exists in AI service; only build the page once risk is flowing. |
| **SecOps → Incidents** | 🟡 DEFER | Ops workflow — not part of your loop. |
| **SecOps → Verification** | ❌ **CUT** (for now) | Step-up verification is a later feature, not the MVP. |
| **SecOps → Analysis Lab** | ❌ **CUT** (for now) | File-upload analysis is out of the call loop. |
| **Intelligence → Analytics** | ❌ **CUT** | Derived stats; no real data to show until calls happen. |
| **Intelligence → Evidence** | ✅ **KEEP** (minimal) | Show blockchain fingerprints + verify (your step 8). |
| **Intelligence → Audit** | ❌ **CUT** (for now) | Logs only; revisit in hardening. |
| **Intelligence → Threats** | ❌ **CUT** | Demo campaigns, not part of the loop. |
| **Configuration → Integrations** | ❌ **CUT** | Twilio/Zoom/Slack stubs — not needed for browser-to-browser calls. |
| **Configuration → Models** | ❌ **CUT** | Registry is useful documentation but no product value now. |
| **Configuration → Settings** | 🟡 DEFER | Keep only notification prefs + API keys; cut roles/admin sections. |
| **Admin → Admin Panel** | ❌ **CUT** (for now) | Org/role admin is not in your loop. |

### 4.2 Dashboard widgets — verdict (from your pasted dashboard)

| Widget | Verdict | Reason |
|---|---|---|
| Protection Score | ❌ CUT | Composite vanity metric computed from demo data; your dashboard should show **live call risk**, not a marketing score. |
| Open Alerts | 🟡 DEFER | Only meaningful once the alert engine is fed by real chunks. |
| Voice Fraud Risk / Verified Calls / "$214K prevented" | ❌ CUT | Fabricated stats. Against the project's truthfulness rules until calibrated. |
| **Live Alert Feed** | ✅ **KEEP (repurpose)** | This is the real-time per-chunk risk feed — your step 7. Show sequence, risk, severity per 3s chunk. |
| AI Insights & Recommendations | ❌ CUT | Static demo copy; not generated by your models. |
| Protected Lines | ❌ CUT | Telephony/adapter concept — not part of browser-to-browser calls. |
| Quick Actions / Export | 🟡 DEFER | Nice later, noise now. |

**Rule of thumb:** a dashboard widget stays only if it can be fed by the real pipeline (presence → call → chunk analysis → risk → fingerprint). Everything else is demo chrome.

## 5. Suggested minimal build path

1. **Presence** — heartbeat API + `presence` table (or Realtime presence) + online list on `/live`. *Unblocks step 1.*
2. **Calling** — extend signaling with ring/accept/reject; build call dialog + WebRTC peer flow. *Unblocks step 2–3.*
3. **Caller-only analysis** — wire `useRealtimeMic` on the caller side only; receiver playback only. *Unblocks step 4.*
4. **Server-side risk write-back** — WS proxy in Next.js: per chunk → policy-weighted recompute → `analysis_results` upsert → realtime to dashboard. *Unblocks step 5–7.*
5. **Blockchain fingerprint** — evidence route calls `registerEvidence`; store tx; verify from Evidence page. *Unblocks step 8.*
6. Deploy AI service; set env vars; auth the sockets (P2).

## 6. Quick reference — key files

- Presence/calling frontend: `apps/web/app/(protected)/live/page.tsx`, `components/LiveMonitoring.tsx`
- Chunk capture + WS: `apps/web/lib/realtime.ts`, `lib/ai-service.ts`
- AI service: `services/ai-service/app/realtime/{routes,signaling,manager}.py`, `app/risk/engine.py`, `app/main.py`
- Evidence + verify: `apps/web/app/api/evidence/route.ts`, `app/api/blockchain/verify/route.ts`
- Contract: `blockchain/contracts/VoiceIntegrityRegistry.sol`, `scripts/deploy.js`
- Schema/seeds: `supabase/migrations/*`, `supabase/final_seed.sql`

## 7. Housekeeping done alongside this report

- Removed `lagacy/` (incl. `soumya/`, `subhankar/`) and `temp_proj/`; added `lagacy/` to `.gitignore`.
- Fixed seed FK error `23503` (`profiles.id` → `auth.users`) — **permanently solved** by the consolidated schema: `profiles.id` has no FK, every user FK points at `app_users` (NextAuth DB-only).
- **SQL run order (fresh environment):** `supabase/migrations/reset.sql` → `supabase/migrations/full_schema.sql` → `supabase/final_seed.sql`.
- Old migrations `001`/`002`/`003` and seeds `seed.sql`/`seed2.sql` were deleted — `full_schema.sql` + `reset.sql` + `final_seed.sql` replace them entirely.