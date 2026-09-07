# Risk Engine

Deterministic, weighted combination of analysis signals into a 0–100 risk
score. Mirrored in Python (`services/ai-service/app/risk/engine.py`) and
TypeScript (`apps/web/lib/risk-engine.ts`) so server-side recomputation
(`/api/risk-events`) always matches the live score shown in the UI.

## Severity bands

| Severity | Range |
|---|---|
| LOW | 0–25 |
| MEDIUM | 26–50 |
| HIGH | 51–75 |
| CRITICAL | 76–100 |

## Weights (policy `1.0.0`)

| Signal | Weight |
|---|---|
| `spoof_detection` | 0.40 |
| `human_pattern` | 0.20 |
| `speaker_verification` | 0.20 |
| `acoustic_anomaly` | 0.10 |
| `context` | 0.10 (reserved) |

Base risk starts at 50; each available signal blends it toward the signal's
own risk contribution:

- spoof: `spoof_risk = 100 − normalized_score` (higher bona fide → lower risk)
- human pattern: `hp_risk = 100 − score`
- speaker: `spk_risk = (1 − similarity) × 100`
- acoustic anomaly: the computed 0–100 anomaly directly

## Mitigations

| Trigger | Effect |
|---|---|
| `speaker_verification.match == true` | −15 (verified speaker bonus) |
| clean audio (`clipping_detected == false` and `silence_detected == false`) | −5 (quality bonus) |

## Silence gate (`no_speech`)

Chunks with no speech (low energy or `silence_ratio > 0.85`) are **clamped to
≤ 8** and forced to **LOW** severity, with "No speech detected in this chunk."
appended to the explanation. Silence is not evidence of fraud — without this
gate, idle chunks would sit at MEDIUM/HIGH and make the meter noisy.

Handled in both engines and in `POST /api/risk-events`
(`signals.no_speech` → `result.no_speech`).

## Example outputs

| Scenario | Typical score |
|---|---|
| Enrolled speaker talking | ~6–25 (LOW) |
| Unknown voice (no match) | ~30–60 (MEDIUM) |
| Replayed/synthetic + acoustic anomalies | ~51–76+ (HIGH/CRITICAL) |
| Silence | ≤ 8 (LOW, no_speech) |

## Determinism & testing

Same inputs → same output (tested). Boundary tests cover 0, 25, 26, 50, 51,
75, 76, 100 and missing-signal cases (`services/ai-service/tests/test_risk.py`),
plus the no-speech gate.

## Truthfulness

- A risk score is a **policy output**, not a calibrated probability.
- Never display "87% fake" — the UI says "model score / spoof signal" and
  "Risk X/100 (severity)".
- AASIST-L is an anti-spoof model, not a universal deepfake detector;
  out-of-domain audio can score as bona fide. Speaker verification and
  acoustic analysis are deliberately weighted so a voice mismatch still
  elevates risk.