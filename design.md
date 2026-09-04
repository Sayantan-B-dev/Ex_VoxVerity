# VoxVerity — Design and UX Specification

> This document records product behavior, visual language, risk semantics, privacy UX, component interaction rules, and user roles.
> For full technical details, see `project_info.md`.

## Product Definition

VoxVerity answers: **"How suspicious is this voice/session right now, why, and what should the protected user or security operator do next?"**

The system is evidence-first. AI models generate measurable signals, not absolute fraud decisions. A deterministic risk engine combines signals with policy and context.

## User Roles

| Role | Capabilities |
|---|---|
| **Protected employee/operator** | Sees active protection, call/session context, evidence, risk, recommended actions |
| **Security analyst** | Reviews live sessions, alerts, incidents, analysis details, evidence, audit history |
| **Administrator** | Manages org config, users, roles, thresholds, integrations, retention, system settings |
| **Demonstrator/evaluator** | Uses controlled demo call and analysis lab to exercise the full pipeline |
| **Untrusted caller** | Does not need a VoxVerity account, must not receive internal risk details |

Role checks exist in both UI navigation and backend. **Hiding a button is not authorization.**

## Information Architecture

### Public Shell
- Top navigation
- Product summary and hero
- Trust/privacy section
- Technical explanation
- Call to action
- Footer with legal/privacy links

### Authenticated Shell
- Application navigation (sidebar)
- Organization selector (if multi-tenant)
- Profile menu
- Protection/capture status indicator
- Alerts indicator (badge)
- Page content area
- System status where appropriate

### Security Operations Navigation Group
Live, Calls, Alerts, Incidents, Verification, Analytics, Evidence/Blockchain, Audit, Integrations, Models, Settings

### Dashboard Surfaces
Most important active state without forcing the user to visit every page.

## Visual Language

- **Not a design system project.** CSS foundation uses custom variables, reset, typography, layout, and component styles.
- **Status colors:** Use severity-band mapping for risk visualization.
- **Responsive:** Desktop-first with mobile support for all authenticated views.
- **Accessibility:** Keyboard navigation, visible focus indicators, labels, error messages, semantic HTML controls.

## Risk Semantics

### Severity Bands (Default)
| Band | Score Range | Color |
|---|---|---|
| LOW | 0–25 | Green |
| MEDIUM | 26–50 | Yellow/Amber |
| HIGH | 51–75 | Orange |
| CRITICAL | 76–100 | Red |

Thresholds are configurable per organization, not hard-coded.

### Risk Display Rules
- Display as **"Risk 87/100"** or **"Synthetic voice signal: High"** with supporting evidence.
- **Never** display "87% fake" unless a calibrated probability has been empirically established.
- Always show contributing signals, not just a single number.
- Model output is labeled "model score" or "spoof signal" until calibration exists.

### What Risk Is NOT
- Not a probability unless statistically calibrated.
- Not an absolute fraud verdict.
- Not proof of identity (speaker similarity is a signal, not proof).

## Privacy UX

- **Capture state must be visible:** Show whether capture is on, paused, denied, unsupported, or disconnected.
- **Explicit consent:** Microphone and capture permissions requested through browser APIs, not hidden.
- **Disclosure:** If temporary audio is persisted for debug, the UI must disclose retention and provide deletion.
- **Language:** Any capture statement must say "authorized audio" or "supported browser/telephony integrations."
- **No universal call capture claims:** The landing page must never imply that a browser can secretly monitor arbitrary calls.

## Component Interaction Rules

### Dashboard
- Current protection state (prominent)
- Current/last call summary
- Risk score and band (with trend)
- Synthetic/anti-spoof signal
- Speaker similarity (if enrollment exists)
- Acoustic/prosodic findings
- Recent alerts
- Open incidents
- Session health and latency
- Model and analysis version
- Quick path to Live Monitor and Analysis Lab

### Live Monitor
- Start/stop protection controls
- Capture permission state display
- Audio source type display
- Audio level meter
- Waveform/frequency visualization
- 3-second chunk timeline
- Per-chunk analysis status
- Current risk and trend
- Top contributing signals
- Alert banner when threshold crosses
- Latency/queue/connection health
- Safe error messages for denied permissions or disconnected WebSocket

### Calls Page
- Session/call list with timestamp, source, duration, user, risk, final outcome, alert state, incident linkage
- Search, filters, pagination

### Analysis Lab
- Controlled environment for prerecorded audio and test scenario replay
- WAV and supported format upload
- Decoded metadata display
- DSP pipeline visualization
- AI model results (when enabled)
- Cross-file comparison
- Analysis record creation

### Alerts
- Alert ID, severity, session/call, timestamp, trigger rules, contributing signals, recommended action, acknowledgement state, analyst notes, incident linkage

### Incidents
- Investigation container: scope, status, owner, timeline, alert links, evidence links, verification actions, notes, resolution, false-positive indicator, audit history

### Verification
- Secondary verification is intentionally independent of the suspicious voice
- Examples: callback to trusted number, organization-approved confirmation, human confirmation
- Demo initially uses synthetic verification step

## Error UX

- User-facing error messages must be actionable.
- Never leak stack traces or secret material.
- Capture permission denied → clear message with guidance.
- WebSocket disconnected → clear reconnection message.
- Model unavailable → graceful degradation message.

## Landing Page Sections

1. Top navigation
2. Hero
3. Problem statement
4. Why existing caller identification is insufficient
5. How VoxVerity works
6. Realtime evidence layers
7. Risk scoring explanation
8. Privacy and data minimization
9. Demo walkthrough
10. Technology/architecture overview
11. Future integrations
12. Call to action
13. Footer (legal/privacy links)

## CSS Organization

- `apps/web/styles/` — Authored CSS modules/partials
- `apps/web/app/globals.css` — Root import point
- `apps/web/public/` — Static assets only, not authored CSS
