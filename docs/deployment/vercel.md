# Deploying the Web App on Vercel (free)

The Next.js app (`apps/web`) is a monorepo workspace. Vercel Hobby is free.

## 1. Push the repo to GitHub

```bash
git remote add origin https://github.com/<you>/voxverity.git
git push -u origin main
```

## 2. Import into Vercel

1. [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. Pick the repo. Vercel auto-detects the monorepo:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (leave default)
   - **Install Command**: `npm install` (leave default; workspaces install at root)
3. **Environment Variables** — add the master list from the
   [deployment README](README.md#environment-variables-master-list):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
   | `NEXTAUTH_URL` | `https://<your-app>.vercel.app` (after first deploy you can update) |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
   | `NEXT_PUBLIC_AI_SERVICE_URL` | `https://<your-ai-service>.onrender.com` (see [ai-service.md](ai-service.md)) |
   | `AI_SERVICE_URL` | same |
   | `WS_TOKEN_SECRET` | a strong random secret — **copy the exact value** into the AI service's env too |
   | `BLOCKCHAIN_RPC_URL` / `BLOCKCHAIN_PRIVATE_KEY` / `VOICE_REGISTRY_ADDRESS` | optional — omit for a pure-free deploy |
4. **Deploy**. The first build takes a few minutes.

> Domain: you get `https://<project>.vercel.app` free. If you use a custom
> domain, set `NEXTAUTH_URL` to it (Settings → Environment Variables → Redeploy).

## 3. Post-deploy checks

- Visit the deployed URL → register a test account.
- Dashboard loads (Supabase keys + RLS working).
- `/live` page loads and the mic picker lists devices.
- The AI service must be reachable: see [ai-service.md](ai-service.md) for
  deploying it **first**, then set `NEXT_PUBLIC_AI_SERVICE_URL` and redeploy.

## 4. Common Vercel gotchas

| Issue | Fix |
|---|---|
| "Error: No Next.js version could be detected" | Root Directory must be `apps/web` |
| Calls work but live analysis doesn't | `NEXT_PUBLIC_AI_SERVICE_URL` wrong, or the AI service CORS/origin allowlist missing your Vercel domain |
| `NEXTAUTH_SECRET` missing | generates a random secret each restart → sessions break; set it explicitly |
| WS auth fails (401 on realtime) | `WS_TOKEN_SECRET` differs between Vercel and the AI service |
| 500 on `/api/risk-events` | RLS policy missing for `analysis_results`/`calls` inserts from your org |
| Slow cold starts | Vercel Hobby cold starts are normal; keep dashboard polling light |

## 5. Redeploying after changes

- Push to `main` → Vercel auto-deploys production.
- Env var changes need a redeploy: Settings → Environment Variables → save →
  "Redeploy" from the Deployments tab.
- Preview deployments are free on Hobby and get their own URL (add that URL
  to the AI service's `CORS_ORIGINS`/`WS_ALLOWED_ORIGINS` to test from
  previews).