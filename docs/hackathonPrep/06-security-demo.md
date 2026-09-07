# VoxVerity Security and Demo Gotchas - 30 Questions Judges Love to Ask

Short answers grounded in the real implementation, with honest limitations. Nothing here claims universal clone detection or phone-network interception: VoxVerity verifies voice in authorized browser-based contexts only.

## Medium questions (Q1-Q20)

### Q1. Why does VoxVerity use NextAuth with its own database tables instead of Supabase Auth?

Supabase is used only as a Postgres database and realtime broadcast layer, never as the identity provider. All app identity lives in `public.app_users` plus `oauth_accounts`, `profiles`, and `organization_members`, as documented at the top of `supabase/migrations/full_schema.sql`. The auth flow itself is NextAuth configured in `apps/web/auth.ts`, with Credentials (email plus password) and optional Google and GitHub OAuth providers. Sessions use the JWT strategy, so there is no `auth.users` row and no Supabase `signInWithPassword` call anywhere. This keeps one source of truth for users and roles, at the cost that we own password hashing, reset flows, and session hardening ourselves.

### Q2. Where does the Supabase service-role key live, and which code is allowed to touch it?

The service-role key lives only in server-side environment (`SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` on dev, or the Vercel dashboard in production) and is loaded exclusively by `createServiceClient()` in `apps/web/lib/db.ts`. That helper is imported by server-only code paths: `apps/web/auth.ts` (`findUserByEmail`, `provisionOAuthUser`, `ensureOrgMembership`), API routes such as `apps/web/app/api/auth/register/route.ts`, and server components. The file header comment states it bypasses RLS and must never reach the browser. There is no `NEXT_PUBLIC_` prefix on the variable, so Next.js never inlines it into client bundles. If you grep the client tree you will find only the anon key used via `apps/web/lib/supabase/client.ts`.

### Q3. Why must the service-role key never appear in the browser?

The service-role key bypasses every Row Level Security policy in Postgres, so anyone holding it has unrestricted read and write access to all application tables. The schema comment in `supabase/migrations/full_schema.sql` states explicitly that all writes go through server routes with the service-role key precisely because it bypasses RLS. Browser code is fully inspectable, so embedding the key there (or prefixing it with `NEXT_PUBLIC_`) would hand full database access to every visitor. That is why `AGENTS.md` Security Rules list "never use service-role keys on the client" as a hard rule. The browser instead uses the anon key through `apps/web/lib/supabase/client.ts`, which is constrained by RLS read policies.

### Q4. How is the RLS policy layer designed in this project?

Every application table has RLS enabled (see the `ENABLE ROW LEVEL SECURITY` block around line 507 of `supabase/migrations/full_schema.sql`), and each table exposes a narrow read-only policy for the `anon` and `authenticated` roles, for example `CREATE POLICY "browser read calls" ON calls FOR SELECT TO anon, authenticated USING (true)`. There are deliberately no browser write policies: inserts and updates happen only in Next.js API routes and server functions that use `createServiceClient()` from `apps/web/lib/db.ts`, which bypasses RLS. This split exists so Supabase Realtime can stream rows to the dashboard while mutations stay behind session checks in code like `apps/web/middleware.ts` and per-route `auth()` calls. The tradeoff is honesty-worthy (see Q25): row access is broad by design, so per-organization isolation is enforced at the application layer, not by RLS.

### Q5. How does OAuth account linking work without Supabase Auth?

OAuth is handled by NextAuth callbacks in `apps/web/auth.ts`, not by any Supabase Auth integration. On first OAuth sign-in, the `signIn` callback calls `provisionOAuthUser()`, which looks up `app_users` by normalized email, creates the user plus `profiles` and `notification_preferences` rows if absent, then upserts a row into `oauth_accounts` keyed on `(provider, provider_account_id)`. Returning users match on the unique `(provider, provider_account_id)` pair via that upsert, so the same Google or GitHub account always maps to the same `app_users.id`. The JWT and session callbacks then attach `token.id` and `token.role` so the rest of the app keys everything off the internal user id. Provider client secrets stay server-side in `GOOGLE_CLIENT_SECRET` and `GITHUB_CLIENT_SECRET` and never enter the client bundle.

### Q6. How are passwords stored and verified?

Registration in `apps/web/app/api/auth/register/route.ts` validates email shape, a minimum 8-character password, and a 2-character name before doing anything else. The password is hashed with `bcrypt.hash(password, 12)` and only the `password_hash` column in `app_users` is persisted; the plaintext password never touches the database or logs. Login verification happens in the Credentials `authorize()` function in `apps/web/auth.ts`, which fetches the user via the service client and runs `bcrypt.compare(password, user.password_hash)`. Accounts created purely through OAuth have a null `password_hash`, so `authorize()` rejects password login for them by returning null. Cost factor 12 is a deliberate balance: slow enough to resist offline brute force, fast enough to keep login latency acceptable on Vercel serverless functions.

### Q7. How are password-reset tokens protected against database leaks?

The schema provides a dedicated `password_reset_tokens` table in `supabase/migrations/full_schema.sql` with `user_id`, a unique `token_hash`, `expires_at`, and `used_at` columns. The design rule is hash-only storage: the server generates a high-entropy random token, sends the plaintext only once (normally inside the reset email link), and persists just the SHA-256 hash plus expiry. Verification re-hashes the presented token and compares against `token_hash`, also checking `expires_at` and that `used_at` is still null so each token is single-use. Note honestly: there is currently no live forgot-password or reset-password API route file under `apps/web/app/api` (only `register` and `[...nextauth]` exist), so email delivery and the consume endpoint are schema-ready but not yet implemented. Until they are, do not demo password reset as a working flow.

### Q8. How is the WebSocket token secret shared between Vercel and Render?

Realtime authentication uses a symmetric HMAC secret called `WS_TOKEN_SECRET` that must be byte-identical on both platforms. The Next.js side signs short-lived JWTs in `apps/web/app/api/ws-token/route.ts` using the `jose` `SignJWT` helper with HS256, and the FastAPI AI service verifies the signature with the same value from its own environment. Both deployment guides (`docs/deployment/vercel.md` and `docs/deployment/ai-service.md`) stress copying the exact value, generated with `openssl rand -base64 32`, into Vercel and the Render dashboard. The `render.yaml` Blueprint deliberately omits the secret and lists it only as a dashboard-set comment so it is never committed to git. If the two values differ by even one character, the AI service rejects every token and realtime connections fail with 401s.

### Q9. How long do WebSocket tokens live, and why does that matter?

Tokens minted by `POST /api/ws-token` expire after 60 seconds (`setExpirationTime("60s")` in `apps/web/app/api/ws-token/route.ts`). The route requires a valid NextAuth session first, so only logged-in users can mint a token, and the token carries just the user id as `sub`. The short lifetime bounds the damage if a token leaks through browser devtools, a copied URL, or a log file, because the WebSocket upgrade passes it as a `?token=` query parameter that intermediaries may record. The AI service checks signature plus expiry and extracts the user id, which replaces the missing custom-header support in the WebSocket handshake. If `WS_TOKEN_SECRET` is unset, the route returns 503 and the client falls back to unauthenticated dev-mode connection, which must never be enabled in production.

### Q10. What must never appear in logs, and how does the codebase enforce that?

Per `AGENTS.md` Security Rules, raw audio, access tokens, passwords, private keys, and unnecessary PII must never be logged. Evidence handling in `apps/web/lib/evidence.ts` and `apps/web/app/api/evidence/route.ts` hashes the canonical manifest with SHA-256 and persists only the digest plus derived scores, so raw waveforms and biometric embeddings never reach the database or log streams. The blockchain client in `apps/web/lib/blockchain.ts` registers only `bytes32` hashes on-chain, never audio or embeddings. OAuth client secrets, `SUPABASE_SERVICE_ROLE_KEY`, and `BLOCKCHAIN_PRIVATE_KEY` are read from server env at request time and are never interpolated into responses. During review we grep for `console.log` near auth, token, and audio paths before every demo to confirm nothing sensitive is printed.

### Q11. How does the microphone permission UX respect user consent?

Microphone access is requested only through the browser `getUserMedia` API after an explicit user gesture, normally the "Start Capture" button on the `/live` page described in `docs/runbooks/demo_runbook.md`. The UI must always show one of the capture states from `AGENTS.md` Privacy Rules: on, paused, denied, unsupported, or disconnected, so recording is never silent or hidden. If permission is denied, the runbook instructs the operator to use the lock icon in the address bar and refresh, and the app surfaces the denied state rather than retrying in a loop. Capture runs over controlled WebRTC or mic input only; there is no PSTN or phone-call interception anywhere in the product. Temporary debug audio, if ever persisted, must disclose its retention and offer deletion.

### Q12. What is the data-retention story for audio and derived results?

The default posture is in-memory processing: live chunks are analyzed and discarded, and the database stores session metadata plus derived results (risk scores, DSP metrics, spoof signals), never raw audio. This follows `AGENTS.md` Privacy Rules, which state that database records reference sessions and derived results, not raw audio. Voiceprint embeddings live as local `voiceprint.npz` files on the AI service host and are gitignored, so they never enter version control. On Render free tier the disk is ephemeral (see `docs/deployment/ai-service.md`), meaning voiceprints reset on redeploy and must be re-uploaded, which is inconvenient but privacy-friendly. If any temporary audio file is kept for debugging, its retention window must be disclosed in the UI with a deletion path.

### Q13. What does the free-tier deployment map look like end to end?

The web app runs on Vercel Hobby from Root Directory `apps/web` (`docs/deployment/vercel.md`), the FastAPI AI service runs on a Render free web service defined by `render.yaml`, Postgres plus realtime plus Storage come from Supabase free tier, and evidence anchoring targets the Polygon Amoy testnet. The browser talks to Vercel for pages and API routes, Vercel server routes talk to Supabase with the service-role key, and the browser opens WebSockets directly to the Render URL using a token minted by `/api/ws-token`. Blockchain calls are optional and fail soft: `apps/web/lib/blockchain.ts` returns `{ ok: false, status: "not_configured" }` when RPC, key, or contract address is missing. Total cash cost is zero, which is ideal for a hackathon, with the accepted tradeoffs of cold starts, ephemeral AI-service disk, and Amoy faucet dependence.

### Q14. How do cold starts manifest, and how does the app handle them?

Render free services spin down after about 15 minutes of idle time and take roughly a minute to cold-start, while Vercel Hobby serverless functions also cold-start after idle (`docs/deployment/ai-service.md` section A5 and `docs/deployment/vercel.md` gotchas table). In practice the first `/health` or WebSocket attempt after idle may hang or fail, and a WebSocket call started during spin-down will drop. The app treats this as an expected state: realtime status transitions to ended or disconnected, the UI shows it, and the operator re-creates the room or retries the chunk stream rather than the app crashing. The runbook operator checklist requires warming the AI service (`curl .../health` until healthy) before going on stage. For a zero-cold-start fallback, `docs/deployment/ai-service.md` Option B documents tunneling a local machine with Cloudflare Tunnel instead of Render.

### Q15. Which environment variables must be set on Vercel?

Vercel needs the Supabase pair (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for browser and server reads, plus the server-only `SUPABASE_SERVICE_ROLE_KEY` for writes via `apps/web/lib/db.ts`. Auth requires `NEXTAUTH_URL` (the deployed `https://<app>.vercel.app`), `NEXTAUTH_SECRET` (or `AUTH_SECRET`) so sessions survive restarts, and the optional OAuth pairs `GOOGLE_CLIENT_ID` plus `GOOGLE_CLIENT_SECRET` and `GITHUB_CLIENT_ID` plus `GITHUB_CLIENT_SECRET`. Realtime needs `NEXT_PUBLIC_AI_SERVICE_URL` and `AI_SERVICE_URL` pointing at the Render service plus `WS_TOKEN_SECRET` identical to Render's value, per `docs/deployment/vercel.md`. Blockchain variables (`BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, `VOICE_REGISTRY_ADDRESS`) are optional and should simply be omitted for a pure-free deploy without on-chain anchoring.

### Q16. Which environment variables must be set on Render?

Render needs `PYTHON_VERSION=3.13.4`, which `render.yaml` pins because Render's default Python 3.14 has no prebuilt `pydantic-core` wheel and the build fails inside `maturin` on a read-only filesystem. It also needs `CORS_ORIGINS` and `WS_ALLOWED_ORIGINS` set to the exact Vercel origin (for example `https://<your-app>.vercel.app,http://localhost:3000`), otherwise browsers block both REST and WebSocket calls. `WS_TOKEN_SECRET` must equal the Vercel value character-for-character so the AI service accepts tokens from `POST /api/ws-token`. `DEBUG` stays `false` in production to avoid verbose error surfaces. `PORT` is injected by Render itself and consumed by the `uvicorn app.main:app --host 0.0.0.0 --port $PORT` start command.

### Q17. Which environment variables matter for local development?

Local dev mirrors production with localhost values, all documented in `.env.example` at the repo root. The web app reads `apps/web/.env.local` (copied from `.env.example`, never committed): Supabase URL plus anon plus service-role keys, `NEXTAUTH_URL=http://localhost:3000`, `AUTH_SECRET`, and `NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000` with `AI_SERVICE_URL` matching. The AI service reads the same values for `CORS_ORIGINS`, `WS_ALLOWED_ORIGINS`, and `WS_TOKEN_SECRET` so cross-origin calls from port 3000 to port 8000 succeed. The `.env.example` header warns that only `NEXT_PUBLIC_` variables reach the browser and that the service-role key plus blockchain private key are sensitive. Anyone cloning the repo can diff their `.env.local` against `.env.example` to spot a missing variable in seconds.

### Q18. How does the middleware protected-route policy work?

`apps/web/middleware.ts` runs on every non-static route (see the `matcher` that excludes `_next`, `api`, `auth`, `login`, `register`, `help`, `status`, and `favicon.ico`) and calls `auth()` from `apps/web/auth.ts` to load the session. It treats nine prefixes as protected: `/dashboard`, `/live`, `/calls`, `/analysis`, `/alerts`, `/incidents`, `/blockchain`, `/settings`, and `/profile`. An unauthenticated request to any of them is redirected to `/login` with a `callbackUrl` so the user lands back where they started after signing in. Authenticated requests pass through untouched. Note the honest gap: middleware guards pages, while data protection for API routes and realtime depends on per-route `auth()` checks, the `/api/ws-token` session requirement, and server-side org checks, not on middleware alone.

### Q19. Why do `trustHost`, `NEXTAUTH_URL`, and redirect URIs matter for OAuth?

`apps/web/auth.ts` sets `trustHost: true` so NextAuth trusts the host headers it sees behind Vercel's reverse proxy, which is required for correct callback URL construction in production. `NEXTAUTH_URL` must equal the real public origin (for example `https://<app>.vercel.app`), because Google and GitHub compare the callback URL in the OAuth exchange against what is registered in their consoles. An optional `GOOGLE_REDIRECT_URI` env is threaded through as `redirectProxyUrl` so teams with a pre-registered exact URI can match it without hardcoding URLs in source. If any of these disagree, OAuth fails with redirect-mismatch errors even though the code is correct. The deployment doc calls this out: after the first Vercel deploy or a custom-domain change, update `NEXTAUTH_URL` and redeploy.

### Q20. Why is the blockchain integration fail-soft, and what does that imply?

Evidence anchoring on Polygon Amoy is optional for the prototype, so every blockchain call in `apps/web/lib/blockchain.ts` checks `isConfigured()` (RPC URL plus private key plus contract address) and returns `{ ok: false, status: "not_configured" }` instead of throwing. This lets the full demo (login, live analysis, alerts, evidence hashing) run on a machine with no wallet, no faucet MATIC, and no deployed contract. Verification in `apps/web/app/api/blockchain/verify/route.ts` recomputes the SHA-256 of the stored manifest and compares it with the on-chain `bytes32`, proving tamper-evidence of the record, not truth of the audio. The implication judges should hear: the chain adds provenance, but a green checkmark never means "this voice is human"; it means "this record is unchanged since registration".

## Hard questions (Q21-Q30)

### Q21. What is your threat model: which attacker capabilities do you defend against, and which do you explicitly not?

We defend against casual impersonation in authorized sessions: replayed clips, basic TTS output, and mismatched speakers are caught by the layered pipeline (AASIST-L spoof signal, ECAPA-TDNN speaker similarity, DSP anomaly features, policy risk engine). We defend against opportunistic web abuse through NextAuth sessions, middleware page guards, per-route auth checks, short-lived WS tokens, origin allowlists, and service-role confinement to server code (`apps/web/lib/db.ts`). We explicitly do not defend against adaptive adversaries with gradient access to our models, realtime adversarial perturbations crafted to fool AASIST-L, or attackers who compromise the operator's own device or browser. We also do not defend the transport beyond TLS provided by Vercel and Render, and out-of-domain model performance is weaker than benchmark numbers suggest.

```
  ATTACKER CAPABILITY            DEFENDED?   MECHANISM
  +---------------------------+-----------+------------------------------+
  | Replay a recorded clip    | YES       | AASIST-L + DSP + similarity  |
  | Basic TTS / voice clone   | PARTIAL   | spoof signal, not certainty  |
  | Wrong speaker on account  | YES       | ECAPA-TDNN similarity check  |
  | Unauthenticated page view | YES       | middleware.ts + auth()       |
  | Stale WS token reuse      | YES       | 60s expiry, HMAC (ws-token)  |
  | Adaptive adversarial ML   | NO        | out-of-domain weakness       |
  | Endpoint/device takeover  | NO        | out of scope                 |
  | Network TLS stripping     | NO        | delegated to Vercel/Render   |
  +---------------------------+-----------+------------------------------+
```

### Q22. If I replay a recording of an authorized speaker, what stops me? Walk through every layer.

No single layer stops them, which is the point: five independent signals must all agree before trust is granted. First the capture layer binds audio to a fresh realtime session with a 60-second HMAC token from `apps/web/app/api/ws-token/route.ts`, so a stale stream cannot simply be re-injected without a live authenticated session. Then DSP features (computed with Librosa and SciPy) flag channel artifacts that replayed audio carries, such as double compression, speaker coloration, and flat dynamics. AASIST-L produces a dedicated spoof signal rather than a verdict, ECAPA-TDNN compares the speaker embedding against the enrolled voiceprint, and the risk engine fuses everything into a policy band (LOW, MEDIUM, HIGH) that routes to human review instead of auto-blocking. A high-quality replay in a quiet room can still score ambiguously, which is why the operator stays in the loop.

```
  BROWSER (live session, 60s WS token)
     |
     v
  [1] SESSION BINDING -- fresh token? --NO--> reject (401/ended)
     | YES
     v
  [2] DSP ANOMALIES -- replay artifacts? --YES--> raise risk band
     |
     v
  [3] AASIST-L SPOOF SIGNAL -- synthetic traits? --YES--> raise risk band
     |
     v
  [4] ECAPA-TDNN SIMILARITY -- matches voiceprint? --NO--> raise risk band
     |
     v
  [5] RISK ENGINE -- fuse bands --> LOW | MEDIUM | HIGH
     |
     v
  HUMAN OPERATOR -- HIGH never auto-verdicts fraud, routes to review
```

### Q23. Who holds the registrar private key, and how is it kept out of the wrong hands?

Exactly one actor holds it: the server-side Next.js process, via the `BLOCKCHAIN_PRIVATE_KEY` environment variable read inside `apps/web/lib/blockchain.ts`. The module starts with `import "server-only"`, so any accidental client import fails the build instead of leaking the key into a bundle. The key is set in the Vercel dashboard (production) or `apps/web/.env.local` (dev), is listed as sensitive in `.env.example`, and is gitignored everywhere; `render.yaml` and the AI service never see it. On-chain, that key controls the registrar address recorded in the `EvidenceRegistered` event of `blockchain/contracts/VoiceIntegrityRegistry.sol`. The honest limitation: this is single-key custody with no multisig or HSM, acceptable for an Amoy testnet prototype but not for production evidence infrastructure.

```
  +------------------+   env only    +----------------------+
  | Vercel dashboard | ------------> | Next.js server proc  |
  | (BLOCKCHAIN_     |   never git   | lib/blockchain.ts    |
  |  PRIVATE_KEY)    |               | import "server-only" |
  +--------+---------+               +----------+-----------+
           |                                    | signs tx
           | build fails if imported            v
           | from client code        +----------------------+
           +-- X ----------------->  | BROWSER (no key,     |
                                     | only hashes shown)   |
                                     +----------------------+
```

### Q24. What happens if the Supabase service-role key leaks?

Treat it as a full database compromise, because the key bypasses every RLS policy by design (`apps/web/lib/db.ts` header comment says exactly this). The attacker can read all rows in `app_users` (including bcrypt hashes and emails), `oauth_accounts`, `password_reset_tokens` hashes, calls, analysis results, and evidence records, and can write or delete rows arbitrarily. The response is: rotate the key immediately in the Supabase dashboard (Settings, API), update `SUPABASE_SERVICE_ROLE_KEY` on Vercel and locally, redeploy, then audit `login_history` and `audit_events` for unfamiliar writes during the exposure window. Force password resets for all users since bcrypt hashes were exposed, and invalidate sessions by rotating `NEXTAUTH_SECRET` as well. Finally, find the leak vector (client bundle grep for the key, leaked `.env.local`, pasted log) and close it before declaring recovery.

```
  LEAK DETECTED (key in bundle, log, or pasted file)
     |
     +--> [1] ROTATE key in Supabase dashboard (old key dies)
     |
     +--> [2] UPDATE SUPABASE_SERVICE_ROLE_KEY on Vercel + local, redeploy
     |
     +--> [3] AUDIT login_history + audit_events for exposure-window writes
     |
     +--> [4] FORCE password resets (bcrypt hashes were readable)
     |
     +--> [5] ROTATE NEXTAUTH_SECRET to kill existing sessions
     |
     +--> [6] FIND vector (grep bundles, check git history) then close it
```

### Q25. Where are the gaps between row-level and app-level enforcement?

The gap is intentional but must be stated plainly: browser RLS policies in `supabase/migrations/full_schema.sql` are read-open (`USING (true)` for `anon` and `authenticated`), so any holder of the anon key can SELECT every row of every table through the Supabase client. Per-organization and per-role isolation therefore lives entirely in application code: middleware page guards (`apps/web/middleware.ts`), per-route `auth()` and role checks, and server routes that scope queries by `organization_members`. Writes are safe because browsers hold no write policy and mutations go through `createServiceClient()` server-side. But a curious authenticated user with the anon key can read rows outside their org by calling Supabase directly, bypassing our UI scoping. The fix for production is per-user RLS predicates keyed to JWT claims; until then we must never present RLS as the isolation boundary.

```
  BROWSER + anon key --SELECT--> POSTGRES (RLS: USING(true) = ALLOW ALL)
     |                                                        |
     | UI scoping (org filter)                        DIRECT API CALL
     | ONLY in app code                               SKIPS app code
     v                                                        v
  [ 보인다 only own org ]                        [ reads ANY org row ]
     +------------------+------------------+-----------------+
     | MUTATIONS (safe) | server routes via createServiceClient() |
     +------------------+------------------+-----------------+
  GAP = reads isolated by convention, not by database constraint.
```

### Q26. What is your dependency and supply-chain posture?

The web app pins dependencies through `package-lock.json` with npm workspaces, and the AI service pins its heavy stack (`torch` CPU build, `speechbrain`, `onnxruntime`, `librosa`, `fastapi`, `pydantic==2.11.3`) in `services/ai-service/requirements.txt`. Model weights are split by sensitivity: `model_artifacts/aasist-l.onnx` is committed for reproducible boot, while ECAPA-TDNN weights download once from Hugging Face and voiceprint embeddings are gitignored and never committed. The known sharp edge is documented in `render.yaml` and `docs/deployment/ai-service.md`: Render's Python 3.14 default lacks a `pydantic-core` wheel, so `PYTHON_VERSION=3.13.4` is pinned to avoid a source build failing on a read-only filesystem. Honest gaps: no lockfile hash verification ceremony, no private mirror, and a compromised upstream (PyPI, npm, Hugging Face weights) would flow into the next build, so production needs SBOM generation plus weight-hash pinning.

```
  SOURCE            PINNING                    VERIFY STEP
  +--------------+  +-----------------------+  +---------------------+
  | npm registry |->| package-lock.json     |->| npm ci blocks drift |
  +--------------+  +-----------------------+  +---------------------+
  | PyPI         |->| requirements.txt pins |->| PYTHON_VERSION 3.13 |
  +--------------+  +-----------------------+  +---------------------+
  | Hugging Face |->| ECAPA weights (1st    |->| MISSING: hash pin   |
  | weights      |  | boot download)        |  | (production TODO)   |
  +--------------+  +-----------------------+  +---------------------+
  | Local voice- |->| gitignored, ephemeral |->| never in git        |
  | prints       |  | disk on Render        |  | (privacy win)       |
  +--------------+  +-----------------------+  +---------------------+
```

### Q27. How could someone abuse the public demo, and what caps the damage?

The abuse surfaces are spam signaling rooms, WebSocket connection floods, expensive inference loops, mass account registration, and faucet-drained Amoy writes. The caps are layered but thin: the AI service enforces `WS_MAX_CONNECTIONS_PER_IP=5` plus `WS_ROOM_TTL_SECONDS=600` and `WS_SESSION_TTL_SECONDS=300` so rooms and sessions self-destruct (`docs/deployment/ai-service.md` env reference), short 60-second WS tokens from `apps/web/app/api/ws-token/route.ts` force re-authentication for every fresh session, and registration validates input and returns 409 on duplicate emails (`apps/web/app/api/auth/register/route.ts`). Blockchain abuse is capped by failing soft when unconfigured and by Amoy faucet scarcity when configured. Honest gap: there is no CAPTCHA, no per-account rate limit on registration or room creation, and Render free tier gives no WAF, so a determined abuser can still burn our 750 instance-hours or pollute demo data before we notice.

```
  ABUSE                    CAP                              RESIDUAL RISK
  +----------------------+-------------------------------+------------------+
  | WS connection flood  | MAX_CONNECTIONS_PER_IP=5      | distributed IPs  |
  +----------------------+-------------------------------+------------------+
  | Room spam            | ROOM_TTL 600s, SESSION_TTL    | re-create loops  |
  |                      | 300s auto-expiry              | (no CAPTCHA)     |
  +----------------------+-------------------------------+------------------+
  | Inference cost burn  | 3s chunks, lazy speaker model | free-tier hours  |
  +----------------------+-------------------------------+------------------+
  | Mass registrations   | email validation + 409 dupes  | no rate limit    |
  +----------------------+-------------------------------+------------------+
  | Chain spam           | fail-soft + faucet scarcity   | wallet drain if  |
  |                      |                               | key overfunded   |
  +----------------------+-------------------------------+------------------+
```

### Q28. The demo breaks live on stage. What is the ordered recovery checklist?

Do not debug randomly: run the checklist top to bottom, narrating each step so judges see engineering discipline rather than panic. First confirm which tier failed by curling `/health` on the AI service and loading a static page on Vercel, because the fix for a Render cold start differs completely from a Supabase outage. Then warm or reconnect (wait out the roughly 1-minute Render spin-up, re-create the signaling room since TTLs may have expired), fall back to pre-recorded audio-lab results if live capture stays down, and drop blockchain verification to fail-soft narration if Amoy or the faucet is unreachable. Keep talking through the evidence hash story the whole time: the SHA-256 comparison in `apps/web/app/api/blockchain/verify/route.ts` is explainable from screenshots alone.

```
  DEMO DOWN
     |
     v
  [1] NAME IT -- "looks like the AI tier is cold, warming it now"
     |
     +-- curl Render /health -- FAIL --> [2] WAIT ~60s, retry, re-create room
     |                                   (ROOM_TTL may have expired)
     |
     +-- Vercel page fails -----------> [2b] CHECK Supabase status + env,
     |                                   show cached dashboard screenshot
     |
     +-- Mic denied ------------------> [2c] address-bar lock icon, enable,
                                         refresh (runbook troubleshooting)
     |
     v
  [3] FALLBACK -- pre-recorded /lab/audio results + saved evidence JSON
     |
     v
  [4] NARRATE -- "hash recompute still verifies; chain step is optional"
     |
     v
  [5] LOG IT -- note failure + timestamp for post-demo postmortem
```

### Q29. How is evidence integrity proven without putting voice data on-chain?

Only a SHA-256 digest ever leaves the application: `apps/web/app/api/evidence/route.ts` canonicalizes the evidence manifest with `JSON.stringify` and stores `createHash("sha256").update(...).digest("hex")` alongside the record. Registration in `apps/web/lib/blockchain.ts` converts that digest to the `bytes32` the `VoiceIntegrityRegistry` contract expects and submits `registerEvidence`, so the chain holds hashes and timestamps, never audio or embeddings, exactly as `AGENTS.md` No-Go rules require. Verification in `apps/web/app/api/blockchain/verify/route.ts` recomputes the hash from the stored manifest and compares it with the on-chain value: equality proves the record is unchanged since registration. Determinism depends on canonical serialization, so any field reordering or float reserialization that changes the JSON string would change the hash and must be regression-tested.

```
  SESSION RESULTS (scores, metrics, timestamps)
     |
     v
  CANONICAL MANIFEST (JSON.stringify, fixed field order)
     |
     +-- SHA-256 --> evidence_hash (stored in evidence_records)
     |
     +-- toBytes32 --> registerEvidence() --> POLYGON AMOY
     |                                          (hash + time only)
     v
  VERIFY: recompute SHA-256 from manifest == on-chain bytes32 ?
     +-- EQUAL --> "unchanged since registration"
     +-- DIFF  --> "tampered or re-serialized, investigate"
```

### Q30. What will you refuse to claim about the models, and why does that make the demo stronger?

We refuse four claims per `AGENTS.md` Model Limitations: that AASIST-L detects every future cloning method, that out-of-domain accuracy matches benchmark accuracy, that loudness or dynamics prove humanness, and that our 0-100 risk score is a calibrated probability. AASIST-L is an anti-spoofing signal with known out-of-domain degradation, speaker similarity shifts with channel, noise, duration, and language, and the risk band is a policy fusion, not a fraud probability, which is why the UI must say "spoof signal" or "model score" instead of "87 percent fake". The human operator stays in the workflow for every high-impact decision, and raw audio plus embeddings stay off-chain and out of logs. Stating these limits on stage is a strength: it shows we understand evaluation methodology, calibration, and the difference between a demo signal and a production verdict.

```
  MODEL OUTPUT            HONEST LABEL              FORBIDDEN LABEL
  +---------------------+-------------------------+------------------+
  | AASIST-L score      | "spoof signal 0.82"     | "87% fake"       |
  +---------------------+-------------------------+------------------+
  | ECAPA similarity    | "similarity 0.71 vs     | "voice verified" |
  |                     | enrolled voiceprint"    |                  |
  +---------------------+-------------------------+------------------+
  | DSP metrics         | "anomaly features"      | "proof of human" |
  +---------------------+-------------------------+------------------+
  | Risk 0-100          | "policy band: HIGH,     | "fraud verdict"  |
  |                     | route to review"        |                  |
  +---------------------+-------------------------+------------------+
  | Out-of-domain audio | "weaker than benchmark, | "works on any   |
  |                     | needs calibration"      | call, any phone"|
  +---------------------+-------------------------+------------------+
```

## Rapid-fire one-liners

| # | Question | One-line answer |
|---|----------|-----------------|
| 1 | Who authenticates users? | NextAuth in `apps/web/auth.ts`; Supabase is database-only, `auth.users` is never used. |
| 2 | Where is the service-role key? | Server env only, loaded by `apps/web/lib/db.ts`; never prefixed `NEXT_PUBLIC_`, never in bundles. |
| 3 | What does RLS actually enforce? | Read-only browser SELECT policies; all writes go through service-role server routes. |
| 4 | How is OAuth linked? | `provisionOAuthUser()` upserts `(provider, provider_account_id)` in `oauth_accounts`. |
| 5 | How are passwords stored? | `bcrypt.hash(password, 12)` in the register route; compare-only at login, null hash for OAuth-only accounts. |
| 6 | How are reset tokens stored? | SHA-256 `token_hash` plus expiry plus single-use `used_at`; plaintext sent once, never stored. |
| 7 | How is realtime authorized? | 60-second HMAC JWT from `/api/ws-token`, verified with shared `WS_TOKEN_SECRET` on both tiers. |
| 8 | What never gets logged? | Raw audio, tokens, passwords, private keys, excess PII, per `AGENTS.md` Security Rules. |
| 9 | Where does the mic state show? | Explicit `/live` capture states (on, paused, denied, unsupported, disconnected); no hidden recording, no PSTN claims. |
| 10 | What goes on-chain? | Only SHA-256 `bytes32` digests plus timestamps; audio and embeddings never touch the chain. |

## 60-second demo script

1. Click `/login`, sign in with the seeded demo account. Say: "NextAuth with our own user tables; Supabase here is database-only, not the identity provider." Fallback: if OAuth is down, use email plus password and keep moving.
2. Click `/dashboard`, point at risk bands. Say: "Scores are policy outputs, not fraud probabilities; HIGH routes to a human reviewer." Fallback: open a saved screenshot if data is still loading.
3. Click `/live`, press "Start Capture", grant mic, speak for five seconds. Say: "Explicit browser permission, visible capture state, chunks analyzed in memory." Fallback: if the mic is denied, use the address-bar lock icon once, then switch to a pre-uploaded file.
4. Point at the spoof signal and similarity numbers. Say: "AASIST-L gives a spoof signal, ECAPA-TDNN gives similarity; neither alone is a verdict." Fallback: if Render is cold, narrate the previous run's saved results while `/health` warms up.
5. Click `/blockchain`, verify one evidence record. Say: "We recompute the SHA-256 and compare it on Amoy; the chain proves the record is unchanged, not that the voice is human." Fallback: if Amoy is unreachable, show the local hash equality check and call the chain step optional by design.
