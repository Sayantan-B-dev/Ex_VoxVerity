VoxVerity
Extreme Detailed Software Requirements Specification (SRS), System Architecture, Route Inventory, Project Structure, Technology Baseline, Initialization Manual, Security/Privacy Requirements, AI/Realtime Design, and Incremental Engineering Execution Plan
Document status: Implementation master specification
Baseline date: 4 September 2026
Scope: Browser-first SIH prototype progressing to a production-shaped demonstrator
Important: This document is intentionally plain-content oriented. It is meant to be read as an engineering contract, not a visual design document.
0. Executive Summary
VoxVerity is an AI-powered real-time voice integrity verification platform for detecting suspicious, synthetic, cloned, replayed, converted, or otherwise manipulated voice activity in authorized communication contexts. The browser-facing product is the primary user interface. The baseline implementation uses Next.js and TypeScript for the web application, Supabase and PostgreSQL for authentication and persistence, WebRTC/WebSocket/Web Audio browser capabilities for controlled realtime audio handling, Python and FastAPI for the AI service, PyTorch for model inference, Librosa and SciPy for digital signal processing, and Solidity with Hardhat plus ethers.js for tamper-evident evidence registration on an EVM test network.
The system is evidence-first. AI models do not directly make an absolute fraud decision. Models generate measurable signals such as synthetic-spoof likelihood, speaker similarity, acoustic and prosodic observations, and uncertainty. A deterministic risk engine combines these signals with policy and context and emits a configurable 0-100 risk score, a severity band, contributing factors, and a recommended workflow action.
The browser-first prototype will not claim universal capture of arbitrary phone calls. The practical initial input path is a controlled browser/WebRTC call in which the application owns the media stream or an explicitly permitted browser capture source. Direct PSTN, carrier, SIP/PBX, Teams, Zoom, Meet, and other vendor-specific sources are treated as pluggable future adapters. This keeps the prototype privacy-respecting, technically testable, and aligned with the submitted stack.
1. Source of Truth and Project Constraints
The project team has provided an SIH submission and related engineering planning material. The submitted architecture and technology choices are treated as the product constraints. Where the submission leaves an implementation mechanism unspecified, this SRS chooses the smallest testable mechanism that preserves the declared technology stack. Any deliberate technology substitution requires a recorded architecture decision.
Existing project engineering rules require phase-by-phase work, repository inspection before changes, smallest viable implementation, documented acceptance criteria, test execution, a verification report, a clean working tree, and a hard stop after each phase. These rules remain mandatory.
The project must not silently reintroduce a desktop agent as the core browser input architecture. A future native agent can exist as an optional adapter, but the baseline prototype described here is browser-first.
2. Product Definition
2.1 Product Goal
Provide a security-oriented web platform that can receive authorized live or near-live voice audio, analyze it in small windows, display changing evidence and risk in near real time, support human verification workflows, and preserve tamper-evident evidence metadata without placing raw audio or biometric embeddings on-chain.
2.2 Primary Users
- Protected employee or operator: sees active protection, call/session context, evidence, risk, and recommended actions.
- Security analyst: reviews live sessions, alerts, incidents, analysis details, evidence, and audit history.
- Administrator: manages organization configuration, users, roles, thresholds, integrations, retention, and system settings.
- Demonstrator/evaluator: uses the controlled demo call and analysis lab to exercise the full pipeline.
- Untrusted caller: does not need a VoxVerity account and must not receive internal risk details.
2.3 Core Promise
VoxVerity should answer: “How suspicious is this voice/session right now, why, and what should the protected user or security operator do next?”
2.4 Non-goals
- It is not a universal phone interception system.
- It is not a replacement for telecom lawful-intercept mechanisms.
- It is not a biometric identity proof system.
- It is not a direct financial transaction authorization engine.
- It is not a system that stores raw calls permanently by default.
- It does not claim perfect deepfake detection.
- It does not expose private signing keys, service-role credentials, or internal detections to browsers.
3. End-to-End Target Workflow
User signs in
  -> Protected dashboard
  -> Start protected session
  -> Browser/WebRTC audio becomes available
  -> Browser audio processing
  -> Three-second transport cadence
  -> WebSocket binary audio frames
  -> FastAPI validation
  -> Normalize to 16 kHz mono float32
  -> DSP feature extraction
  -> Pretrained spoof/deepfake inference
  -> Speaker embedding and optional reference comparison
  -> Context enrichment
  -> Deterministic risk engine
  -> Risk update event
  -> Next.js live UI update
  -> Alert if policy threshold crossed
  -> Human verification workflow if configured
  -> Incident and evidence record
  -> SHA-256 evidence fingerprint
  -> Optional EVM testnet registration
  -> Audit trail
4. High-Level Architecture
4.1 Logical Components
- Next.js web application: routing, pages, server-side integration, authenticated UI, session management, realtime dashboard.
- Browser audio layer: getUserMedia for explicit microphone capture; WebRTC media streams for controlled browser calls; Web Audio for analysis and visualization; optionally getDisplayMedia for explicitly permitted capture of a browser/tab/window audio source where supported.
- Realtime transport: WebSocket for browser-to-AI-service audio messages and AI-to-browser result messages. WebRTC is used where the product itself establishes the media call.
- Supabase Auth/PostgreSQL/Storage: identity, organization membership, sessions, calls, alerts, incidents, evidence metadata, audit events, configuration, optional small diagnostic artifacts.
- FastAPI AI service: health, session, audio chunk ingestion, preprocessing, feature extraction, model inference, risk calculation, analysis result delivery.
- DSP layer: Librosa, SciPy, NumPy and standard signal processing primitives.
- Model layer: AASIST-L for lightweight audio anti-spoofing; SpeechBrain ECAPA-TDNN for speaker embeddings and verification; additional models can be added only with documented evaluation.
- Risk engine: deterministic policy that combines model signals and contextual rules into a 0-100 score.
- Evidence service: canonical JSON result, hashing, evidence manifest, verification.
- Blockchain registry: Solidity contract on an EVM testnet stores evidence hash and minimal provenance fields only.
- Future input adapters: Twilio Media Streams, SIP/PBX, vendor meeting SDKs, or other authorized integrations.
4.2 Source-Agnostic Principle
All future audio sources must normalize to one internal contract: source metadata plus timestamped audio frames with format, sample rate, channel count, codec indicator, session identifier, and sequence information. The AI service must not care whether a frame originally came from a browser WebRTC call, a telephony adapter, a file replay, or a future integration.
5. Technology Baseline Verified Against Current Sources
The following baseline was researched on 4 September 2026. Patch versions should still be pinned through lockfiles and a documented update policy. “Current” here means the latest source-verified baseline found at document generation time, not a promise that these exact patch numbers remain current indefinitely.
5.1 Web
- Next.js 16.2.11 Active LTS baseline. Next.js 16 is current major generation and the Next.js release stream explicitly identifies 16.2.11 as an Active LTS security baseline. Use App Router and TypeScript.
- Node.js 24.20.0 LTS baseline. Use npm initially unless the repository explicitly chooses pnpm; do not mix package managers.
- React is supplied by Next.js. Do not create a separate Vite app.
- TypeScript is mandatory for application source except tooling files where JavaScript is unavoidable.
5.2 Managed Backend
- Supabase Free plan for prototype persistence and authentication.
- Supabase Auth for email/password, password recovery, session management, and OAuth/social login.
- Supabase PostgreSQL as the database.
- Supabase Row Level Security is mandatory on exposed application tables.
- Supabase Storage is optional for controlled artifacts and test data; raw call audio should not be stored by default.
5.3 Realtime and Browser Media
- WebSocket API for bidirectional browser/server messages.
- WebRTC for controlled browser-to-browser realtime media sessions.
- MediaDevices.getUserMedia for explicit microphone permission and capture.
- Web Audio API and AnalyserNode for live waveform/frequency monitoring.
- MediaRecorder only when a compressed recording/chunk format is specifically useful; the AI pipeline ultimately needs normalized PCM.
- getDisplayMedia only for explicitly permitted screen/tab/window capture where the browser exposes an audio track; never assume system-audio capture is universal.
5.4 AI Service
- Python 3.13.15 runtime baseline for this project because the latest 3.14 series is newer but the project deliberately favors a well-supported ML compatibility baseline.
- FastAPI for HTTP and WebSocket APIs.
- PyTorch for inference.
- Librosa for audio analysis.
- SciPy 1.18.0 documentation baseline for scientific/signal-processing support.
- NumPy as a transitive/explicit numerical foundation.
- Optional FFmpeg command-line dependency for robust audio decoding when external codecs must be normalized.
5.5 Models
- AASIST-L, MIT licensed checkpoint, lightweight audio anti-spoofing model. The current model card reports 85,306 parameters and states that higher output score means more bona fide. The model card also reports a deterministic 64,600-sample evaluation window at 16 kHz and substantially worse out-of-domain performance than its in-domain ASVspoof score. Therefore the system must not treat its raw score as a universal “AI probability”.
- SpeechBrain spkrec-ecapa-voxceleb, Apache-2.0 model for speaker embeddings/verification. Use similarity as a signal, not proof of identity.
5.6 Blockchain
- Solidity smart contract.
- Hardhat for local contract testing/deployment.
- ethers.js for client/service interaction.
- Polygon PoS Amoy testnet for the prototype evidence registry, Chain ID 80002.
- Never store audio, transcripts, embeddings, phone numbers, secrets, API keys, or raw personal data on-chain.
6. Current Research Basis and References
Next.js current release/security references: https://nextjs.org/blog/next-16 ; https://nextjs.org/blog
Node.js current download page: https://nodejs.org/en/download/
Python 3.13.15 release: https://www.python.org/downloads/release/python-31315/
.NET is intentionally not part of the browser-first baseline. Current .NET 10 reference, useful only if a later native agent is introduced: https://dotnet.microsoft.com/en-us/download/dotnet/10.0
Supabase pricing/current free plan: https://supabase.com/pricing
Supabase Next.js Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
Supabase server-side authentication: https://supabase.com/docs/guides/auth/server-side
Supabase OAuth and Google provider: https://supabase.com/docs/guides/auth/social-login and https://supabase.com/docs/guides/auth/social-login/auth-google
Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
Supabase Realtime: https://supabase.com/docs/guides/realtime
MDN WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
MDN getDisplayMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
MDN Web Audio and AnalyserNode: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API and https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
Librosa documentation: https://librosa.org/doc/latest/
SciPy 1.18.0 documentation: https://docs.scipy.org/doc/scipy/
AASIST-L model card: https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L
AASIST-L files/checkpoint: https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L/tree/main
ECAPA-TDNN model card: https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb
Polygon Amoy and RPC information: https://www.alchemy.com/rpc/matic-amoy
Polygon Amoy faucet: https://www.alchemy.com/faucets/polygon-amoy
Twilio Media Streams future adapter reference: https://www.twilio.com/docs/voice/media-streams
Reference note: current-source versions and URLs were checked on 4 September 2026. Third-party provider terms, browser compatibility, model performance and free-tier limits must be rechecked before each deployment.
7. Functional Requirements Overview
Identity and access
- FR-AUTH-001 User can register with email and password.
- FR-AUTH-002 User can sign in and sign out.
- FR-AUTH-003 User can request password reset.
- FR-AUTH-004 User can sign in through configured OAuth provider(s).
- FR-AUTH-005 Authenticated session must persist using secure cookie/session mechanisms appropriate to SSR.
- FR-AUTH-006 Protected routes must reject unauthenticated access.
- FR-AUTH-007 Role authorization must restrict analyst/admin functions.
Landing and navigation
- FR-WEB-001 Landing page has navigation, hero, product explanation, problem, workflow, trust/privacy, technology, CTA, and footer sections.
- FR-WEB-002 All planned application routes exist before feature implementation begins.
- FR-WEB-003 Route placeholders render without runtime errors.
- FR-WEB-004 Navigation hides protected destinations from unauthenticated users or redirects them to sign-in.
Audio and sessions
- FR-AUDIO-001 Protected user can start a capture session after visible consent/permission flow.
- FR-AUDIO-002 Application shows capture state continuously.
- FR-AUDIO-003 Audio frames are associated with a unique session ID and monotonically increasing sequence.
- FR-AUDIO-004 Browser capture can be stopped.
- FR-AUDIO-005 Inactive/denied/unsupported capture is represented explicitly.
- FR-AUDIO-006 Controlled WebRTC call can provide a remote MediaStream to the analysis pipeline.
AI analysis
- FR-AI-001 Service accepts normalized audio chunks.
- FR-AI-002 Service computes DSP metrics for each chunk.
- FR-AI-003 Service can run AASIST-L once enough audio context is available.
- FR-AI-004 Service can compute speaker embeddings and compare against an enrolled reference when enabled.
- FR-AI-005 Service returns structured signals plus uncertainty/quality flags.
- FR-AI-006 No model output is labeled as an absolute fraud verdict.
Risk
- FR-RISK-001 Engine outputs 0-100 score.
- FR-RISK-002 Engine maps score to LOW 0-25, MEDIUM 26-50, HIGH 51-75, CRITICAL 76-100 by default.
- FR-RISK-003 Thresholds are configurable.
- FR-RISK-004 Risk response includes contributing signals and rule triggers.
- FR-RISK-005 Risk changes over time as new chunks arrive.
Workflow
- FR-WF-001 High risk can create an alert.
- FR-WF-002 Policy can require secondary verification.
- FR-WF-003 Human can confirm, dismiss, escalate, or mark false positive.
- FR-WF-004 Incident can be opened from an alert/session.
- FR-WF-005 Evidence package can be generated from an incident.
Evidence and blockchain
- FR-EVD-001 Evidence manifest has canonical serialization.
- FR-EVD-002 SHA-256 hash is calculated from the canonical manifest or evidence bundle.
- FR-EVD-003 On-chain registration is optional for the prototype workflow.
- FR-EVD-004 Verification compares local evidence hash to the on-chain registered hash.
- FR-EVD-005 No raw audio or embeddings are stored on-chain.
Administration
- FR-ADM-001 Admin can manage users/roles within authorized organization.
- FR-ADM-002 Admin can configure risk thresholds.
- FR-ADM-003 Admin can configure retention and consent settings.
- FR-ADM-004 Analyst/admin can view model version metadata.
- FR-ADM-005 Analyst/admin can view audit events.
8. Non-Functional Requirements
- NFR-001 Security: no secrets in client bundles, repository, logs, screenshots, or blockchain payloads.
- NFR-002 Privacy: explicit capture permissions and visible status; raw audio minimized and preferably processed in memory.
- NFR-003 Availability: local prototype must work without paid infrastructure whenever possible.
- NFR-004 Performance: 3-second transport cadence must not accumulate unbounded queues on browser, WebSocket, or server.
- NFR-005 Observability: every analysis result is traceable to session ID, chunk sequence, timestamp, and model/rules version.
- NFR-006 Determinism: rule-based risk calculations must be reproducible from the same inputs, model outputs, configuration, and version metadata.
- NFR-007 Explainability: risk results show the contributing signals, not just a single number.
- NFR-008 Compatibility: browser capture must be feature-detected and unsupported situations must fail clearly.
- NFR-009 Maintainability: code is organized by route/domain/service and avoids large monolithic components.
- NFR-010 Testability: every backend endpoint has unit/integration coverage appropriate to risk.
- NFR-011 Data integrity: database foreign keys, constraints and RLS protect organization boundaries.
- NFR-012 Deployment safety: production-like environments use HTTPS and WSS.
- NFR-013 Scalability: the AI service can later scale horizontally because sessions are explicit and state can be externalized or bounded.
- NFR-014 Accessibility: keyboard navigation, visible focus, labels, error messages and semantic controls.
- NFR-015 Internationalization readiness: user-facing copy and metadata are structured to allow multilingual expansion.
- NFR-016 Model governance: every model has source URL, version/revision, license, evaluation notes and known limitations.
9. Privacy Requirements
Voice is potentially biometric and sensitive. The prototype therefore adopts minimization and explicit consent as design requirements even where the exact legal regime depends on deployment jurisdiction.
- The UI must clearly state what audio source is being captured.
- Microphone and other capture permissions must be requested through browser APIs, not hidden mechanisms.
- The application must show whether capture is on, paused, denied, unsupported, or disconnected.
- Raw audio should be processed in memory whenever possible.
- If temporary audio is persisted for a debug or lab feature, the UI must disclose retention and provide a deletion path.
- Database records should reference sessions and derived results instead of storing raw audio by default.
- Do not store provider OAuth tokens unnecessarily. Provider tokens must not appear in client-visible telemetry.
- Do not send raw audio to blockchain.
- Do not send speaker embeddings or voiceprints to blockchain.
- Use organization/user scoping in database queries and RLS.
- Logs must avoid raw audio, full transcripts, access tokens, cookies, passwords, private keys, and unnecessary PII.
- A production privacy assessment must be completed before real third-party communications are monitored.
10. Browser Capture and Privacy Boundary
The browser can explicitly request microphone access through getUserMedia. A controlled WebRTC call is the cleanest demo input because the application has direct access to the remote MediaStream associated with the call. Browser-based system/tab/window capture via getDisplayMedia may expose an audio track in supported browsers, but this is user-mediated and browser-dependent. The application must never claim that it can capture arbitrary phone or desktop audio universally.
Prototype input strategies are ordered by certainty: first, a controlled WebRTC call owned by VoxVerity; second, explicit microphone capture for a test scenario; third, browser display/tab/window audio capture where supported and intentionally enabled; fourth, future vendor-specific telephony or collaboration integrations.
11. Risk Model
Default severity bands are LOW 0-25, MEDIUM 26-50, HIGH 51-75, CRITICAL 76-100. The thresholds are configuration, not hard-coded product truth.
The risk engine takes signals such as synthetic-spoof score, speaker similarity, acoustic anomaly score, session quality, contextual risk, repeated inconsistency, replay indicators, and verification outcome. Signals are normalized before weighting. The engine outputs score, band, recommendation, contributing factors, rule IDs, model versions, and quality flags.
A sample deterministic model is: base risk from synthetic signal + speaker mismatch contribution + acoustic/prosodic anomaly contribution + context contribution + persistence/escalation contribution - trusted verification mitigation, bounded to 0-100. Actual weights must be selected through controlled evaluation rather than invented from intuition alone.
The UI must not display “87% fake” unless a calibrated probability has been empirically established. A safer prototype label is “Risk 87/100” or “Synthetic voice signal: High” with supporting evidence.
12. Audio Processing Specification
12.1 Transport Cadence
The realtime demo sends audio approximately every 3 seconds. The transport cadence is independent of the model inference window. AASIST-L documentation describes a 64,600-sample 16 kHz evaluation window, approximately 4.04 seconds. Therefore the realtime implementation should use a rolling model context around the most recent 4.04 seconds while emitting risk updates every 3 seconds. During startup, the service may pad or return “insufficient context” until enough audio is available.
12.2 Normalized Audio Contract
- Sample rate: 16,000 Hz.
- Channels: mono.
- Representation: float32 normalized waveform in the AI process.
- Chunk timestamp: server-received and client-captured timestamps where available.
- Sequence number: monotonically increasing.
- Session ID: UUID.
- Expected audio duration per transport message: approximately 3 seconds, with tolerance documented by the API contract.
- Audio quality fields: clipping ratio, silence ratio, sample count, decode success, resampling success.
12.3 DSP Metrics
- RMS energy and dBFS.
- Peak amplitude and clipping ratio.
- Crest factor.
- Zero crossing rate.
- Spectral centroid.
- Spectral bandwidth.
- Spectral rolloff.
- Spectral flatness.
- Optional spectral flux.
- Pitch estimate and pitch variability where reliable.
- Voicing ratio / voiced-frame percentage.
- Pause/silence ratio.
- Dynamic range proxy.
- Harmonicity or harmonic-to-noise proxy where supported.
- Chunk-level quality/confidence flags.
12.4 “Human Pattern” Demo Layer
The first AI-service demonstration may compute loudness, dynamics, silence, variability, voicing and spectral metrics to visualize what a natural speech segment looks like. This is a descriptive DSP layer, not a synthetic-voice detector. The UI must label it as “acoustic dynamics” or “speech-pattern evidence,” not “human verified.”
13. AI Specification
13.1 AASIST-L
AASIST-L is the first real pretrained spoof/deepfake model. The current model card states that it operates on raw speech waveform, is lightweight, and returns a score where higher is more bona fide. The model card also reports strong in-domain performance on ASVspoof2019 LA and materially weaker performance on out-of-domain evaluation sets. The implementation therefore converts the raw model output into a project-defined calibrated or rank-based signal only after validation. Until calibration exists, the UI should call it “model score” or “spoof signal,” not probability.
13.2 ECAPA-TDNN
ECAPA-TDNN is the first speaker encoder. The system stores a reference embedding only when the user has explicitly enrolled a speaker and policy permits it. During a live session, new embeddings are compared to the reference using cosine similarity or an equivalent documented metric. The result is labeled as speaker similarity/consistency. It is not identity proof and can be affected by channel, noise, language, duration and domain differences.
13.3 Model Registry
- Model ID.
- Model name.
- Source URL.
- Repository/revision or model artifact hash.
- License.
- Input format.
- Output semantics.
- Calibration version.
- Evaluation datasets and split.
- Known limitations.
- Deployment status.
- Date added and deactivated.
14. Realtime Specification
The initial realtime path is browser -> WebSocket -> FastAPI -> analysis -> WebSocket -> browser. Supabase Realtime may later be used for database-driven alerts and dashboard fan-out, but raw audio should not be sent through database change feeds.
14.1 Client-to-Server WebSocket Message Types
hello
start_session
audio_chunk
stop_session
ping
client_error
14.2 Server-to-Client WebSocket Message Types
session_started
ack
analysis_partial
analysis_complete
risk_update
alert_created
verification_required
session_stopped
server_error
14.3 Audio Chunk Metadata
{
  "type": "audio_chunk",
  "session_id": "uuid",
  "sequence": 1,
  "captured_at": "ISO-8601",
  "duration_ms": 3000,
  "sample_rate": 16000,
  "channels": 1,
  "encoding": "pcm_s16le_or_server_supported_format"
}
The production implementation may choose binary WebSocket frames for audio and a small JSON control channel. Do not base64 large audio payloads unless a specific deployment constraint requires it.
15. API Inventory
15.1 Web Application Server Routes
- / authentication and public routes rendered by Next.js App Router.
- /api/health for web application health.
- /api/auth/callback for Supabase OAuth callback code exchange.
- /api/auth/signout for controlled sign-out if implemented through a route handler.
- /api/sessions for protected session metadata where server-side Next.js integration is useful.
- /api/calls for protected call/session records.
- /api/alerts for protected alert operations.
- /api/incidents for protected incident operations.
- /api/evidence for protected evidence manifest operations.
- /api/integrations for admin-only integration configuration.
- /api/admin/models for admin/analyst model metadata.
15.2 AI Service REST Routes
- GET /health
- GET /ready
- GET /version
- POST /v1/sessions
- POST /v1/sessions/{session_id}/chunks for non-WebSocket fallback/testing
- POST /v1/analyze/file for controlled lab audio files
- POST /v1/speaker/enroll for approved reference enrollment
- POST /v1/speaker/verify for controlled verification
- POST /v1/risk/evaluate for deterministic risk unit/integration testing
- GET /v1/models
- GET /v1/config
- WS /v1/realtime/{session_id}
Routes must be versioned at the service boundary once the service is no longer trivial. Internal helper functions may remain unversioned.
16. Complete Frontend Route Inventory
These routes should exist early as route shells even before all features are functional. Each route must render a stable loading/error/placeholder state and must have an explicit authentication policy.
/
/login
/register
/forgot-password
/reset-password
/auth/callback
/auth/auth-code-error
/dashboard
/live
/calls
/calls/[callId]
/analysis
/analysis/[analysisId]
/alerts
/alerts/[alertId]
/incidents
/incidents/[incidentId]
/verification
/threat-intelligence
/analytics
/blockchain
/audit
/integrations
/models
/settings
/settings/profile
/settings/security
/settings/notifications
/settings/privacy
/settings/risk
/admin
/admin/users
/admin/organizations
/admin/roles
/admin/models
/admin/system
/lab
/lab/audio
/lab/live
/help
/status
Public routes: /, /login, /register, /forgot-password, /reset-password, /help, /status. Authentication callback/error routes are controlled framework routes. All security, analysis, incident, admin, integration and settings routes require authentication, with admin routes requiring role checks.
17. Frontend Information Architecture
Public shell: navigation, product summary, trust/privacy, technical explanation, CTA, footer.
Authenticated shell: application navigation, organization selector if multi-tenant support is enabled, profile menu, protection/capture status, alerts indicator, page content, system status where appropriate.
Security operations navigation should group Live, Calls, Alerts, Incidents, Verification, Analytics, Evidence/Blockchain, Audit, Integrations, Models and Settings. The dashboard should surface the most important active state without forcing the user to visit every page.
18. Project Structure
voxverity/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (public)/
│       │   │   ├── page.tsx
│       │   │   └── ...
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   ├── forgot-password/page.tsx
│       │   │   ├── reset-password/page.tsx
│       │   │   └── auth/callback/route.ts
│       │   ├── (protected)/
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── live/page.tsx
│       │   │   ├── calls/page.tsx
│       │   │   ├── calls/[callId]/page.tsx
│       │   │   ├── analysis/page.tsx
│       │   │   ├── analysis/[analysisId]/page.tsx
│       │   │   ├── alerts/page.tsx
│       │   │   ├── incidents/page.tsx
│       │   │   ├── verification/page.tsx
│       │   │   ├── analytics/page.tsx
│       │   │   ├── blockchain/page.tsx
│       │   │   ├── audit/page.tsx
│       │   │   ├── integrations/page.tsx
│       │   │   ├── models/page.tsx
│       │   │   ├── settings/page.tsx
│       │   │   ├── lab/page.tsx
│       │   │   └── admin/...
│       │   ├── api/...
│       │   ├── globals.css
│       │   └── layout.tsx
│       ├── components/
│       ├── lib/
│       ├── hooks/
│       ├── types/
│       ├── styles/
│       └── public/
├── services/
│   └── ai-service/
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── audio/
│       │   ├── dsp/
│       │   ├── models/
│       │   ├── risk/
│       │   ├── realtime/
│       │   └── schemas/
│       ├── tests/
│       ├── model_artifacts/
│       ├── requirements.txt
│       └── README.md
├── blockchain/
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.ts
│   ├── package.json
│   └── README.md
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── README.md
├── packages/
│   └── shared-types/
├── docs/
│   ├── phases/
│   ├── decisions/
│   ├── api/
│   ├── build-status.md
│   └── runbooks/
├── AGENTS.md
├── ONE_SHOT_BUILD.md
├── README.md
├── plan.md
├── design.md
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
The CSS organization should use apps/web/styles for authored CSS modules/partials and apps/web/app/globals.css for the root import point. The public directory is reserved for static assets and should not become the home of authored CSS architecture.
19. Shared Types
Create a small shared type vocabulary only after route shells and basic UI are stable. Shared types must be domain-first and must not mirror raw database tables blindly.
- RiskLevel: LOW | MEDIUM | HIGH | CRITICAL.
- SessionState: IDLE | STARTING | ACTIVE | DEGRADED | STOPPED | FAILED.
- CaptureState: OFF | REQUESTING | ACTIVE | PAUSED | DENIED | UNSUPPORTED | ERROR.
- AnalysisState: WAITING_FOR_AUDIO | PROCESSING | READY | UNCERTAIN | ERROR.
- SourceType: WEBRTC | MICROPHONE | DISPLAY_AUDIO | FILE | TELEPHONY_ADAPTER | FUTURE_PROVIDER.
- SyntheticLabel: NATURAL_SIGNAL | SYNTHETIC_SIGNAL | REPLAY_SIGNAL | VOICE_CONVERSION_SIGNAL | UNCERTAIN.
- VerificationDecision: PENDING | CONFIRMED | REJECTED | ESCALATED | EXPIRED.
- IncidentStatus: OPEN | INVESTIGATING | CONTAINED | RESOLVED | FALSE_POSITIVE.
20. Database Model
The database is multi-tenant ready. Even a single-user demo should retain an organization boundary so later deployment does not require a destructive redesign.
organizations: Tenant boundary and display metadata.
organization_members: User-to-organization role mapping.
profiles: User profile and preferences.
devices: Authorized browser/device registration metadata, if used.
calls: Logical call/session record.
capture_sessions: Realtime capture/analysis session state.
analysis_results: Chunk or aggregate analysis outputs.
speaker_enrollments: Reference voice enrollment metadata and embedding storage policy. Embeddings should be encrypted/protected and minimized.
alerts: Triggered risk alerts.
incidents: Security investigations linked to sessions/alerts.
verification_requests: Secondary verification workflow records.
evidence_records: Canonical evidence manifests, hashes, provenance and verification state.
audit_events: Security-relevant actions.
model_registry: Model version and governance metadata.
risk_policies: Configurable scoring thresholds/weights by organization.
notification_preferences: Delivery preferences.
integrations: Future provider configuration metadata, never raw secrets in plaintext.
blockchain_registrations: On-chain transaction, network, contract and verification metadata.
Every table accessible from an exposed schema must have RLS enabled and tested. Server-only operations must use server-side credentials and never leak those credentials to the client.
21. Authentication and OAuth Design
Use Supabase Auth with Next.js App Router and server-side session handling. Supabase currently recommends the @supabase/ssr integration for SSR scenarios but identifies it as beta, so the implementation must pin the package version, wrap it in a project-local adapter, and keep provider-specific code isolated. Use the PKCE-style server callback pattern for OAuth flows.
Initial authentication sequence: register -> confirmation if enabled -> login -> session established -> dashboard. OAuth sequence: login -> provider consent -> /auth/callback -> exchange code for session -> redirect to dashboard. Password reset sequence: forgot password -> email link -> reset-password -> session update -> dashboard.
OAuth providers initially recommended for the prototype: Google and GitHub, only if project accounts and provider configuration are available. Provider secrets live in Supabase/provider configuration or secure server environment, never in client code.
22. Authorization and Role Model
- OWNER: full organization administration.
- ADMIN: users, roles, configuration, integrations, audit, model visibility.
- ANALYST: monitoring, analysis, alerts, incidents, evidence.
- OPERATOR: protected user functions, live protection, verification actions permitted by policy.
- VIEWER: read-only selected views.
- SERVICE: non-human internal execution identity where needed.
Role checks exist in both UI navigation and backend/data policy. Hiding a button is not authorization.
23. Landing Page Requirements
The landing page is a full product page, not a placeholder. It should contain: top navigation; hero; problem statement; why existing caller identification is insufficient; how VoxVerity works; realtime evidence layers; risk scoring explanation; privacy and data minimization; demo walkthrough; technology/architecture overview; future integrations; CTA; footer; legal/privacy links.
The landing page must never imply that a browser can secretly monitor arbitrary calls. Any capture statement must say “authorized audio” or “supported browser/telephony integrations.”
24. Dashboard Requirements
- Current protection state.
- Current/last call.
- Risk score and band.
- Synthetic/anti-spoof signal.
- Speaker similarity if enrollment exists.
- Acoustic/prosodic findings.
- Recent alerts.
- Open incidents.
- Session health and latency.
- Model and analysis version.
- Quick path to Live Monitor and Analysis Lab.
25. Live Monitor Requirements
- Start/stop protection.
- Display capture permission state.
- Display audio source type.
- Audio level meter.
- Waveform/frequency visualization.
- 3-second chunk timeline.
- Per-chunk analysis status.
- Current risk and trend.
- Top contributing signals.
- Alert banner when threshold crosses.
- Latency/queue/connection health.
- Safe error messages for denied permissions or disconnected WebSocket.
26. Calls Page Requirements
Calls page lists sessions/calls with timestamp, source, duration, user, risk, final outcome, alert state and incident linkage. Search, filters and pagination can initially be local/static, then become database-backed.
27. Analysis Lab Requirements
The Analysis Lab is a controlled environment for prerecorded audio and test scenario replay. It allows deterministic tests without a live external phone call. It should support WAV/other explicitly supported formats, show decoded metadata, run the DSP pipeline, run AI models when enabled, compare results across files, and create an analysis record. This page is important for model evaluation and SIH demonstration repeatability.
28. Alerts Requirements
Alerts are generated by policy. Every alert includes alert ID, severity, session/call, timestamp, trigger rules, contributing signals, recommended action, acknowledgement state, analyst notes, and incident linkage.
29. Incidents Requirements
Incidents are the investigation container. They store scope, status, owner, timeline, alert links, evidence links, verification actions, notes, resolution, false-positive indicator and audit history.
30. Verification Requirements
Secondary verification is intentionally independent of the suspicious voice. Examples include a callback to a trusted number, organization-approved confirmation workflow, or human confirmation. The demo can initially implement a synthetic verification step: a trusted reference action is simulated and produces an explicit verification result. Later, real integrations can replace it.
31. Threat Intelligence and Analytics
Threat intelligence is a later supporting module, not a blocker for the basic detection pipeline. It can track campaign patterns, repeated suspicious voice indicators, device/source metadata, and known attack characteristics without storing unnecessary raw voice content. Analytics should include detection volumes, risk distribution, false-positive/false-negative evaluation metrics, latency, session health and model version comparisons.
32. Evidence and Blockchain Requirements
Evidence is represented as a canonical manifest containing session ID, result IDs, timestamps, model versions, policy version, summary signals, event ordering and hash algorithm. The evidence hash is computed from a canonical serialization so that the same evidence produces the same digest. The blockchain contract stores the digest and minimal metadata such as record ID, creator/tenant-safe identifier, timestamp and document hash.
Blockchain is a provenance layer, not the primary database. The application must remain functional if blockchain is unavailable. A pending registration state is acceptable.
33. Smart Contract Requirements
contract VoiceIntegrityRegistry {
  function registerEvidence(bytes32 evidenceHash, bytes32 recordId, uint64 createdAt) external;
  function getEvidence(bytes32 recordId) external view returns (bytes32 evidenceHash, uint64 createdAt, address registrar);
  function verifyEvidence(bytes32 recordId, bytes32 evidenceHash) external view returns (bool);
}
The exact contract interface may evolve. Unit tests must cover duplicate registration policy, unauthorized actions if access control exists, zero hashes, missing records, and verification mismatches.
34. Error Taxonomy
- AUTH_REQUIRED.
- FORBIDDEN.
- INVALID_SESSION.
- CAPTURE_PERMISSION_DENIED.
- CAPTURE_UNSUPPORTED.
- AUDIO_FORMAT_INVALID.
- AUDIO_TOO_SHORT.
- AUDIO_DECODE_FAILED.
- AUDIO_QUALITY_LOW.
- WEBSOCKET_DISCONNECTED.
- ANALYSIS_TIMEOUT.
- MODEL_UNAVAILABLE.
- MODEL_INPUT_INVALID.
- DATABASE_ERROR.
- BLOCKCHAIN_UNAVAILABLE.
- BLOCKCHAIN_TX_FAILED.
- CONFIG_INVALID.
- RATE_LIMITED.
- INTERNAL_ERROR.
User-facing error messages should be actionable without leaking stack traces or secret material.
35. Configuration and Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_SERVICE_URL=
AI_SERVICE_API_KEY=
NEXT_PUBLIC_APP_URL=
BLOCKCHAIN_RPC_URL=
BLOCKCHAIN_PRIVATE_KEY=
VOICE_REGISTRY_ADDRESS=
CHAIN_ID=80002
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
Only variables explicitly prefixed NEXT_PUBLIC may be safely considered browser-visible, and even then only non-secret values are allowed. Service-role keys and blockchain private keys are server-only. The final naming convention must follow current Supabase naming guidance where applicable.
36. Logging and Observability
- Structured logs with timestamp, service, level, request/session correlation ID.
- No raw audio in standard logs.
- No access tokens or passwords in logs.
- Record model ID and version on each analysis event.
- Record WebSocket connection lifecycle and queue latency.
- Record database and blockchain failure types without secrets.
- Production-like deployments need health and readiness endpoints.
- The dashboard should display high-level connection and processing health to operators.
37. Testing Strategy
37.1 Frontend
- TypeScript compile check.
- ESLint.
- Build.
- Route smoke tests.
- Authentication route tests.
- Permission-denied and browser-unsupported capture tests.
- WebSocket reconnect behavior.
- Accessibility smoke tests.
37.2 Backend
- Unit tests for DSP metrics with known signals.
- Unit tests for risk engine boundaries 0, 25, 26, 50, 51, 75, 76, 100.
- Unit tests for invalid audio.
- WebSocket sequence ordering tests.
- Model wrapper tests using small fixed fixtures.
- API authorization tests.
- Evidence hash reproducibility tests.
37.3 AI Evaluation
Do not evaluate the detector only on demo audio. Maintain separate development, validation and challenge sets. At minimum measure EER or an appropriate detection metric for spoof detection, speaker verification threshold metrics, confusion matrices by class, latency, and out-of-domain behavior. The demo must report limitations honestly.
38. Performance Targets
- Browser must remain responsive during capture and WebSocket transmission.
- Transport cadence target: approximately one message every 3 seconds.
- Server must bound per-session queues and reject stale/out-of-order chunks.
- DSP metrics should complete quickly enough to keep up with realtime input on CPU.
- AASIST-L should be benchmarked on the target low-end machine/server before promising realtime behavior.
- If model inference exceeds realtime, the system must degrade explicitly, not silently build an infinite backlog.
- Target end-to-end update latency for a demo: preferably under 3 seconds after each chunk, with measured reporting rather than an invented guarantee.
39. Deployment Strategy
Prototype deployment can use Vercel for the Next.js web application, Supabase for managed database/auth, and a Python host that supports long-lived WebSocket connections for the AI service. Free-tier limitations such as sleep, ephemeral storage, quotas and connection behavior must be accepted for demos only. AI model artifacts should not depend on persistent local files unless the deployment environment guarantees them; otherwise download/pin artifacts at build time or use packaged model files within approved limits.
A local-first development setup remains the reference environment because it reduces dependency on cloud quotas. The browser connects to the local Next.js app and local FastAPI AI service during early phases.
40. Initialization Instructions
40.1 Machine Prerequisites
- Windows development machine.
- Git for Windows.
- Node.js 24 LTS.
- Python 3.13.x.
- VS Code or equivalent editor.
- Optional FFmpeg runtime for audio decoding.
- Optional GitHub CLI.
- A GitHub account.
- A Supabase account only when database/auth phases begin.
- A blockchain test wallet only when blockchain phases begin.
40.2 Repository Initialization
mkdir voxverity
cd voxverity
git init
git branch -M main
npx create-next-app@latest apps/web --ts --eslint --app --src-dir=false
The exact create-next-app flags should be confirmed against the installed Next.js 16 CLI during execution. If the CLI prompts interactively, choose TypeScript, App Router, ESLint, and no Tailwind unless the team explicitly decides to add Tailwind later. Do not create a Vite application.
40.3 Python Environment
cd services/ai-service
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
Install Python packages only inside the project environment. Do not install PyTorch or AI packages globally.
40.4 Git Rules
git status
git add .
git commit -m "chore: initialize voxverity repository"
Every phase must end with a clean working tree and a commit hash recorded in docs/build-status.md.
41. Engineering Agent Files
41.1 AGENTS.md
AGENTS.md is the constitution for coding agents. It must state: mission, architecture, source-of-truth rules, no-go technologies, security constraints, privacy requirements, model limitations, phase discipline, testing discipline, dependency discipline, git requirements, and stop conditions.
41.2 plan.md
plan.md is the human-readable master phase map. It must list all phases, dependencies, current state and acceptance criteria at a high level.
41.3 design.md
design.md records UX/product behavior, visual language, risk semantics, privacy UX, component interaction rules, and user roles.
41.4 docs/build-status.md
build-status.md records phase number, status, commit hash, verification date, test results, known limitations and next phase. This file is the persistent memory of progress.
41.5 docs/phases/
Every phase gets its own file. A coding agent must read the current phase file before editing and may not implement later phases.
41.6 ONE_SHOT_BUILD.md
ONE_SHOT_BUILD.md is an optional bootstrap/orchestration prompt. It must not become the normal workflow. Normal development is one phase per verified commit.
42. Phase Execution Protocol
1. Open repository and confirm clean working tree.
2. Read AGENTS.md.
3. Read plan.md and design.md.
4. Read docs/build-status.md.
5. Read exactly the current phase file.
6. Inspect existing code before changing anything.
7. Implement only the current phase.
8. Run required checks.
9. Manually verify the acceptance criteria.
10. Fix failures.
11. Update phase documentation and build-status.
12. Commit the verified phase.
13. Report changed files, tests, commit hash, known limitations.
14. STOP.
43. Incremental Phase Plan
The phases below are intentionally small and dependent. Each phase should be independently runnable and visually checkable before the next phase begins. A phase may add structure that looks incomplete, but it must not break what already works.
Phase 01: Repository Bootstrap and Constitution
Objective: Create the monorepo, base Next.js app, Git hygiene and agent engineering files.
Depends on: None
Outputs:
- Git repository
- Next.js web app scaffold
- AGENTS.md
- plan.md
- design.md
- docs/build-status.md
- phase documents
Execution steps:
1. Create repository and initialize Git.
2. Create Next.js 16 app with TypeScript, App Router and ESLint.
3. Create top-level directories for services, blockchain, supabase, packages and docs without implementing their internals.
4. Create constitution and phase protocol files.
5. Run Next.js dev server and build.
6. Commit.
Acceptance criteria:
- Repository opens.
- npm run dev works.
- npm run build succeeds.
- No Vite project exists.
- Working tree clean after commit.
Manual verification:
- Open the home page in a browser.
- Confirm README/AGENTS/plan/design exist.
Failure handling:
- Missing prerequisite stops phase.
- Any conflicting architecture is documented and not patched blindly.
Required Git commit message: chore: bootstrap voxverity project
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 02: Route Skeleton
Objective: Create all public, auth, protected and admin route shells so navigation targets exist early.
Depends on: Phase 01
Outputs:
- Every declared route renders a route-safe shell
- Loading/error placeholders
- Auth policy metadata
Execution steps:
1. Create route groups and pages.
2. Add simple navigation links for public pages.
3. Add placeholder protected layout that does not yet require live Supabase auth.
4. Build and visit representative routes.
5. Commit.
Acceptance criteria:
- All listed routes return 200 or expected placeholder/redirect behavior.
- No route import error.
- Dynamic routes compile.
Manual verification:
- Click every nav link from a route index page.
- Test one dynamic route with a dummy ID.
Failure handling:
- A single route failure blocks completion.
- Do not begin feature work until routing is stable.
Required Git commit message: feat: add voxverity route skeleton
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 03: CSS and UI Foundation
Objective: Create the CSS organization and global visual foundation without adding a design system dependency.
Depends on: Phase 02
Outputs:
- styles/variables.css
- reset.css
- typography.css
- layout.css
- components.css
- globals.css import chain
Execution steps:
1. Create CSS files.
2. Define spacing, typography, radius and status conventions.
3. Keep public/ for static assets.
4. Apply foundation to route shell.
5. Build.
6. Commit.
Acceptance criteria:
- CSS imports resolve.
- No hydration issues.
- All pages have stable base styles.
Manual verification:
- Open public and protected placeholder pages at desktop and mobile widths.
Failure handling:
- If a CSS import fails, fix before commit.
Required Git commit message: feat: establish css foundation
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 04: Landing Page
Objective: Build the public marketing page with navigation, multiple sections and footer.
Depends on: Phase 03; preconditions: Functional navigation; Responsive public shell; No auth dependency
Outputs:
- Hero
- Problem
- Solution
- How it works
- Evidence layers
- Privacy
- Architecture
- Demo CTA
- Footer
Execution steps:
1. Implement sections one by one.
2. Link CTAs to login/register.
3. Add accessible headings and buttons.
4. Test mobile layout.
5. Commit.
Acceptance criteria:
- Landing page works at /.
- All nav links work.
- No fake promises about universal call capture.
Manual verification:
- Scroll through the complete page.
- Test keyboard navigation and mobile width.
Failure handling:
- Do not add backend dependencies.
Required Git commit message: feat: build voxverity landing page
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 05: Authentication UI
Objective: Create login, register, forgot-password and reset-password pages without wiring Supabase yet.
Depends on: Phase 04; preconditions: Landing page; Route shells
Outputs:
- Login form
- Register form
- Forgot password form
- Reset password form
- Validation states
- Auth callback shell
Execution steps:
1. Build each auth page.
2. Add client-side validation.
3. Add loading and error states.
4. Do not call a backend yet.
5. Commit.
Acceptance criteria:
- Forms render and validate.
- Submit actions show controlled placeholder behavior.
- No password values are logged.
Manual verification:
- Test empty, invalid, and valid-shaped input.
Failure handling:
- Do not add fake authentication success.
Required Git commit message: feat: add authentication ui
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 06: Supabase Project and Email Auth
Objective: Create Supabase project and wire secure session-based email/password authentication.
Depends on: Phase 05; preconditions: Auth UI; Environment management
Outputs:
- Supabase client utilities
- Env template
- Register/login/logout
- Protected layout
- Session refresh
Execution steps:
1. Create Supabase project.
2. Configure env variables.
3. Install current compatible Supabase packages.
4. Implement SSR client/server utilities.
5. Implement sign-up/sign-in/sign-out.
6. Protect dashboard.
7. Test.
8. Commit.
Acceptance criteria:
- Registered user can sign in and reach dashboard.
- Unauthenticated user is redirected.
- Session survives refresh.
Manual verification:
- Perform real sign-up/login/logout.
- Verify no secrets appear in browser source.
Failure handling:
- If Supabase configuration is missing, stop and report credential blocker.
Required Git commit message: feat: integrate supabase email auth
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 07: OAuth
Objective: Add Google and GitHub OAuth using Supabase Auth and proper callback handling.
Depends on: Phase 06; preconditions: Email auth; Supabase project
Outputs:
- OAuth buttons
- Callback route
- Provider error handling
Execution steps:
1. Configure provider consoles.
2. Add provider IDs/secrets securely.
3. Implement signInWithOAuth.
4. Implement /auth/callback code exchange.
5. Test local redirect.
6. Commit.
Acceptance criteria:
- OAuth sign-in reaches dashboard.
- Cancelled consent returns safely.
- Callback rejects malformed redirect targets.
Manual verification:
- Test Google or GitHub end to end with a real test account.
Failure handling:
- Provider verification/configuration blockers stop the phase.
Required Git commit message: feat: add oauth authentication
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 08: Post-login Home Dashboard Shell
Objective: Create the authenticated home/dashboard with static/mock metrics and real user identity.
Depends on: Phase 07
Outputs:
- Working auth
Execution steps:
1. Dashboard shell
2. Top nav
3. Sidebar
4. User menu
5. Mock KPI cards
Acceptance criteria:
- Create protected layout.
- Display authenticated user.
- Add dashboard cards.
- Add empty states.
- Commit.
Manual verification:
- Dashboard only accessible after login.
- Logout works from dashboard.
Failure handling:
- Refresh while authenticated.
- Open protected URL while logged out.
Required Git commit message: feat: build dashboard shell
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 09: Protected Navigation and Global Layout
Objective: Create the full application shell and navigation to every relevant module.
Depends on: Phase 08
Outputs:
- Dashboard
Execution steps:
1. Sidebar groups
2. Header
3. Notifications placeholder
4. Organization context placeholder
Acceptance criteria:
- Add navigation links.
- Add active-state logic.
- Add mobile navigation.
- Add role placeholder.
- Commit.
Manual verification:
- Every route is reachable.
- No broken links.
Failure handling:
- Click all nav items.
- Check small viewport.
Required Git commit message: feat: build protected navigation
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 10: Calls Module UI
Objective: Create calls list and call detail pages with static data.
Depends on: Phase 09; preconditions: Protected layout
Outputs:
- Calls table/list
- Filters
- Call detail
Execution steps:
1. Define mock call types.
2. Build list.
3. Build detail.
4. Add empty/loading/error states.
5. Commit.
Acceptance criteria:
- Calls list and detail render.
Manual verification:
- Review one call and filters.
Failure handling:
- Fix route/data shape mismatch before commit.
Required Git commit message: feat: build calls module
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 11: Alerts and Incidents UI
Objective: Create alerts and incidents modules with realistic states and workflows using mock data.
Depends on: Phase 10; preconditions: Calls module
Outputs:
- Alerts list/detail
- Incidents list/detail
- Status controls
Execution steps:
1. Build alerts.
2. Build incidents.
3. Add acknowledgement/escalation UI.
4. Commit.
Acceptance criteria:
- Workflows are visually complete even if backend is mocked.
Manual verification:
- Exercise alert-to-incident flow.
Failure handling:
- Do not pretend data is persisted yet.
Required Git commit message: feat: build alerts incidents ui
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 12: Analysis and Verification UI
Objective: Create analysis detail, verification and model evidence views with mock results.
Depends on: Phase 11; preconditions: Alerts/incidents
Outputs:
- Analysis result view
- Verification view
- Evidence summary
Execution steps:
1. Display risk, synthetic signal, speaker similarity, DSP metrics, context, uncertainty.
2. Add verification action UI.
3. Commit.
Acceptance criteria:
- Analysis page shows decomposable evidence.
Manual verification:
- Inspect high/medium/uncertain states.
Failure handling:
- Never label model score as certainty.
Required Git commit message: feat: build analysis verification ui
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 13: Settings and Admin UI
Objective: Create profile, security, privacy, risk, notification, users, models and system settings shells.
Depends on: Phase 12; preconditions: Authenticated shell
Outputs:
- All settings routes
- Admin route group
- Role placeholders
Execution steps:
1. Build forms with static data.
2. Add permission messaging.
3. Commit.
Acceptance criteria:
- No broken admin routes.
Manual verification:
- Check viewer-like user cannot accidentally see admin actions in UI.
Failure handling:
- Backend authorization is deferred to later phase.
Required Git commit message: feat: build settings admin ui
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 14: Database Schema and RLS
Objective: Create Supabase migrations for organizations, users/profile, calls, sessions, alerts, incidents, evidence, audit and configuration.
Depends on: Phase 13; preconditions: Supabase auth
Outputs:
- SQL migrations
- RLS policies
- Seed organization
Execution steps:
1. Design tables.
2. Add foreign keys and indexes.
3. Enable RLS.
4. Write tests or SQL verification queries.
5. Seed minimal tenant.
6. Commit.
Acceptance criteria:
- Migrations apply cleanly.
- RLS blocks cross-tenant access.
Manual verification:
- Use two test users/tenants.
Failure handling:
- Never disable RLS to “make the demo work.”
Required Git commit message: feat: add supabase schema and rls
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 15: Connect Dashboard to Supabase
Objective: Replace dashboard mock data with real authenticated database queries.
Depends on: Phase 14; preconditions: Database schema
Outputs:
- Real KPIs
- Real recent calls/alerts/incidents
Execution steps:
1. Implement server-side queries.
2. Add empty states.
3. Add error handling.
4. Commit.
Acceptance criteria:
- Dashboard reflects database state.
Manual verification:
- Create/delete test records and refresh.
Failure handling:
- Preserve mock data only for explicit demo fixtures.
Required Git commit message: feat: connect dashboard to database
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 16: CRUD for Calls Alerts Incidents
Objective: Make application modules persist data safely.
Depends on: Phase 15; preconditions: Dashboard database integration
Outputs:
- Create/read/update operations
- Audit events for meaningful changes
Execution steps:
1. Implement CRUD through server actions or route handlers as appropriate.
2. Validate inputs.
3. Add RLS-aware queries.
4. Commit.
Acceptance criteria:
- CRUD works for authorized user.
- Unauthorized access fails.
Manual verification:
- Exercise full lifecycle.
Failure handling:
- No direct client-side service-role usage.
Required Git commit message: feat: add security workflow crud
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 17: FastAPI AI Service Skeleton
Objective: Create Python service with /health, /ready, /version and typed schemas.
Depends on: Phase 16; preconditions: Repository bootstrap
Outputs:
- FastAPI service
- Virtualenv instructions
- API schema
Execution steps:
1. Create service.
2. Add basic dependency set.
3. Implement health routes.
4. Add tests.
5. Commit.
Acceptance criteria:
- Service starts locally.
- Health tests pass.
Manual verification:
- Open Swagger locally.
Failure handling:
- Do not load ML models yet.
Required Git commit message: feat: add fastapi ai service
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 18: Web to AI Health Integration
Objective: Connect Next.js to FastAPI health endpoint and display service status.
Depends on: Phase 17; preconditions: FastAPI service; Protected dashboard
Outputs:
- AI status card
- Server-side health check
Execution steps:
1. Add AI_SERVICE_URL.
2. Implement backend-safe health fetch.
3. Handle down service.
4. Commit.
Acceptance criteria:
- Dashboard correctly reports AI online/offline.
Manual verification:
- Stop FastAPI and observe UI failure state.
Failure handling:
- Never expose private AI API key to client.
Required Git commit message: feat: connect web to ai service
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 19: Audio Lab File Upload
Objective: Allow controlled audio file uploads to the Analysis Lab and send them to FastAPI for metadata inspection only.
Depends on: Phase 18; preconditions: AI service
Outputs:
- Upload UI
- FastAPI file endpoint
- Audio metadata response
Execution steps:
1. Define allowed formats/size limits.
2. Upload to API.
3. Decode and inspect sample rate/channels/duration.
4. Commit.
Acceptance criteria:
- Valid file analyzed.
- Invalid file rejected.
Manual verification:
- Test WAV and unsupported file.
Failure handling:
- Do not store uploads permanently by default.
Required Git commit message: feat: add audio analysis lab
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 20: DSP Analysis v1
Objective: Implement loudness, dynamics, silence and spectral metrics.
Depends on: Phase 19; preconditions: Audio Lab
Outputs:
- DSP module
- Structured metric response
- Charts in Analysis Lab
Execution steps:
1. Normalize audio.
2. Compute RMS/dBFS/peak/crest/ZCR/centroid/bandwidth/rolloff/silence/pitch where reliable.
3. Add tests with synthetic signals.
4. Display results.
5. Commit.
Acceptance criteria:
- Metrics are reproducible.
- No NaN leaks to API output.
Manual verification:
- Test silence, sine, speech sample and clipped audio.
Failure handling:
- This is not a deepfake detector.
Required Git commit message: feat: add dsp analysis
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 21: Human-pattern Demo Signal
Objective: Create an explicitly heuristic descriptive layer based on DSP behavior.
Depends on: Phase 20; preconditions: DSP v1
Outputs:
- Human-pattern descriptor
- Quality flags
- Non-authoritative score
Execution steps:
1. Define features.
2. Implement a transparent rule/heuristic score.
3. Label it descriptive.
4. Commit.
Acceptance criteria:
- Results explain which features drove the descriptor.
Manual verification:
- Compare quiet/noisy/speech examples.
Failure handling:
- Do not call this AI detection or authenticity proof.
Required Git commit message: feat: add acoustic behavior demo signal
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 22: Pretrained AASIST-L Integration
Objective: Integrate AASIST-L locally and expose model score with model metadata.
Depends on: Phase 21; preconditions: AI service; Audio normalization
Outputs:
- Model wrapper
- Pinned checkpoint
- Evaluation script
Execution steps:
1. Acquire model from official/current model card source.
2. Verify checkpoint hash.
3. Implement 16 kHz mono input.
4. Use rolling ~4.04s context.
5. Test inference.
6. Commit.
Acceptance criteria:
- Model runs on CPU.
- Output semantics are documented.
Manual verification:
- Benchmark inference time on target machine.
Failure handling:
- If model file/license/source cannot be verified, stop.
Required Git commit message: feat: integrate aasist-l
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 23: AASIST Evaluation and Calibration
Objective: Evaluate AASIST-L on controlled test data and establish a project signal mapping without claiming unvalidated probabilities.
Depends on: Phase 22; preconditions: AASIST-L integration
Outputs:
- Evaluation report
- Signal normalization/calibration config
Execution steps:
1. Collect legally usable test fixtures.
2. Run baseline metrics.
3. Inspect out-of-domain behavior.
4. Choose score normalization.
5. Document limitations.
6. Commit.
Acceptance criteria:
- Evaluation report exists.
- UI language matches evidence semantics.
Manual verification:
- Review false positives/negatives.
Failure handling:
- Do not tune against the demo test file only.
Required Git commit message: feat: evaluate aasist-l
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 24: Speaker Enrollment and ECAPA-TDNN
Objective: Add explicit speaker enrollment and similarity checking.
Depends on: Phase 23; preconditions: Database schema; AI service
Outputs:
- Enrollment workflow
- Embedding generation
- Similarity score
Execution steps:
1. Create enrollment consent flow.
2. Generate reference embedding.
3. Store protected reference metadata.
4. Verify test utterance.
5. Commit.
Acceptance criteria:
- Enrollment and comparison work.
- Unenrolled state works.
Manual verification:
- Test same speaker and different speaker.
Failure handling:
- Do not present similarity as identity proof.
Required Git commit message: feat: add speaker verification
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 25: Analysis Aggregation and Versioning
Objective: Combine DSP, AASIST-L and ECAPA outputs into a structured analysis result with version metadata.
Depends on: Phase 24; preconditions: AASIST evaluation; Speaker verification
Outputs:
- AnalysisResult schema
- Versioned signal bundle
Execution steps:
1. Define schema.
2. Store model IDs.
3. Aggregate chunk results.
4. Commit.
Acceptance criteria:
- Every result is attributable and versioned.
Manual verification:
- Open an analysis record and inspect raw structured evidence.
Failure handling:
- Do not mix model versions in one result without recording both.
Required Git commit message: feat: aggregate analysis signals
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 26: Risk Engine v1
Objective: Implement deterministic 0-100 scoring and default severity thresholds.
Depends on: Phase 25; preconditions: Analysis aggregation
Outputs:
- Risk engine
- Policy schema
- Unit tests
Execution steps:
1. Normalize signals.
2. Implement weights.
3. Implement thresholds.
4. Add explanation.
5. Test boundaries.
6. Commit.
Acceptance criteria:
- Scores are bounded and reproducible.
Manual verification:
- Test threshold boundaries and missing-signal scenarios.
Failure handling:
- Weights must be configurable in config, not buried in UI.
Required Git commit message: feat: add deterministic risk engine
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 27: Realtime WebSocket Audio Pipeline
Objective: Stream three-second browser audio chunks to FastAPI and return analysis/risk updates.
Depends on: Phase 26; preconditions: Risk engine; Browser capture
Outputs:
- WebSocket endpoint
- Binary audio transfer
- Sequence handling
Execution steps:
1. Implement capture state machine.
2. Convert browser stream to supported chunks.
3. Send one chunk per 3-second cadence.
4. Validate order/session.
5. Analyze and return results.
6. Commit.
Acceptance criteria:
- End-to-end local realtime loop works.
- No uncontrolled backlog.
Manual verification:
- Use two tabs or browser call demo.
Failure handling:
- If latency exceeds cadence, mark degraded rather than buffering endlessly.
Required Git commit message: feat: add realtime audio pipeline
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 28: WebRTC Controlled Demo Call
Objective: Create a controlled browser-to-browser WebRTC call inside the product or demo lab so remote incoming voice has a legitimate browser MediaStream source.
Depends on: Phase 27; preconditions: Realtime WebSocket pipeline
Outputs:
- Caller demo view
- Receiver demo view
- Remote audio stream
Execution steps:
1. Create minimal peer connection/signaling.
2. Expose caller and receiver roles.
3. Route remote audio to analysis pipeline.
4. Show capture consent.
5. Commit.
Acceptance criteria:
- Receiver can hear caller and analyze remote stream.
Manual verification:
- Use two browser tabs or two devices.
Failure handling:
- Do not depend on arbitrary external phone capture.
Required Git commit message: feat: add browser webrtc demo call
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 29: Realtime DSP Dashboard
Objective: Display live acoustic metrics and changing risk as chunks arrive.
Depends on: Phase 28; preconditions: WebRTC demo; Risk engine
Outputs:
- Live waveform/levels
- Metric cards
- Chunk timeline
- Risk trend
Execution steps:
1. Wire analysis events to UI.
2. Add connection state.
3. Add trend chart.
4. Commit.
Acceptance criteria:
- Values change during the call.
Manual verification:
- Speak, pause, vary volume and observe.
Failure handling:
- Do not imply loudness equals authenticity.
Required Git commit message: feat: build realtime analysis dashboard
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 30: Alerts and Secondary Verification
Objective: Trigger alerts on configurable risk thresholds and implement human verification workflow.
Depends on: Phase 29; preconditions: Realtime risk
Outputs:
- Alert creation
- Verification request
- Incident linkage
Execution steps:
1. Trigger policy.
2. Persist alert.
3. Create verification request.
4. Allow human decision.
5. Commit.
Acceptance criteria:
- High risk produces alert and verification state.
Manual verification:
- Exercise crossing threshold and confirming/rejecting.
Failure handling:
- No automatic irreversible action.
Required Git commit message: feat: add realtime alerts verification
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 31: Incident and Evidence Package
Objective: Generate incident timeline and canonical evidence manifest from a suspicious session.
Depends on: Phase 30; preconditions: Alerts/verification
Outputs:
- Incident record
- Evidence manifest
- SHA-256 hash
Execution steps:
1. Collect structured results.
2. Canonicalize JSON.
3. Hash manifest.
4. Persist evidence metadata.
5. Commit.
Acceptance criteria:
- Same manifest produces same hash.
Manual verification:
- Recompute hash manually.
Failure handling:
- Do not hash non-deterministic JSON ordering.
Required Git commit message: feat: add evidence packaging
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 32: Blockchain Evidence Registry
Objective: Deploy and use Solidity evidence registry on Polygon Amoy.
Depends on: Phase 31; preconditions: Evidence package; Blockchain project
Outputs:
- Contract
- Deployment script
- Registration/verification UI
Execution steps:
1. Initialize Hardhat.
2. Write tests.
3. Deploy to local network.
4. Deploy to Amoy with funded test wallet.
5. Register evidence hash.
6. Verify hash.
7. Commit.
Acceptance criteria:
- On-chain registration succeeds.
- Verification succeeds/mismatches correctly.
Manual verification:
- Inspect transaction and contract address.
Failure handling:
- Never use mainnet or real funds for the prototype.
Required Git commit message: feat: add blockchain evidence registry
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 33: Audit and Governance
Objective: Complete audit event coverage, model registry, policy history and operator accountability.
Depends on: Phase 32; preconditions: All security workflows
Outputs:
- Audit UI
- Model registry
- Policy versions
Execution steps:
1. Record actions.
2. Link model versions.
3. Record threshold changes.
4. Commit.
Acceptance criteria:
- Security-relevant actions are traceable.
Manual verification:
- Change risk policy and inspect audit history.
Failure handling:
- Never log secrets or raw audio.
Required Git commit message: feat: add governance and audit
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 34: Integrations Framework
Objective: Create pluggable source adapter contracts without implementing production vendor integrations.
Depends on: Phase 33; preconditions: Realtime pipeline
Outputs:
- Audio source adapter interface
- Future integration documentation
Execution steps:
1. Define common audio contract.
2. Add stub adapters for Telephony/SIP/Twilio/meeting platforms.
3. Document required credentials/legal review.
4. Commit.
Acceptance criteria:
- Core AI pipeline remains source-agnostic.
Manual verification:
- Inspect adapter contract.
Failure handling:
- Do not fake a provider integration.
Required Git commit message: feat: add audio source adapter framework
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 35: Multilingual and Accent Readiness
Objective: Add metadata, configuration and test scaffolding for Indian language/accent coverage without claiming trained multilingual accuracy.
Depends on: Phase 34; preconditions: Analysis aggregation
Outputs:
- Language metadata
- Dataset matrix
- Evaluation hooks
Execution steps:
1. Add language/accent metadata.
2. Allow unknown/other.
3. Create evaluation matrix.
4. Commit.
Acceptance criteria:
- No UI assumes English-only.
Manual verification:
- Run mixed-language metadata tests.
Failure handling:
- Do not claim performance without evaluation.
Required Git commit message: feat: add multilingual readiness
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 36: Analytics and Threat Intelligence
Objective: Build operational analytics and basic campaign-oriented views from structured metadata.
Depends on: Phase 35; preconditions: Database; Audit
Outputs:
- Analytics dashboard
- Trend views
- Threat intelligence shell
Execution steps:
1. Aggregate risk distributions.
2. Show alert frequency.
3. Show model version comparisons.
4. Commit.
Acceptance criteria:
- Analytics match stored data.
Manual verification:
- Cross-check a small sample manually.
Failure handling:
- Do not expose sensitive PII in aggregate dashboards.
Required Git commit message: feat: add analytics and threat intelligence
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 37: Security Hardening
Objective: Apply security headers, validation, rate limits, secret hygiene, CSP review, auth edge cases and dependency audit.
Depends on: Phase 36; preconditions: All core functionality
Outputs:
- Hardening report
- Security tests
Execution steps:
1. Run dependency audit.
2. Validate inputs.
3. Review CORS and WebSocket origin checks.
4. Review secrets.
5. Review RLS.
6. Commit.
Acceptance criteria:
- Critical/high issues addressed or documented.
Manual verification:
- Attempt unauthorized access paths.
Failure handling:
- Do not suppress findings without documentation.
Required Git commit message: security: harden voxverity
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 38: Performance and Reliability
Objective: Measure realtime latency, CPU, memory, queue growth and reconnect behavior.
Depends on: Phase 37; preconditions: Security hardening
Outputs:
- Performance report
- Limits
- Backpressure policy
Execution steps:
1. Measure chunk pipeline.
2. Test disconnect/reconnect.
3. Test slow model.
4. Implement bounded queues.
5. Commit.
Acceptance criteria:
- System remains stable under controlled sustained demo.
Manual verification:
- Run a 5-10 minute session.
Failure handling:
- If target cannot be met, document the measured limit and degradation behavior.
Required Git commit message: perf: stabilize realtime pipeline
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 39: End-to-End Demo and Runbook
Objective: Create the repeatable SIH demonstration scenario from login through realtime detection to blockchain verification.
Depends on: Phase 38; preconditions: Everything above
Outputs:
- Demo script
- Operator checklist
- Troubleshooting guide
Execution steps:
1. Create clean demo data.
2. Document environment setup.
3. Document scenario.
4. Run from clean start.
5. Commit.
Acceptance criteria:
- A new operator can reproduce the demo using the runbook.
Manual verification:
- Perform rehearsal.
Failure handling:
- No hidden manual steps.
Required Git commit message: docs: add end to end demo runbook
Phase rule: stop after this phase. Do not implement later phases automatically.
Phase 40: Production-Shaped Finalization
Objective: Prepare deployment manifests, environment documentation, backups, retention rules, final model governance and release notes.
Depends on: Phase 39; preconditions: End-to-end demo
Outputs:
- Release checklist
- Deployment docs
- Known limitations
Execution steps:
1. Freeze architecture.
2. Verify versions.
3. Run full test matrix.
4. Record limitations.
5. Commit.
Acceptance criteria:
- Release candidate is reproducible.
Manual verification:
- Deploy to staging-like environment if available.
Failure handling:
- Do not claim production readiness without operational controls.
Required Git commit message: release: prepare voxverity candidate
Phase rule: stop after this phase. Do not implement later phases automatically.
44. Phase Dependencies and Checkpoints
Phases are dependent in sequence but intentionally isolated in scope. A later phase may consume earlier artifacts, but it must not alter earlier contracts without updating the relevant decision record and regression tests.
1. 01-04 establish repository, routes and public UI foundation.
2. 05-06 establish real identity and OAuth.
3. 07-15 establish the application data shell and persistent security workflow.
4. 16-20 establish the AI service and explanatory DSP baseline.
5. 21-25 establish real pretrained AI signals and deterministic risk.
6. 26-29 establish controlled realtime browser audio, WebRTC input, alerts and verification.
7. 30-31 establish evidence and blockchain provenance.
8. 32-35 add governance, integration abstraction, multilingual readiness and analytics.
9. 36-39 harden, measure, document and release.
45. Demo Scenario Specification
The canonical demo uses two browser contexts. Context A is the caller demo. Context B is the protected receiver running VoxVerity. The call is browser/WebRTC controlled. The receiver explicitly enables protection. Audio from the remote WebRTC stream is routed into the analysis pipeline. Audio is processed continuously in approximately three-second transport segments. DSP metrics update immediately. AASIST-L becomes active when the rolling context is sufficiently long. If a reference speaker is enrolled, ECAPA-TDNN similarity is shown. The risk engine combines signals. The dashboard changes in real time. If the score crosses the configured high/critical threshold, an alert appears and a verification request is created. The operator can confirm or reject. The incident can then generate an evidence manifest, hash it with SHA-256, register the hash on Polygon Amoy, and verify the recorded hash.
46. Model Evaluation Dataset Policy
Use only datasets whose licenses and terms permit the intended evaluation. Maintain a manifest for each audio fixture with source, license, language, speaker/session split, class label, preprocessing assumptions and checksum. Do not mix the demo file with evaluation metrics. For a rigorous report, include at least bona fide human speech and synthetic/spoofed material from separate sources and out-of-domain examples.
47. AI Limitations and Truthfulness Rules
- AASIST-L is an anti-spoofing model, not a universal detector of every future voice cloning method.
- Out-of-domain performance can be substantially weaker than benchmark performance.
- Speaker similarity can be affected by channel, noise, duration, language and environmental conditions.
- Acoustic features like loudness and dynamics cannot prove that speech is human or synthetic.
- A risk score is a policy output, not a probability unless statistically calibrated.
- A human operator remains part of the high-impact workflow.
- Uncertain/insufficient-context results are first-class outcomes.
48. Security Threat Model
- Attacker attempts to inject malformed audio chunks.
- Attacker attempts to replay old chunk sequences.
- Attacker attempts WebSocket session hijacking.
- Attacker attempts cross-organization data access.
- Attacker steals OAuth/session secrets.
- Attacker modifies evidence before hashing.
- Attacker attempts unauthorized blockchain registration.
- Attacker attempts model endpoint abuse for resource exhaustion.
- Attacker attempts to force the UI to display a misleading risk value.
- Attacker attempts to bypass human verification workflow.
Controls include authentication, authorization, RLS, sequence numbers, server-side validation, bounded payloads, rate limiting, TLS/WSS, canonical evidence, hash verification, audit events, least-privilege keys and safe UI semantics.
49. Browser Compatibility and Fallbacks
Feature detection is required. Microphone capture requires a secure context in deployed environments. getDisplayMedia has browser availability limitations and must not be a mandatory dependency. WebRTC support is strong in modern browsers but signaling and device permissions still require explicit handling. The app must show a “Supported / Permission required / Unsupported” capture state.
50. Free-Tier Guardrails
- Keep Supabase storage small and avoid storing raw audio by default.
- Expect free projects to have operational limitations and possible inactivity pauses.
- Keep AI inference CPU-compatible and use small models first.
- Do not rely on ephemeral filesystem persistence for model outputs or evidence.
- Do not depend on always-on free services for critical realtime guarantees.
- Keep blockchain activity on a testnet.
- Use local development as the reference fallback.
51. Version and Dependency Pinning Policy
Use lockfiles. Record exact runtime versions in docs/tool-version.txt or equivalent. For AI model artifacts, pin the repository revision or artifact hash. Do not blindly use “latest” in production-like deployments. At each release candidate, re-run current-source research and dependency/security updates. When a major version changes, create an architecture decision record and regression pass.
52. Architecture Decision Record Template
ADR ID:
Title:
Status:
Date:
Context:
Decision:
Alternatives considered:
Why chosen:
Consequences:
Security impact:
Privacy impact:
Performance impact:
Migration/rollback plan:
References:
53. Definition of Done for Every Phase
- The phase objective is implemented and only that objective is implemented.
- All phase tests pass.
- Manual acceptance criteria are checked.
- No known blocking error remains.
- Documentation reflects the implementation.
- Environment changes are recorded.
- Git working tree is clean after commit.
- Commit message is phase-specific.
- build-status.md records completion.
- The agent stops and waits for the next phase.
54. Troubleshooting Order
1. Check browser console only for the current page and avoid leaking secrets in screenshots.
2. Check Next.js terminal output.
3. Check FastAPI logs.
4. Check browser permission state.
5. Check WebSocket connection state.
6. Check session ID and chunk sequence.
7. Check audio metadata and sample rate.
8. Check DSP output for NaN/inf.
9. Check model availability and checkpoint version.
10. Check database/RLS.
11. Check blockchain RPC and wallet only for blockchain phases.
12. Do not “fix” an error by weakening security controls.
55. Final Deliverable Checklist
- Next.js application with public landing page and authenticated security dashboard.
- Full route inventory implemented.
- Supabase email auth and OAuth.
- Protected routes and roles.
- Database schema and RLS.
- Calls, alerts, incidents, verification and evidence workflows.
- FastAPI AI service.
- Realtime WebSocket audio pipeline.
- Controlled browser WebRTC demo call.
- DSP metrics.
- AASIST-L integration.
- ECAPA-TDNN speaker similarity.
- Deterministic 0-100 risk engine.
- Real-time dashboard updates.
- SHA-256 evidence hash.
- Polygon Amoy evidence registry.
- Audit and model registry.
- Demo runbook.
- Known limitations and evaluation report.
- No secrets or raw audio on-chain.
56. Explicitly Deferred Items
- Universal PSTN interception.
- Universal desktop/system audio capture.
- Direct carrier lawful-intercept integration.
- Production Twilio/SIP/PBX integration.
- Production Zoom/Teams/Meet vendor SDK integrations.
- Native mobile background capture.
- Large-scale model training from scratch.
- Automatic financial blocking.
- Mainnet blockchain deployment.
- Claims of universal multilingual deepfake detection without evaluation.
57. Current Immediate Starting Point
The implementation should start at Phase 01 with Next.js. The immediate objective is not AI. First create the repository, route shells, CSS foundation, landing page, authentication UI, and then real authentication. After the web application is stable, add Supabase persistence. Only then add the FastAPI service, then audio analysis, then pretrained models, then realtime WebSocket audio, then the controlled WebRTC call, then alerts/evidence/blockchain. This order lets the project be run and visually checked after each small increment and prevents the AI/telephony complexity from destabilizing the basic product shell.
58. Engineering Principle for the Team
Build something small -> run it -> see it -> verify it -> test it -> commit it -> stop -> start the next phase. The repository, not the coding-agent chat, is the persistent project memory.
59. Research Notes Used for This Baseline
Next.js 16.2.11 is identified as Active LTS in the July 2026 security announcement on the official Next.js blog. Node.js official downloads currently show v24.20.0 LTS. Python 3.13.15 is a current maintenance release while 3.14 is the latest feature line; this SRS deliberately uses 3.13 for ML compatibility conservatism. .NET 10 is current LTS, but it is excluded from the browser-first baseline. Supabase currently documents free usage with 500 MB database size and other limits, and its current Next.js quickstart uses publishable keys plus SSR/cookie-based Auth patterns. Supabase currently documents Google OAuth and an auth callback route. Supabase recommends RLS on exposed tables. MDN documents WebRTC for realtime media, WebSocket for bidirectional browser/server communication, AnalyserNode for realtime time/frequency analysis, MediaRecorder for MediaStream recording, and getDisplayMedia for user-mediated display/window/tab capture with optional audio where supported. AASIST-L current model card provides the lightweight anti-spoofing checkpoint, score semantics, 16 kHz input assumptions, deterministic 64,600-sample window and evaluation figures. SpeechBrain ECAPA-TDNN model card provides the speaker embedding model and Apache-2.0 license. Polygon Amoy is the selected EVM test network for the prototype, with Chain ID 80002.
60. Source URLs
https://nextjs.org/blog/next-16
https://nextjs.org/blog
https://nodejs.org/en/download/
https://www.python.org/downloads/release/python-31315/
https://dotnet.microsoft.com/en-us/download/dotnet/10.0
https://supabase.com/pricing
https://supabase.com/docs/guides/auth/quickstarts/nextjs
https://supabase.com/docs/guides/auth/server-side
https://supabase.com/docs/guides/auth/social-login
https://supabase.com/docs/guides/auth/social-login/auth-google
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/realtime
https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
https://librosa.org/doc/latest/
https://docs.scipy.org/doc/scipy/
https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L
https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb
https://www.alchemy.com/rpc/matic-amoy
https://www.alchemy.com/faucets/polygon-amoy
https://www.twilio.com/docs/voice/media-streams
61. Closing Engineering Rule
No later phase should be started merely because its code is easy to write. The phase order is a risk-control mechanism. The browser shell must work before auth. Auth must work before database. Database must work before security workflows. The AI service must work before realtime. Realtime must work before model inference. The controlled WebRTC input must work before claiming a live-call demo. Evidence must be generated before blockchain. Security hardening and measurement come before a release claim.
