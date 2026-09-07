# VoxVerity — Production-Readiness Report (TRACK.md)

Date: 2026-09-07 · Scope: `apps/web/` only (`soumya/`, `subhankar/`, `temp_proj/` ignored)
Previous tracker state: UI shell + demo data built, login fake, realtime/AI unconnected.
This pass: **real NextAuth DB-only auth, full Supabase schema, realtime wiring, CRUD, seed2, live pages.**

---

## 1. Auth — no longer faked, Supabase is database-only

**Before:** `apps/web/auth.ts` credentials `authorize()` accepted any email/password;
`lib/supabase/server.ts` + `client.ts` + `middleware.ts` read
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` which does not exist in `.env.local`
(the real var is `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — Supabase clients were broken.
`lib/data.ts` also queried `profiles.organization_id`, a column that did not exist.

**After (NextAuth only, Supabase = database):**
- `apps/web/auth.ts` — Credentials provider verifies **bcrypt** hash from
  `public.app_users`; Google/GitHub OAuth provisions an `app_users` row +
  `profiles` mirror + `oauth_accounts` link + default org membership on first login.
  Supabase Auth (`signInWithPassword`, `auth.users`) is **not used anywhere**.
- `apps/web/app/api/auth/register/route.ts` — real registration
  (email/name/password validation → bcrypt-12 → `app_users` + `profiles` +
  `notification_preferences` + org membership). `components/Auth.tsx` signup mode
  calls it, then signs in via credentials.
- `apps/web/app/api/auth/forgot/route.ts` + `.../reset/route.ts` — real
  password-reset with SHA-256-hashed single-use tokens (`password_reset_tokens`,
  1h expiry). Forgot page calls the API; without SMTP it returns a dev
  `resetToken` and offers “Continue to set new password”; Reset page
  (`?token=`) sets the new bcrypt hash.
- `apps/web/lib/db.ts` — server-only **service-role** Supabase client
  (bypasses RLS; never exposed to browser). `lib/supabase/*` anon clients fixed
  to accept `NEXT_PUBLIC_SUPABASE_ANON_KEY` (fallback to legacy publishable name).
- `lib/data.ts` + `app/(protected)/{calls,alerts,incidents}/actions.ts` rewritten
  to resolve org via `auth()` (NextAuth) → `app_users` → `organization_members`.
- `middleware.ts` unchanged in policy (redirects signed-out users to `/login`
  for all protected paths) and now works because `auth.ts` sets `trustHost: true`
  and sessions are real JWTs.
- Demo credentials (after `seed2.sql`): `demo@voxverity.io / VoxVerity123!`
  (analyst), `owner@voxverity.io / VoxVerity123!` (owner).

**Env used (from `apps/web/.env.local`):** `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (server only), `AUTH_SECRET` (+ `trustHost`),
`AI_SERVICE_URL` / `NEXT_PUBLIC_AI_SERVICE_URL`, `AI_SERVICE_API_KEY` (server only),
`GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`,
`BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY` (server only),
`VOICE_REGISTRY_ADDRESS`, `CHAIN_ID`. Nothing secret is prefixed `NEXT_PUBLIC_`.

---

## 2. Tables: what the frontend needed vs what existed

New migration **`supabase/migrations/003_nextauth_db_and_frontend_tables.sql`** (idempotent):

| # | Need (frontend page) | What was missing | What 003 adds |
|---|---|---|---|
| 1 | Login/register without Supabase Auth | No user store outside `auth.users` | `app_users`, `oauth_accounts`, `password_reset_tokens` |
| 2 | Profile/settings (`/profile`, `/settings/*`) | `profiles` had only id/email/name/role | `organization_id`, `app_user_id`, `phone`, `first/last_name`, `department`, `job_title`, `location`, `avatar_url`, `language`, `timezone`, `theme`; plus `notification_preferences`, `notification_rules`, `user_sessions`, `login_history`, `mfa_factors`, `api_keys` |
| 3 | Admin roles (`/admin/roles`) | No `roles` table (`data.ts` queried a ghost table) | `roles` (+ 5 seeded template rows) |
| 4 | Admin orgs (`/admin/organizations`) | No `members`/`status` | `organizations.status`, `member_count` |
| 5 | Calls/alerts/incidents display fields | `caller`, `phone`, `syntheticLabel`, `speakerSimilarity`, `outcome`, `threat`, `risk`, `summary`, `owner_name` fabricated in code | `calls.caller_display/phone_number/synthetic_label/speaker_similarity/outcome`, `alerts.threat_title/caller_display/phone/risk_score/status`, `incidents.summary/owner_name`, `incident_notes`, `verification_requests.caller_display`, `evidence_records.caller_display`, `audit_events.actor_name/outcome` |
| 6 | Analysis + Lab (`/analysis`, `/lab/audio`) | No file table; `analysis_results` lacked `prosody`, `notes`, `file link` | `lab_audio_files`; `analysis_results.file_id/prosody_anomaly/notes` |
| 7 | Threats/analytics/system (`/threat-intelligence`, `/analytics`, `/admin/system`, dashboard) | 100% hardcoded demo | `threat_campaigns`, `analytics_daily`, `pipeline_health`, `protected_lines`, `dashboard_insights`; `risk_policies.verification_threshold/auto_escalation/sensitivity/model_version/band_actions` |
| 8 | FK correctness | `organization_members.user_id`, `calls.user_id`, `incidents.owner_id`, etc. referenced `auth.users` → inserts with app-user UUIDs would fail | FKs re-pointed to `app_users` (migration §13) |
| 9 | Browser realtime reads without Supabase Auth | RLS policies gated on `auth.uid()` which is always null now | Read-only anon/authenticated SELECT policies on all display tables; **writes only via service-role API routes** |

**Frontend extras that are intentionally NOT in the DB** (kept as UI-only):
phone-OTP flow (`Auth.tsx` — no SMS provider; shows honest message),
external avatar images, decorative viz copy (“↓4.2%”, “2.3x higher”),
`verifiedRate/lossesPrevented/falsePositiveRate` KPI placeholders (kept until
calibrated metrics exist per truthfulness rules), static settings tabs
(General/Advanced display prefs) not yet persisted.

**Backend tables still intentionally thin:** `blockchain_registrations`
(contract writes stay server-side/optional; evidence page verifies via local
recompute + shows contract address from env), `analytics_daily.volumes`
(history illustration; live distribution comes from real call rows).

---

## 3. Realtime — works and is visible on every surface

- **`apps/web/lib/realtime.ts`** (new): `useSupabaseTable(table)` — Supabase
  Realtime `postgres_changes` subscription (anon read policies from §9 above);
  `useRealtimeMic()` — mic `getUserMedia` → 16 kHz mono PCM → base64 chunks →
  AI-service `WS /v1/realtime/{session}` (`hello`/`start_session`/`audio_chunk`/
  `stop_session`), surfacing per-chunk `{risk, severity, dsp}`.
- **`components/LiveMonitoring.tsx`** — “Start live capture” button streams the
  real mic; risk meter, synthetic-signal bar, acoustic-anomaly bars, waveform,
  chunk counter, session/latency footer all update from **live chunks**.
  Supabase realtime connection + last alert event shown. Idle state shows the
  reference session with an honest label (no fake “live” claim).
- **`components/Waveform.tsx`** — accepts `live?: number[]`; driven by real
  risk levels when present (useMemo, no fake animation), sine animation otherwise.
- **`components/Dashboard.tsx`** — “realtime connected” badge + live alert-event
  notice via `useSupabaseTable("alerts")`; KPIs/calls/alerts/incidents/insights/
  lines come from live getters with `source` badge.
- **`/status`** — now a live server check: Supabase reachability, AI `/health` +
  `/v1/performance`, contract-address configured; per-service Operational/
  Degraded/Down instead of hardcoded “all operational”.
- **`/analytics`** — risk distribution computed from **live call rows**,
  pipeline health from AI `/v1/performance` when online (demo history kept only
  for trend/volumes illustration).
- **`/lab/live`** + `/live` share the same real capture path
  (`NEXT_PUBLIC_AI_SERVICE_URL`, default `http://localhost:8000`).

Requirement: AI service running (`uvicorn app.main:app --port 8000` in
`services/ai-service`); CORS already allows `localhost:3000`. Without it, pages
degrade to honest demo/offline states — never fake live data.

---

## 4. CRUD — implemented and wired

| Area | Endpoint / action | UI wiring |
|---|---|---|
| Calls | `GET/POST /api/calls`, server actions `createCall`, `updateCallStatus` | data layer live; detail pages live |
| Alerts | `PATCH /api/alerts/[id]` (acknowledge/escalate/link incident), `acknowledgeAlert`, `createIncidentFromAlert` | `AlertsView` Acknowledge button → server action, revalidates |
| Incidents | `GET/POST /api/incidents`, `PATCH /api/incidents/[id]` (status/owner/summary/**note** → `incident_notes`), `createIncident`, `updateIncidentStatus` | New Incident + detail-note flow persist |
| Verification | `GET/POST /api/verification`, `PATCH /api/verification/[id]` | `VerificationView` Confirm/Reject/Escalate → API (was local-only `useState`) |
| Evidence | `GET/POST /api/evidence` (canonical manifest + SHA-256), `POST /api/blockchain/verify` (server recompute) | `EvidenceView` Verify → server proof, shows recomputed hash + network/contract |
| Lab | `GET/POST /api/lab/analyze` (proxy keeps `AI_SERVICE_API_KEY` server-side; persists `lab_audio_files` + `analysis_results`) | `/lab/audio` real upload → AI result → history table |
| Profile | `GET/PATCH /api/profile` | identity + prefs persisted |
| Risk policy | `GET/PATCH /api/risk-policy` | thresholds/weights/sensitivity live |
| Analytics | `GET /api/analytics/live` (DB aggregates + AI perf) | analytics/threats/status pages |

Every mutating route uses `requireOrg()` (`lib/api-auth.ts`: NextAuth session →
`app_users` → org) and writes an `audit_events` row.

---

## 5. seed2.sql

**`supabase/seed2.sql`** (run after 001+002+003 and `seed.sql`):
demo users + memberships + enriched profile rows, display-column backfill for the
5 seed calls / 4 alerts / 3 incidents / 2 evidence / 7 audit rows, per-org roles,
notification prefs/rules, sessions, login history, MFA, API-key hash, incident
notes, verification requests, 3 lab files + analysis linkage, 3 threat campaigns,
`analytics_daily` (3 days), `pipeline_health`, 3 protected lines, 3 dashboard
insights, risk-policy extension values, 4 integrations (Slack/Splunk active).
Apply: Supabase SQL Editor → run `seed.sql` then `seed2.sql`.

---

## 6. Verification

- `npm run build` (apps/web): **passes** — 41 routes, TypeScript clean.
- `npm run lint`: **0 errors** (13 pre-existing warnings, e.g. unused `options`
  in `lib/supabase/middleware.ts`).
- New deps: `bcryptjs` (+ `@types/bcryptjs`).
- Manual checklist before demo: run 001→002→003→seed→seed2 in Supabase SQL
  Editor; start AI service on :8000; `npm run dev`; register or log in with
  demo credentials; open `/live` → Start live capture; upload WAV in
  `/lab/audio`; acknowledge an alert; resolve a verification; verify an
  evidence hash.

## 7. Known limitations (honest)

- Password-reset email needs an SMTP provider; dev flow returns the token in-API.
- Phone OTP is UI-only (no SMS provider) and says so in the UI.
- `verifiedRate / lossesPrevented / falsePositiveRate` remain illustrative until
  calibrated metrics exist (truthfulness rules forbid inventing probabilities).
- On-chain writes stay optional (testnet only, server key); evidence integrity
  proof is the local SHA-256 recompute + stored tx metadata.
- Writes assume single-org membership (first membership wins); multi-org
  switching is future work.
- Supabase Realtime reads are open SELECT (anon) by design for the demo; tighten
  to per-org JWT claims before public production.

## 8. Files changed (apps/web + supabase only)

Auth/DB: `auth.ts`, `next-auth.d.ts`, `lib/db.ts`, `lib/api-auth.ts`,
`lib/supabase/{server,client,middleware}.ts`, `app/api/auth/{register,forgot,reset}/route.ts`,
`app/(auth)/{login,register}` via `components/Auth.tsx`,
`app/(auth)/{forgot-password,reset-password}/page.tsx`,
`app/(protected)/{calls,alerts,incidents}/actions.ts`,
`supabase/migrations/003_*`, `supabase/seed2.sql`.
Data/AI/realtime: `lib/data.ts`, `lib/ai-service.ts`, `lib/realtime.ts`,
`app/api/{calls,alerts/[id],incidents,incidents/[id],verification,verification/[id],evidence,lab/analyze,profile,risk-policy,blockchain/verify,analytics/live}/route.ts`.
Pages/components: `(public)/status`, `(protected)/live` via `LiveMonitoring`,
`Waveform`, `Dashboard`, `AlertsView`, `VerificationView`, `EvidenceView`,
`analysis`, `analytics`, `threat-intelligence`, `integrations`, `lab/audio`.
