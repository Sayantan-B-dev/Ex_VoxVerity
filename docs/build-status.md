# VoxVerity — Build Status

> This file records phase completion, commit hashes, verification dates, test results, and known limitations.
> Update after every phase.

## Current State

| Field | Value |
|---|---|
| **Current Phase** | Hardening (WebSocket auth, TTL, rate limiting) |
| **Status** | In Progress |
| **Last Verified** | 2026-09-07 |
| **Last Commit** | f7df589 |

## Phase History

| Phase | Status | Commit Hash | Verified | Tests | Known Limitations |
|---|---|---|---|---|---|
| 01 — Repository Bootstrap and Constitution | Complete | 0fbc333 | 2026-09-04 | Build passes | — |
| 02 — Route Skeleton | Complete | pending | 2026-09-04 | Build passes, 40 routes | Admin routes nested under (protected) |
| 03–13 — UI Foundation through Settings/Admin | Complete | (batch) | 2026-09-05 | Build passes | Pages render from SQL only after Session 2 refactor |
| 14–16 — Database Schema, RLS, CRUD | Complete | 5651524 | 2026-09-07 | Build passes | Consolidated NextAuth-only schema |
| 17–21 — AI Service, DSP, Human Pattern | Complete | ea38887 | 2026-09-07 | Build passes | Models load at startup; CPU inference |
| 22–26 — AASIST-L, ECAPA-TDNN, Risk Engine | Complete | ea38887 | 2026-09-07 | Build passes | Out-of-domain performance weaker than benchmark |
| 27–30 — Realtime WS, WebRTC, Alerts, Verification | Complete | ea38887 | 2026-09-07 | Build passes | Signaling in-memory only |
| 31–32 — Evidence Packaging, Blockchain Registry | Complete | 63e880a | 2026-09-07 | Build passes | Chain env optional; fail-soft without it |
| 33–36 — Audit, Integrations, Multilingual, Analytics | Complete | 366b686 | 2026-09-07 | Build passes | Non-core pages cut per reports/REPORT.md |
| 37–40 — Security, Performance, Demo, Release | Complete | 63e880a | 2026-09-07 | Build passes | — |
| Production-readiness (auth, schema, realtime, CRUD) | Complete | 0c0bc3d | 2026-09-07 | `npm run build` passes (41 routes), `npm run lint` 0 errors | — |
| Session 2 (presence, calls, risk write-back, fingerprints) | Complete | 63e880a | 2026-09-07 | Build passes | All demo/hardcoded data removed |
| Hardening (WS auth, TTL, rate limiting) | In Progress | — | — | — | See below |

## Hardening Status (Current Work)

| Item | Status | Notes |
|---|---|---|
| WebSocket origin validation | ✅ Done | `ws_auth.py` — checks Origin header against configurable allowlist |
| Per-IP WebSocket connection limit | ✅ Done | Default 5 concurrent WS per IP, configurable |
| Room TTL + stale sweep | ✅ Done | 10 min TTL, 30s background sweep in `signaling.py` |
| Session TTL + stale sweep | ✅ Done | 5 min TTL, 30s background sweep in `routes.py` |
| UUID validation on room/session IDs | ✅ Done | Regex-based v4 UUID check on accept |
| Rate limiting on signaling (connection attempts) | ✅ Done | Per-IP concurrent limit covers this |
| WebSocket API key auth | ⏳ Deferred | Browser can't send custom headers; consider token-based approach |
| Deploy AI service | ⏳ Blocked | Needs external hosting + env vars |
| Deploy blockchain contract | ⏳ Blocked | Needs wallet + Amoy testnet funds |

## Remaining Deployment Items

| # | Item | What's Needed |
|---|---|---|
| 1 | Deploy AI service | Set `AI_SERVICE_URL` (server) + `NEXT_PUBLIC_AI_SERVICE_URL` (browser) + `AI_SERVICE_API_KEY` |
| 2 | Deploy contract | `cd blockchain && npx hardhat run scripts/deploy.js --network amoy`; set `VOICE_REGISTRY_ADDRESS`, `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY` |
| 3 | Supabase Realtime publications | Re-run §11 of `full_schema.sql` on existing DB, or run publication block manually |

## Environment

| Component | Version |
|---|---|
| Node.js | 24.x LTS |
| Next.js | 16.3.4 |
| TypeScript | (see apps/web/tsconfig.json) |
| Python | 3.13.x |
