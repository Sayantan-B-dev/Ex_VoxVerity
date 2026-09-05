# VoxVerity — Welcome Back Context

> This file captures the project state as of the last session.
> A new agent can read this + phases.md + AGENTS.md to resume exactly where we left off.

## Current Status

- **Last completed phase:** Phase 20 — DSP Analysis v1
- **Next phase:** Phase 21 — Human-pattern Demo Signal
- **Total phases:** 40 (20 done, 20 remaining)
- **Last commit:** `30fb992` feat: add dsp analysis
- **GitHub repo:** https://github.com/Sayantan-B-dev/Ex_VoxVerity

## How to Resume

Start a new session and say:
```
Continue VoxVerity project. Read WelcomeBack.md, phases.md, AGENTS.md, 
and project_info.md. The next unchecked phase is Phase 21. 
Build it, run npm run build to verify, then commit. 
No AI-generated footers in commits.
```

## Project Architecture

```
voxverity2/
├── apps/web/              # Next.js 16 frontend (TypeScript)
│   ├── app/               # App Router pages
│   │   ├── (public)/      # Landing, help, status
│   │   ├── (auth)/        # Login, register, forgot/reset password
│   │   ├── (protected)/   # All authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── live/
│   │   │   ├── calls/
│   │   │   ├── analysis/
│   │   │   ├── alerts/
│   │   │   ├── incidents/
│   │   │   ├── verification/
│   │   │   ├── lab/
│   │   │   ├── settings/
│   │   │   └── admin/
│   │   └── api/auth/[...nextauth]/
│   ├── auth.ts            # Auth.js config (Google, GitHub, Credentials)
│   ├── components/        # icons.tsx, auth-status.tsx, providers.tsx
│   ├── lib/               # supabase/client.ts, supabase/server.ts, supabase/queries.ts, ai-service.ts
│   ├── middleware.ts       # Auth.js session protection
│   └── styles/            # variables.css, reset.css, typography.css, layout.css, components.css
├── services/ai-service/   # Python FastAPI backend
│   ├── app/
│   │   ├── main.py        # FastAPI app with /health, /ready, /version
│   │   ├── api/routes.py  # /v1/sessions, /v1/analyze/file, /v1/models
│   │   ├── core/config.py # Pydantic settings
│   │   └── dsp/analyzer.py # WAV decoder, RMS, dBFS, ZCR, spectral centroid, etc.
│   ├── tests/             # test_health.py, test_dsp.py
│   └── requirements.txt   # FastAPI, uvicorn, pydantic, httpx, pytest
├── blockchain/            # Empty (Phase 32+)
├── supabase/
│   └── migrations/        # 001_initial_auth_and_profiles.sql, 002_full_schema.sql
├── docs/
│   ├── build-status.md
│   └── phases/phase-01.md
├── AGENTS.md              # Agent constitution (rules, phase discipline, security)
├── plan.md                # Master phase map (all 40 phases)
├── design.md              # UX spec, risk semantics, privacy rules
├── phases.md              # Checkbox tracker (1-20 done)
├── project_info.md        # Full SRS and engineering plan
└── package.json           # Root workspace config
```

## Key Decisions Made

1. **Auth:** Switched from Supabase Auth to Auth.js (NextAuth v5). Supabase is database-only.
2. **Icons:** All emojis replaced with inline SVG icons in `components/icons.tsx`.
3. **Build check:** AGENTS.md rule — `npm run build` must pass before every commit.
4. **No bot footers:** Commit messages must NOT contain "Generated with Codebuff" or "Co-Authored-By" lines.
5. **Git user:** Sayantan-B-dev / sayantanbharati611@gmail.com

## Environment Setup

1. Run the SQL migrations in Supabase SQL Editor:
   - `supabase/migrations/001_initial_auth_and_profiles.sql`
   - `supabase/migrations/002_full_schema.sql`
2. Update `apps/web/.env.local` with your Supabase credentials
3. Add OAuth credentials to `.env.local`:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   - `AUTH_SECRET` (already set)
4. Run: `npm install` then `npm run dev`

## Remaining Phases (21-40)

| # | Phase | Key Deliverable |
|---|-------|-----------------|
| 21 | Human-pattern Demo Signal | Heuristic acoustic behavior descriptor |
| 22 | Pretrained AASIST-L Integration | Anti-spoofing model wrapper |
| 23 | AASIST Evaluation and Calibration | Evaluation report, signal normalization |
| 24 | Speaker Enrollment and ECAPA-TDNN | Speaker similarity checking |
| 25 | Analysis Aggregation and Versioning | Structured AnalysisResult schema |
| 26 | Risk Engine v1 | Deterministic 0-100 scoring |
| 27 | Realtime WebSocket Audio Pipeline | 3-second chunk streaming |
| 28 | WebRTC Controlled Demo Call | Browser-to-browser demo |
| 29 | Realtime DSP Dashboard | Live waveform and metrics |
| 30 | Alerts and Secondary Verification | Threshold triggers, human workflow |
| 31 | Incident and Evidence Package | SHA-256 evidence hashing |
| 32 | Blockchain Evidence Registry | Solidity contract on Polygon Amoy |
| 33 | Audit and Governance | Audit trail, model registry |
| 34 | Integrations Framework | Audio source adapter interface |
| 35 | Multilingual and Accent Readiness | Language metadata, evaluation hooks |
| 36 | Analytics and Threat Intelligence | Dashboard analytics |
| 37 | Security Hardening | Headers, validation, rate limits |
| 38 | Performance and Reliability | Latency measurement, backpressure |
| 39 | End-to-End Demo and Runbook | Repeatable demo scenario |
| 40 | Production-Shaped Finalization | Deployment, release candidate |


freebuff --continue 2026-09-04T18-09-57.546Z