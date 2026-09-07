# Deploying the AI Service (free)

The AI service is FastAPI + Python 3.13 with heavy dependencies
(torch, speechbrain, onnxruntime, librosa, scipy) and runs:
- **REST**: `/v1/*` (models, voiceprint status, analytics, speaker endpoints)
- **WebSockets**: `/v1/realtime/{session}` (analysis) and `/v1/webrtc/{room}` (call signaling)

Because Railway and Fly.io removed their free tiers, the two realistic free
options are **Render free web service** (primary) and a **local machine /
home server** (zero cost, always on for you).

---

## Option A — Render (recommended free host)

Render's free web service: 750 instance-hours/month, 512 MB RAM, spins down
after ~15 min of inactivity (~1 min cold start). 512 MB is enough for CPU
inference of AASIST-L + ECAPA-TDNN on 3s chunks.

### A1. Prepare the repo

Make sure `services/ai-service` is self-contained for a build:

1. `requirements.txt` at the root of the service directory (it is).
2. `model_artifacts/aasist-l.onnx` — **committed to git** (it already is).
3. The voiceprint is NOT committed (it's user-generated, `voiceprints/*` is
   gitignored). It lives on the ephemeral disk, so re-upload after each
   deploy — see "Persisting the voiceprint" below.

### A2. Create the service

1. [render.com](https://render.com) → **New** → **Web Service**.
2. Connect the GitHub repo.
3. Settings:
   - **Root Directory**: `services/ai-service`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free
4. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `PYTHON_VERSION` | `3.13.4` — **required.** Render defaults to Python 3.14, which has no prebuilt `pydantic-core` wheel, so the build fails in `maturin`/cargo (see Troubleshooting below). |
   | `CORS_ORIGINS` | `https://<your-app>.vercel.app,http://localhost:3000` |
   | `WS_ALLOWED_ORIGINS` | same as above |
   | `WS_TOKEN_SECRET` | **exact same value as Vercel's `WS_TOKEN_SECRET`** |
   | `DEBUG` | `false` |
   | `PORT` | `8000` (Render injects `$PORT`; uvicorn uses it) |
5. **Create Web Service**. First deploy downloads model weights (speechbrain
   fetches `spkrec-ecapa-voxceleb` from Hugging Face on first load) — allow a
   few minutes.

### A3. Persisting the voiceprint

Render's free disk is **ephemeral** — `voiceprints/` resets on every deploy.
Options:

1. **Upload after deploy** (simplest): train locally with
   `python scripts/train_voiceprint.py`, then copy the two files onto the
   running service. Render free tier has no SSH; instead:
   - Add a tiny one-off endpoint locally that you remove afterwards, **or**
   - Store the voiceprint in **Supabase Storage** (free 50 MB) and add a small
     startup step: `GET /v1/voiceprint/status` checks the local file, and on
     boot the service can pull `voiceprint.npz` from Supabase Storage with a
     short-lived token. (Not yet implemented — a small `download.py` hook is
     the clean way to add it.)
2. **Commit it** (not recommended): the embedding is biometric data; committing
   it to git is a privacy/security smell. Only for throwaway demos.

### A4. Verify

```bash
curl https://<your-ai-service>.onrender.com/health        # {"status":"healthy"}
curl https://<your-ai-service>.onrender.com/v1/models     # models + voiceprint
curl https://<your-ai-service>.onrender.com/v1/voiceprint/status
```

Then set `NEXT_PUBLIC_AI_SERVICE_URL` / `AI_SERVICE_URL` on Vercel to
`https://<your-ai-service>.onrender.com` and redeploy the web app.

### A5. Free-tier realities
| Item | Reality |
|---|---|
| Spin-down | After ~15 min idle; first request cold-starts in ~1 min. WebSocket calls will reconnect — the app handles it (status → ended → re-create room). |
| 512 MB RAM | Enough for CPU inference, but speechbrain+torch load is heavy. If you see OOM restarts, stop the ECAPA model via the Settings → Model tab ("AASIST-L only" still works) or use Option B. |
| 750 hrs/mo | One always-on service uses ~730 hrs/month — you get exactly one free service. |
| Bandwidth | Fine for 3s × 48 KB chunks per call session. |

### A6. Troubleshooting

**Build fails on `pydantic-core` / `maturin` / `Read-only file system`:**
you are on Python 3.14 (Render's current default). Pinned `pydantic==2.11.3`
resolves to `pydantic-core==2.33.1`, which ships no `cp314` wheel, so pip
tries to compile it from source and dies in `cargo`. Fix: set the
`PYTHON_VERSION` environment variable to `3.13.4` in the Render dashboard
(or use the repo's `render.yaml` Blueprint, which already pins it), then
**Manual Deploy → Clear build cache & deploy**.

**Faster, repeatable setup:** instead of configuring the service by hand,
use **New → Blueprint** and point Render at this repo — `render.yaml` sets
the root directory, build/start commands, health check, and `PYTHON_VERSION`.
You only add the three secrets (`CORS_ORIGINS`, `WS_ALLOWED_ORIGINS`,
`WS_TOKEN_SECRET`) in the dashboard afterwards.

---

## Option B — Local machine / home server (zero cost, no cold starts)

Run the exact dev setup but expose it:

```bash
cd services/ai-service
pip install -r requirements.txt
python scripts/train_voiceprint.py        # train your voiceprint
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then point the web app at it:

- If testing from the same machine: `NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000`
- From other devices on your LAN: use your machine's LAN IP and add it to
  `CORS_ORIGINS`/`WS_ALLOWED_ORIGINS` (the defaults already include
  `192.168.1.5:3000`; change to yours).
- From the public internet (Vercel): you need a tunnel —
  [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
  (free) gives you a stable public HTTPS/WS URL:
  ```bash
  cloudflared tunnel --url http://localhost:8000
  ```
  Use the printed `https://<random>.trycloudflare.com` as
  `NEXT_PUBLIC_AI_SERVICE_URL` and add it to both CORS env vars.

> Tunnels work, but the URL changes each restart with the free random domain —
> fine for demos. For something durable, Option A (Render) is better.

---

## Environment variable reference (AI service)

| Variable | Default | Purpose |
|---|---|---|
| `CORS_ORIGINS` | localhost:3000 list | HTTP CORS allowlist (comma-separated) |
| `WS_ALLOWED_ORIGINS` | localhost:3000/3001 list | WebSocket origin allowlist |
| `WS_TOKEN_SECRET` | `dev-ws-token-secret` | HMAC secret shared with Next.js `/api/ws-token` — **change it in production** |
| `WS_MAX_CONNECTIONS_PER_IP` | 5 | per-IP WS cap |
| `WS_ROOM_TTL_SECONDS` | 600 | signaling room TTL |
| `WS_SESSION_TTL_SECONDS` | 300 | realtime session TTL |
| `DEBUG` | `false` | — |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | bind address |

> **Security:** never ship the default `dev-ws-token-secret`. Generate one
> (`openssl rand -base64 32`) and set it identically on Vercel and Render.

## Model dependencies (installed by requirements.txt)

- `torch>=2.0` (CPU build is fine), `numpy`, `scipy`
- `speechbrain>=1.0` (ECAPA-TDNN embeddings; downloads weights from HF once)
- `onnxruntime` (AASIST-L)
- `librosa`, `sounddevice` (trainer app only — not needed at runtime, but
  harmless to include)
- `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`,
  `python-dotenv`, `httpx`

## Testing the deployed service

```bash
# Live WebSocket smoke test with curl's websocket support (or a tiny python script)
python - <<'EOF'
import asyncio, json, base64, numpy as np, websockets
# pip install websockets if needed
async def main():
    async with websockets.connect("wss://<your-ai-service>.onrender.com/v1/realtime/test-1111-1111-1111-111111111111") as ws:
        await ws.send(json.dumps({"type": "hello"}))
        await ws.send(json.dumps({"type": "start_session", "source": "microphone", "model": "aasist"}))
        tone = (np.sin(2*np.pi*440*np.arange(16000*3)/16000)*0.5).astype(np.float32)
        pcm = (tone*32767).astype(np.int16).tobytes()
        await ws.send(json.dumps({"type": "audio_chunk", "sequence": 1, "audio_b64": base64.b64encode(pcm).decode(), "encoding": "pcm_s16le", "sample_rate": 16000}))
        for _ in range(3):
            print((await asyncio.wait_for(ws.recv(), 30))[:200])
asyncio.run(main())
EOF
```