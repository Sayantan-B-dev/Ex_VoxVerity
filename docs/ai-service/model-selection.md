# Model Selection (client-side)

The user picks which analysis model every realtime session uses. The choice is
per-browser (localStorage) and is sent with each WebSocket session — no SQL.

## Settings → Model tab

A new tab alongside General / Notifications / Security
(`apps/web/components/SettingsView.tsx` → `ModelSettings`):

| Option | id | Behavior |
|---|---|---|
| **AASIST-L + Voiceprint (Recommended)** | `aasist_voiceprint` | Anti-spoof ONNX model **plus** speaker verification against the trained voiceprint (default) |
| **AASIST-L only** | `aasist` | Anti-spoof ONNX model only; no speaker similarity |
| **Fast heuristic (no model)** | `heuristic` | DSP-only heuristic; fastest, weakest accuracy |

The tab also shows the **enrolled voiceprint status** (name, segment count,
speech duration, trained date) fetched from `GET /v1/voiceprint/status`, plus
the trainer command.

## Storage

- `apps/web/lib/model-settings.ts` — `ModelId`, `MODEL_OPTIONS`,
  `getModelPreference()` / `setModelPreference()` (localStorage key
  `voxverity.model`), and a `useModelPreference()` hook.
- Stored **per browser**, not per account. No database writes, no SQL.

## Protocol

The chosen model id is sent in the realtime `start_session` message:

```json
{ "type": "start_session", "source": "remote_call_audio", "model": "aasist_voiceprint" }
```

Server side (`app/realtime/manager.py`):

- `start_session` accepts `model` and validates it against
  `{"aasist_voiceprint", "aasist", "heuristic"}` (unknown → default).
- The session stores it (`session.model`) and it is passed to
  `_analyze_chunk(chunk, source, session.model)` for every chunk.
- A `set_model` message can switch the model mid-session (server replies
  `{"type": "model_set", "model": ...}`) — currently unused by the UI.

Browser side (`apps/web/lib/realtime.ts`):

- `useRealtimeMic({ ..., model })` sends `model` with `start_session`.

## Effect on analysis

| | `aasist_voiceprint` | `aasist` | `heuristic` |
|---|---|---|---|
| `spoof_detection` | ONNX AASIST-L | ONNX AASIST-L | DSP heuristic (`fallback: true`) |
| `speaker_verification` | run (if voiceprint + speech) | skipped | skipped |
| Silence gate | active | active | active |

## Live flow

The Live Monitor page reads the preference via `useModelPreference()` and
passes it into `LiveMonitoring` → `useRealtimeMic`, so every new realtime
session on that browser uses the selected model. Changing the tab setting
applies to the next session immediately.