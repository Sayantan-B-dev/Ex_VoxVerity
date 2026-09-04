# VoxVerity — Master Phase Map

> This is the human-readable overview of all implementation phases.
> For full details, refer to `project_info.md` (Sections 43–44).
> For agent rules, see `AGENTS.md`.

**Current phase:** Phase 01 — Repository Bootstrap and Constitution
**Status:** In Progress

---

## Phase Groups

| Group | Phases | Focus |
|---|---|---|
| Foundation | 01–04 | Repository, routes, CSS, landing page |
| Authentication | 05–07 | Auth UI, Supabase email, OAuth |
| Application Shell | 08–13 | Dashboard, navigation, all module UIs |
| Data Layer | 14–16 | Database schema, RLS, CRUD |
| AI Service | 17–21 | FastAPI, health integration, audio lab, DSP |
| AI Models | 22–26 | AASIST-L, evaluation, ECAPA-TDNN, risk engine |
| Realtime | 27–30 | WebSocket pipeline, WebRTC, live dashboard, alerts |
| Evidence | 31–32 | Evidence packaging, blockchain registry |
| Governance | 33–36 | Audit, integrations, multilingual, analytics |
| Hardening | 37–40 | Security, performance, demo, release |

---

## Phases

### Phase 01: Repository Bootstrap and Constitution
- **Depends on:** None
- **Status:** In Progress
- **Acceptance criteria:** Git repo exists, `npm run dev` works, `npm run build` succeeds, AGENTS.md/plan.md/design.md exist, no Vite project, clean working tree after commit.
- **Commit message:** `chore: bootstrap voxverity project`

### Phase 02: Route Skeleton
- **Depends on:** Phase 01
- **Status:** Not started
- **Acceptance criteria:** All declared routes return 200 or expected placeholder/redirect, no route import errors, dynamic routes compile.
- **Commit message:** `feat: add voxverity route skeleton`

### Phase 03: CSS and UI Foundation
- **Depends on:** Phase 02
- **Status:** Not started
- **Acceptance criteria:** CSS imports resolve, no hydration issues, all pages have stable base styles.
- **Commit message:** `feat: establish css foundation`

### Phase 04: Landing Page
- **Depends on:** Phase 03
- **Status:** Not started
- **Acceptance criteria:** Landing page works at `/`, all nav links work, no fake promises about universal call capture.
- **Commit message:** `feat: build voxverity landing page`

### Phase 05: Authentication UI
- **Depends on:** Phase 04
- **Status:** Not started
- **Acceptance criteria:** Forms render and validate, submit actions show controlled placeholder, no password values logged.
- **Commit message:** `feat: add authentication ui`

### Phase 06: Supabase Project and Email Auth
- **Depends on:** Phase 05
- **Status:** Not started
- **Acceptance criteria:** Registered user can sign in and reach dashboard, unauthenticated user redirected, session survives refresh.
- **Commit message:** `feat: integrate supabase email auth`

### Phase 07: OAuth
- **Depends on:** Phase 06
- **Status:** Not started
- **Acceptance criteria:** OAuth sign-in reaches dashboard, cancelled consent returns safely, callback rejects malformed targets.
- **Commit message:** `feat: add oauth authentication`

### Phase 08: Post-login Home Dashboard Shell
- **Depends on:** Phase 07
- **Status:** Not started
- **Acceptance criteria:** Dashboard only accessible after login, logout works, mock KPI cards display.
- **Commit message:** `feat: build dashboard shell`

### Phase 09: Protected Navigation and Global Layout
- **Depends on:** Phase 08
- **Status:** Not started
- **Acceptance criteria:** Every route reachable via nav, no broken links, mobile nav works.
- **Commit message:** `feat: build protected navigation`

### Phase 10: Calls Module UI
- **Depends on:** Phase 09
- **Status:** Not started
- **Acceptance criteria:** Calls list and detail render with mock data.
- **Commit message:** `feat: build calls module`

### Phase 11: Alerts and Incidents UI
- **Depends on:** Phase 10
- **Status:** Not started
- **Acceptance criteria:** Alert-to-incident workflow is visually complete with mock data.
- **Commit message:** `feat: build alerts incidents ui`

### Phase 12: Analysis and Verification UI
- **Depends on:** Phase 11
- **Status:** Not started
- **Acceptance criteria:** Analysis page shows decomposable evidence, never labels model score as certainty.
- **Commit message:** `feat: build analysis verification ui`

### Phase 13: Settings and Admin UI
- **Depends on:** Phase 12
- **Status:** Not started
- **Acceptance criteria:** No broken admin routes, role placeholders visible.
- **Commit message:** `feat: build settings admin ui`

### Phase 14: Database Schema and RLS
- **Depends on:** Phase 13
- **Status:** Not started
- **Acceptance criteria:** Migrations apply cleanly, RLS blocks cross-tenant access.
- **Commit message:** `feat: add supabase schema and rls`

### Phase 15: Connect Dashboard to Supabase
- **Depends on:** Phase 14
- **Status:** Not started
- **Acceptance criteria:** Dashboard reflects database state.
- **Commit message:** `feat: connect dashboard to database`

### Phase 16: CRUD for Calls Alerts Incidents
- **Depends on:** Phase 15
- **Status:** Not started
- **Acceptance criteria:** CRUD works for authorized user, unauthorized access fails.
- **Commit message:** `feat: add security workflow crud`

### Phase 17: FastAPI AI Service Skeleton
- **Depends on:** Phase 16
- **Status:** Not started
- **Acceptance criteria:** Service starts locally, health tests pass.
- **Commit message:** `feat: add fastapi ai service`

### Phase 18: Web to AI Health Integration
- **Depends on:** Phase 17
- **Status:** Not started
- **Acceptance criteria:** Dashboard correctly reports AI online/offline.
- **Commit message:** `feat: connect web to ai service`

### Phase 19: Audio Lab File Upload
- **Depends on:** Phase 18
- **Status:** Not started
- **Acceptance criteria:** Valid file analyzed, invalid file rejected.
- **Commit message:** `feat: add audio analysis lab`

### Phase 20: DSP Analysis v1
- **Depends on:** Phase 19
- **Status:** Not started
- **Acceptance criteria:** Metrics are reproducible, no NaN leaks to API output.
- **Commit message:** `feat: add dsp analysis`

### Phase 21: Human-pattern Demo Signal
- **Depends on:** Phase 20
- **Status:** Not started
- **Acceptance criteria:** Results explain which features drove the descriptor, labeled as descriptive.
- **Commit message:** `feat: add acoustic behavior demo signal`

### Phase 22: Pretrained AASIST-L Integration
- **Depends on:** Phase 21
- **Status:** Not started
- **Acceptance criteria:** Model runs on CPU, output semantics documented.
- **Commit message:** `feat: integrate aasist-l`

### Phase 23: AASIST Evaluation and Calibration
- **Depends on:** Phase 22
- **Status:** Not started
- **Acceptance criteria:** Evaluation report exists, UI language matches evidence semantics.
- **Commit message:** `feat: evaluate aasist-l`

### Phase 24: Speaker Enrollment and ECAPA-TDNN
- **Depends on:** Phase 23
- **Status:** Not started
- **Acceptance criteria:** Enrollment and comparison work, unenrolled state works.
- **Commit message:** `feat: add speaker verification`

### Phase 25: Analysis Aggregation and Versioning
- **Depends on:** Phase 24
- **Status:** Not started
- **Acceptance criteria:** Every result is attributable and versioned.
- **Commit message:** `feat: aggregate analysis signals`

### Phase 26: Risk Engine v1
- **Depends on:** Phase 25
- **Status:** Not started
- **Acceptance criteria:** Scores are bounded 0–100 and reproducible.
- **Commit message:** `feat: add deterministic risk engine`

### Phase 27: Realtime WebSocket Audio Pipeline
- **Depends on:** Phase 26
- **Status:** Not started
- **Acceptance criteria:** End-to-end local realtime loop works, no uncontrolled backlog.
- **Commit message:** `feat: add realtime audio pipeline`

### Phase 28: WebRTC Controlled Demo Call
- **Depends on:** Phase 27
- **Status:** Not started
- **Acceptance criteria:** Receiver can hear caller and analyze remote stream.
- **Commit message:** `feat: add browser webrtc demo call`

### Phase 29: Realtime DSP Dashboard
- **Depends on:** Phase 28
- **Status:** Not started
- **Acceptance criteria:** Values change during the call, risk trend visible.
- **Commit message:** `feat: build realtime analysis dashboard`

### Phase 30: Alerts and Secondary Verification
- **Depends on:** Phase 29
- **Status:** Not started
- **Acceptance criteria:** High risk produces alert and verification state.
- **Commit message:** `feat: add realtime alerts verification`

### Phase 31: Incident and Evidence Package
- **Depends on:** Phase 30
- **Status:** Not started
- **Acceptance criteria:** Same manifest produces same SHA-256 hash.
- **Commit message:** `feat: add evidence packaging`

### Phase 32: Blockchain Evidence Registry
- **Depends on:** Phase 31
- **Status:** Not started
- **Acceptance criteria:** On-chain registration and verification succeed on Amoy testnet.
- **Commit message:** `feat: add blockchain evidence registry`

### Phase 33: Audit and Governance
- **Depends on:** Phase 32
- **Status:** Not started
- **Acceptance criteria:** Security-relevant actions are traceable.
- **Commit message:** `feat: add governance and audit`

### Phase 34: Integrations Framework
- **Depends on:** Phase 33
- **Status:** Not started
- **Acceptance criteria:** Core AI pipeline remains source-agnostic.
- **Commit message:** `feat: add audio source adapter framework`

### Phase 35: Multilingual and Accent Readiness
- **Depends on:** Phase 34
- **Status:** Not started
- **Acceptance criteria:** No UI assumes English-only.
- **Commit message:** `feat: add multilingual readiness`

### Phase 36: Analytics and Threat Intelligence
- **Depends on:** Phase 35
- **Status:** Not started
- **Acceptance criteria:** Analytics match stored data.
- **Commit message:** `feat: add analytics and threat intelligence`

### Phase 37: Security Hardening
- **Depends on:** Phase 36
- **Status:** Not started
- **Acceptance criteria:** Critical/high security issues addressed or documented.
- **Commit message:** `security: harden voxverity`

### Phase 38: Performance and Reliability
- **Depends on:** Phase 37
- **Status:** Not started
- **Acceptance criteria:** System remains stable under controlled sustained demo.
- **Commit message:** `perf: stabilize realtime pipeline`

### Phase 39: End-to-End Demo and Runbook
- **Depends on:** Phase 38
- **Status:** Not started
- **Acceptance criteria:** A new operator can reproduce the demo using the runbook.
- **Commit message:** `docs: add end to end demo runbook`

### Phase 40: Production-Shaped Finalization
- **Depends on:** Phase 39
- **Status:** Not started
- **Acceptance criteria:** Release candidate is reproducible.
- **Commit message:** `release: prepare voxverity candidate`

---

## Dependency Checkpoints

1. **01–04:** Repository, routes, CSS, public UI foundation
2. **05–07:** Identity and OAuth
3. **08–13:** Application data shell and security workflow UI
4. **14–16:** Database persistence and CRUD
5. **17–21:** AI service and explanatory DSP baseline
6. **22–26:** Pretrained AI signals and deterministic risk
7. **27–30:** Realtime browser audio, WebRTC, alerts, verification
8. **31–32:** Evidence and blockchain provenance
9. **33–36:** Governance, integrations, multilingual, analytics
10. **37–40:** Hardening, measurement, documentation, release
