# Frontend ⇄ Backend Gap Report — VoxVerity (post-migration)

> Generated after migrating `temp_proj/` (soumya × subhankar merged UI) into `apps/web/`.
> Migration commit: `1c95b75`. All 42 routes verified: build ✅, `tsc --noEmit` ✅, ESLint 0 errors ✅,
> production-server smoke test 200s ✅.

---

## 0. Current state — what is real vs demo right now

| Layer | Status |
|---|---|
| **UI** | Fully migrated: soumya components in the subhankar shell, Tailwind v4 tokens, 42 routes |
| **Auth UI** | Real NextAuth v5 (Google / GitHub / credentials) wired to `signIn`/`signOut`/`useSession` |
| **Auth validation** | ⚠️ Credentials `authorize()` accepts **any** email/password (demo). OAuth providers are configured with real client IDs |
| **Auth enforcement** | ⚠️ Broken: no `trustHost`/`AUTH_URL` → `UntrustedHost` errors in server logs; middleware `auth()` fails silently and protected routes render demo data instead of redirecting |
| **Data layer** | `apps/web/lib/data.ts` queries 11 Supabase tables via RLS, falls back to `lib/demo-data.ts` when unconfigured/empty; every page shows an honest `demo` badge |
| **AI service** | ❌ Not consumed at all. 27 REST + 2 WebSocket endpoints exist in `services/ai-service`; the frontend only has 2 health-check stubs (`lib/ai-service.ts`) |
| **Blockchain** | Contract deployed on Polygon Amoy (`blockchain/deployments/amoy.json`); `/blockchain` page shows demo evidence rows, verify endpoint not called |
| **Realtime** | ❌ Backend has `/v1/realtime/{session}` + `/v1/webrtc/{room}` WebSockets; `/live` page is an animated visualization with demo data |

---

## 1. Frontend has → backend lacks (ranked)

| Rank | Gap | Detail | Fix |
|---|---|---|---|
| **P0-1** | **Real credential login** | `auth.ts` `authorize()` returns a session for any email/password (explicit TODO: "Phase 14 — validate against Supabase"). Anyone can log in as anyone. | Validate credentials against Supabase Auth (`auth.signInWithPassword`), then load the user's `profiles`/org row for `role`. |
| **P0-2** | **Password reset / forgot flows** | `/forgot-password` and `/reset-password` are static styled forms — no server action, no Supabase Auth call. | Wire to Supabase `resetPasswordForEmail` + `updateUser` with the recovery token. |
| **P1-1** | **`roles` table does not exist** | `lib/data.ts` admin getter queries `.from("roles")`; the schema has **no** `roles` table — role is a CHECK column on `organization_members` (`owner/admin/analyst/operator/viewer`). Query always falls back to demo. | Create a `roles` table or change the query to `organization_members` + distinct role values. |
| **P1-2** | **Middleware route protection** | No `trustHost: true` / `AUTH_URL` → `UntrustedHost`; `auth()` in middleware throws, requests pass through, so `middleware.ts` matcher never actually guards. | Add `trustHost`/`AUTH_URL` and decide policy: redirect signed-out users to `/login` (product) vs allow demo browsing (current temp_proj behavior). |
| **P2-1** | **`analysis_results` unused by frontend** | Table exists; `/analysis` + `/analysis/[id]` render demo rows. No endpoint or query reads the table. | Add `getAnalysisData`/`getAnalysisById` in `lib/data.ts` (or AI-service `/analyze` history). |
| **P2-2** | **`blockchain_registrations` unused by frontend** | Table exists; `/blockchain` shows demo evidence. | Query the table for registry entries; wire verify flow (see B-3). |
| **P2-3** | **`integrations` / `risk_policies` schema alignment** | Tables exist but the frontend shapes (connector type/status/key prefixes, threshold policies) need a column-level check; pages currently demo-only. | Align columns or add server getters; seed default `risk_policies`. |
| **P3-1** | **Profiles content gaps** | `profiles` table is basic (identity); frontend `/profile` expects security prefs, notification prefs, API keys. | Add columns/tables for prefs + API key hashes (server-only). |

## 2. Backend has → frontend doesn't consume (ranked)

The AI service (`services/ai-service/app/api/routes.py`) exposes 27 REST + 2 WS endpoints. None are called by the frontend.

| Rank | Endpoint(s) | What the frontend should use it for |
|---|---|---|
| **P0-3** | `POST /analyze/file`, `POST /risk/evaluate`, `POST /speaker/verify`, `POST /speaker/enroll` | Core promise. `/lab/audio`, `/verification`, `/calls/[id]` should submit audio and render real model scores (AASIST-L / ECAPA). |
| **P1-3** | `WS /v1/realtime/{session_id}`, `WS /v1/webrtc/{room_id}`, `POST /sessions`, `POST /sessions/{id}/chunks` | `/live` should open an authenticated WS, stream chunks, and live-update risk instead of animating demo data. |
| **P1-4** | `POST /evidence/{evidence_id}/verify`, `GET /evidence/{id}` | `/blockchain` and call-detail "verify on-chain" buttons. |
| **P2-4** | `GET /analytics/dashboard`, `/analytics/trends`, `/analytics/sources`, `/analytics/models`, `GET /performance` | `/analytics` page: real trends/sources/latency instead of demo. |
| **P2-5** | `POST /alerts/{id}/acknowledge`, `POST /incidents`, `POST /incidents/{id}/update` | `/alerts` and `/incidents` are read-only now — wire the acknowledge/escalate/status actions. |
| **P2-6** | `GET /model-registry`, `GET /model-registry/{id}`, `GET /models`, `GET /config` | `/models` page and `/admin/models`. |
| **P3-2** | `GET /languages` | Language pickers in `/lab` and live monitor. |
| **P3-3** | `GET /audit`, `GET /alerts`, `GET /incidents` | The AI service mirrors Supabase data; frontend currently reads only Supabase. Decide single source of truth (recommend: Supabase for storage, AI service for inference/WS only). |

## 3. Schema drift — frontend queries vs backend tables

| `lib/data.ts` queries | Supabase tables | Notes |
|---|---|---|
| `alerts`, `audit_events`, `calls`, `evidence_records`, `incidents`, `model_registry`, `organization_members`, `organizations`, `profiles`, `verification_requests` | ✅ exist | Live path works when data present |
| `roles` | ❌ **does not exist** | See P1-1 |
| — | `analysis_results` | Table unused (P2-1) |
| — | `blockchain_registrations` | Table unused (P2-2) |
| — | `integrations`, `risk_policies` | Demo-only, needs alignment (P2-3) |

## 4. Priority action list (merge of both sides)

1. **P0 — Auth hardening**: real Supabase credential validation (P0-1), password reset wiring (P0-2), `trustHost` + protection policy (P1-2). Without this the app is demo-mode behind a fake login.
2. **P0 — AI service in the loop**: file analysis + risk evaluation on `/lab` and `/verification` (P0-3). This is the product.
3. **P1 — Realtime**: WebSocket session flow on `/live` (P1-3).
4. **P1 — Schema fixes**: `roles` query fix (P1-1), blockchain verify wiring (P1-4).
5. **P2 — Feature completeness**: analytics (P2-4), alert/incident actions (P2-5), model registry (P2-6), schema alignment (P2-3), analysis history (P2-1), on-chain registry (P2-2).
6. **P3 — Polish**: languages (P3-2), single source of truth decision (P3-3), profile prefs (P3-1).

## 5. Notes for the merge into production

- `temp_proj/` is still present and can be deleted after you confirm the migrated UI in `apps/web` (run `npm run dev` there — your port-3000 server is already serving the new pages after restart).
- `docs/build-status.md` should be updated next maintenance pass (Phase 10 note in `FRONTEND_MERGE_PLAN.md`).
- The `demo` badge on pages is deliberate honesty: it disappears automatically once live data flows (each getter returns `source: "live"`).