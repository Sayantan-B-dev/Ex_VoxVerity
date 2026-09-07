# VoxVerity Deployment Guide — 100% Free Tier

Deploy the whole platform **for $0/month** across three providers:

| Component | Hosting | Free tier | Doc |
|---|---|---|---|
| Web app (Next.js 16) | **Vercel** (Hobby) | Free, 100 GB-bandwidth/mo, serverless functions | [vercel.md](vercel.md) |
| Database + Auth + Realtime | **Supabase** (Free) | 500 MB Postgres, 50 MB storage, 2 projects | [supabase.md](supabase.md) |
| AI service (FastAPI) | **Render** (Free web service) | 750 instance-hrs/mo, spins down on idle | [ai-service.md](ai-service.md) |
| Blockchain (optional) | Polygon Amoy testnet | Free RPCs (Amoy public RPC / Alchemy free) | — |

> Free-tier facts checked Sept 2026: **Render** still has a real free tier
> (Railway and Fly.io removed theirs — don't use them for a free deploy).
> Vercel Hobby and Supabase Free remain free for small usage.

## Architecture

```
┌─────────────────────────────┐
│   Browser (2 tabs/browsers) │  Host: creates room + dashboard
│                             │  Caller: joins, voice is analyzed
└───────┬──────────────┬──────┘
        │ HTTP/HTTPS   │ WebSocket (direct)
        ▼              ▼
┌────────────────┐  ┌───────────────────────────────┐
│  Vercel        │  │  Render (AI service)          │
│  Next.js app   │  │  /v1/realtime, /v1/webrtc     │
│  /api/* routes │  │  /v1/voiceprint/status        │
└───────┬────────┘  └───────────────────────────────┘
        │ Supabase PostgREST + Realtime (HTTPS/WSS)
        ▼
┌─────────────────────────────┐
│  Supabase (free)            │
│  Postgres + Auth + Realtime │
└─────────────────────────────┘
```

Why this works on serverless:
- **Vercel never needs WebSockets.** The browser talks to the AI service's
  WebSockets **directly** (via `NEXT_PUBLIC_AI_SERVICE_URL`). Next.js itself
  only does HTTP API routes + Supabase Realtime (which Supabase hosts).
- **Supabase hosts its own Realtime** (Postgres changes over WSS) — no extra
  server needed for the live dashboard feed.

## Environment variables (master list)

### Vercel (web app) — project settings → Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` | public, safe in browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from Supabase | public, safe in browser |
| `NEXTAUTH_URL` | `https://<your-app>.vercel.app` | NextAuth |
| `NEXTAUTH_SECRET` | random 32+ chars | `openssl rand -base64 32` |
| `NEXT_PUBLIC_AI_SERVICE_URL` | `https://<your-ai-service>.onrender.com` | browser → AI service |
| `AI_SERVICE_URL` | same as above | server → AI service |
| `AI_SERVICE_API_KEY` | any strong secret | optional bearer for server calls |
| `WS_TOKEN_SECRET` | **must equal the AI service's `WS_TOKEN_SECRET`** | shared HMAC for WS auth |
| `BLOCKCHAIN_RPC_URL` | Amoy RPC (optional) | omit to disable blockchain |
| `BLOCKCHAIN_PRIVATE_KEY` | testnet wallet key (optional) | server-only, never in client |
| `VOICE_REGISTRY_ADDRESS` | deployed contract (optional) | omit to disable |

### Render (AI service) — service env vars

| Variable | Value |
|---|---|
| `CORS_ORIGINS` | `https://<your-app>.vercel.app,http://localhost:3000` |
| `WS_ALLOWED_ORIGINS` | same list |
| `WS_TOKEN_SECRET` | **same value as Vercel's `WS_TOKEN_SECRET`** |
| `DEBUG` | `false` |
| `PORT` | `8000` |

## End-to-end data flow (why the pieces connect)

1. Caller creates room → `POST /api/call-rooms` (Vercel → Supabase).
2. Both browsers open WebSockets to **Render** (`/v1/webrtc/<room>`) with a
   token minted by `POST /api/ws-token` (signed with `WS_TOKEN_SECRET`).
3. WebRTC audio flows browser-to-browser (STUN only — works across the
   internet via host candidates / TURN if needed).
4. Host's dashboard opens `/v1/realtime/<session>` (Render), chunks the
   **caller's remote stream** every 3s.
5. Render analyzes → `analysis_complete` → host dashboard displays metrics.
6. Each chunk is also posted to `POST /api/risk-events` (Vercel) which
   recomputes + persists to Supabase (`analysis_results`, `calls`, `alerts`).
7. Supabase Realtime pushes any new alert rows to the dashboard.

## Cost & limits cheat-sheet

| Provider | Limit | What to watch |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth/mo, 100 serverless executions/day (soft) | analytics-heavy dashboards |
| Supabase Free | 500 MB DB, 50 MB storage, 2 projects, 500K realtime events? (fair-use) | don't store audio |
| Render Free | 750 instance-hrs/mo (~1 service), 512 MB RAM, spins down after ~15 min idle | cold start ~1 min; 1 service only |

## Next steps

1. [Deploy Supabase](supabase.md) → run migrations → copy keys.
2. [Deploy the AI service](ai-service.md) → get its URL.
3. [Deploy the web app](vercel.md) → set env vars → point at both.
4. [Troubleshooting](troubleshooting.md) if anything breaks.