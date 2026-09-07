# Deployment Troubleshooting

Cross-cutting issues when the three pieces (Vercel, Supabase, AI service) talk
to each other. Local-only issues are in the AI service docs and the trainer
docs.

## Symptom → fix table

| Symptom | Likely cause | Fix |
|---|---|---|
| Dashboard loads but Live page won't create a room | Supabase `calls` insert blocked | Check RLS on `calls`; `NEXT_PUBLIC_SUPABASE_ANON_KEY` correct; run migrations `006`/`007` |
| "Signaling server unreachable" in call UI | `NEXT_PUBLIC_AI_SERVICE_URL` wrong or service down | `curl https://<ai>/health`; check Vercel env |
| WS connects but immediately "Origin not allowed" | `WS_ALLOWED_ORIGINS` missing your app's domain | Add `https://<your-app>.vercel.app` to `WS_ALLOWED_ORIGINS` (and preview domains) |
| Realtime WS auth fails (401 / "Invalid or expired token") | `WS_TOKEN_SECRET` differs between Vercel and AI service | Set the **same** value on both; redeploy both |
| Call connects but no chunks / dashboard stays "waiting for remote audio" | Analysis never started because remote stream didn't arrive; or CORS blocks the WS | Check the browser console for WS errors; verify the caller's mic was granted; confirm `remoteStream` arrived (audio element hears the caller) |
| Dashboard analyzes the host's own voice / shows host speaking when muted | Host's analysis started before the remote stream (old bug) | This is fixed: analysis now only starts once the caller's stream arrives (`requireStream`). Redeploy the web app. |
| Joiner always "YOU'RE SILENT" on the same PC | Both browsers grabbed the same mic; or second browser's mic capture failed | Use the **mic picker** on both browsers to select distinct devices; check the browser's mic permission |
| `POST /api/risk-events` returns 500 | RLS missing for `analysis_results` insert, or `calls` row not found for the org | Check RLS policies; confirm the call row exists in the caller's org |
| Chunk values all "—" or "silence" | Silence gate: no speech in chunks | Speak closer to the mic; check mic level in the Self Monitor; try `AASIST-L only` model |
| Voiceprint "enrolled: false" after training | Voiceprint file lives on Render's ephemeral disk and was reset on deploy | Re-upload after each deploy (see [ai-service.md](ai-service.md) → Persisting the voiceprint) |
| High risk when a real person talks | Outdated web bundle (old inverted AASIST mapping) | Redeploy web app; verify `spoof_detection.normalized_score` is high (~80+) for real speech |
| `JsonRpcProvider failed to detect network` spam | Blockchain env set but RPC unreachable, or old provider config | Now fixed (known network passed to the provider); omit blockchain env vars to disable entirely |
| "Failed to send WebSocket message" spam in AI logs | Sending after a socket closed | Fixed with a client-state guard; harmless noise otherwise |
| AI service OOM restarts on Render | 512 MB free tier + torch/speechbrain | Pick "AASIST-L only" in Settings → Model (skips ECAPA), or run locally/tunnel (Option B) |
| Cold start makes calls drop | Render spins down after ~15 min idle | Expected on free tier; re-create the room after the service wakes (~1 min) |

## Browser console quick checks

- **Host tab**: no errors on `/v1/webrtc/<room>` or `/v1/realtime/<session>`;
  the Waveform moves when the **caller** speaks; chunk table fills with values.
- **Caller tab**: "YOUR VOICE IS BEING ANALYZED" badge + Self Monitor level
  moves when they speak.
- Network tab: `analysis_complete` messages arrive every ~3–5s.

## Still broken? Capture these

1. Browser console errors from both tabs (host + caller).
2. AI service logs (Render → service → Logs).
3. Vercel function logs (Deployments → Function Logs) for `/api/risk-events`.
4. Supabase logs (Database → Logs) for RLS-denied queries (they log as 401/403
   with RLS hints).

Include those in any bug report for a fast fix.