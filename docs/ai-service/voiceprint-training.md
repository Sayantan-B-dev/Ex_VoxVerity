# Voiceprint Trainer — "Train with your voice"

A small Python desktop app (tkinter) that records your voice and trains a
speaker voiceprint the pipeline uses to score **Speaker Similarity** on live
calls. Files:

- App: `services/ai-service/scripts/train_voiceprint.py`
- Manager: `services/ai-service/app/models/voiceprint.py`
- Embedder: `services/ai-service/app/models/ecapa_wrapper.py` (ECAPA-TDNN via SpeechBrain)

## How it works

1. **Record** — record a continuous ~60s take or several short parts
   (15s each). Speak clearly, away from noise. A live level meter shows input.
2. **Segment** — the recording is split into ~3s windows (the same cadence as
   live analysis). Silent/low-energy segments are dropped.
3. **Embed** — each segment is embedded with ECAPA-TDNN → 192-dim vector.
4. **Train** — embeddings are L2-normalized and averaged into one centroid
   voiceprint, saved to:
   - `services/ai-service/model_artifacts/voiceprints/voiceprint.npz`
   - `services/ai-service/model_artifacts/voiceprints/voiceprint.json` (meta)
5. **Test** — record ~5s and verify against the voiceprint (shows similarity %
   and match/confidence).
6. **Reset** — deletes the enrollment and clears the recording buffer.

The AI service picks the voiceprint up **immediately** (it reloads on file
change) — no restart needed. Live chunks are then compared against it.

## Run it

```bash
cd services/ai-service
pip install sounddevice          # only dependency beyond the service's own
python scripts/train_voiceprint.py
```

A window opens:

```
Train with your voice
Voiceprint name: [default]                    0.0s recorded
[▬▬▬ level meter ▬▬▬]
[Record 60s] [Record 15s part] [Stop] [Train voiceprint] [Test my voice] [Reset]
Status / log line
Local only: the voiceprint stays on this machine and is never uploaded...
```

Suggested flow: pick a name → **Record 60s** → speak → (optionally more
15s parts) → **Train voiceprint** → **Test my voice**.

## What it trains

A single default voiceprint (one embedding centroid). Every analyzed live chunk
gets an ECAPA embedding; cosine similarity to the centroid is reported as
`speaker_verification`:

| Field | Meaning |
|---|---|
| `similarity` | 0–1 cosine similarity to the enrolled voiceprint |
| `match` | `true` when similarity ≥ 0.70 |
| `confidence` | `high` ≥ 0.85 · `medium` ≥ 0.70 · `low` ≥ 0.50 · `none` < 0.50 |
| `enrolled_name` | name the voiceprint was trained under |

The risk engine uses this as the speaker signal (weight 20%) and applies a
−15 mitigation bonus when `match` is true — a verified voice *lowers* risk.

## Privacy

- The voiceprint is a **local file** on the machine running the AI service.
- It is never uploaded to Supabase, never stored on-chain, never sent to the
  browser, never logged.
- The pipeline never persists raw audio. Database records reference sessions
  and derived metrics only.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `sounddevice is not installed` | `pip install sounddevice` |
| "No voiced segments found" | Recording too quiet — speak louder / closer; check the level meter |
| "Recording too short" | Need at least a few seconds of audio |
| ECAPA slow on first use | SpeechBrain downloads `spkrec-ecapa-voxceleb` from Hugging Face once (~6s, then cached) |
| Similarity always low on live calls | Channel/quality differences — retrain from the same mic/setup the caller uses; use headphones to avoid echo |
| "Test my voice" says no voiceprint | Train first, or the file path changed |