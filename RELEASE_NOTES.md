# VoxVerity Release Notes

## Version 0.1.0 - SIH Prototype
**Release Date:** September 2026
**Type:** Initial Release Candidate

---

## Overview

VoxVerity is an AI-powered real-time voice integrity verification platform
for detecting suspicious, synthetic, cloned, or manipulated voice activity.
This release establishes the complete SIH prototype with browser-first
architecture and controlled demo capabilities.

---

## Features

### Core Analysis
- **DSP Metrics:** RMS energy, spectral centroid, crest factor, dynamic range, zero crossing rate
- **Human-Pattern Descriptor:** Heuristic acoustic behavior analysis (descriptive only)
- **AASIST-L Integration:** Pretrained audio anti-spoofing model
- **ECAPA-TDNN Integration:** Speaker embedding and similarity verification
- **Risk Engine:** Deterministic 0-100 scoring with configurable weights

### Realtime Pipeline
- **WebSocket Audio Streaming:** 3-second chunk cadence
- **Live Monitoring Dashboard:** Waveform, spectrum, risk trend, chunk timeline
- **WebRTC Demo Call:** Controlled browser-to-browser audio for testing
- **Backpressure Management:** Bounded queues with graceful degradation

### Security Workflow
- **Alert System:** Threshold-based alert creation with cooldown
- **Incident Management:** Timeline, notes, resolution workflow
- **Evidence Packaging:** Canonical manifest with SHA-256 hashing
- **Blockchain Registry:** Polygon Amoy testnet for evidence hashes

### Authentication & Authorization
- **Email/Password Auth:** Via Auth.js (NextAuth v5)
- **OAuth Support:** Google and GitHub
- **Protected Routes:** Middleware-based session validation
- **Role-Based Access:** Owner, Admin, Analyst, Operator, Viewer

### Administration
- **Settings Pages:** Profile, security, notifications, privacy, risk
- **Admin Panel:** Users, organizations, roles, models, system
- **Audit Trail:** Security event logging with filters
- **Model Registry:** Governance metadata for AI models

### Analytics & Intelligence
- **Dashboard Analytics:** Risk distribution, model performance
- **Threat Intelligence:** Campaign patterns, attack characteristics
- **Language Coverage:** 18 languages with evaluation matrix

### Integration Framework
- **Audio Source Adapters:** Pluggable interface for future integrations
- **Stub Adapters:** Telephony, SIP, Twilio, Meeting platforms
- **Source-Agnostic Design:** All adapters normalize to internal contract

### Security & Compliance
- **Security Headers:** HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting:** Per-endpoint rate limits
- **Input Validation:** File size, filename, session ID validation
- **Privacy by Design:** No raw audio storage, no PII in logs

---

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Web Framework | Next.js | 16.x |
| Language | TypeScript | 5.x |
| UI | React | 19.x |
| AI Service | FastAPI | 0.115.x |
| ML Framework | PyTorch | 2.x |
| Database | Supabase PostgreSQL | - |
| Blockchain | Polygon Amoy | Chain ID 80002 |
| Contract | Solidity | 0.8.24 |

---

## Known Limitations

See `docs/KNOWN_LIMITATIONS.md` for complete list.

### Critical
- Single-instance deployment only
- In-memory stores (no persistence across restarts)
- AASIST-L limited to in-domain data

### Important
- No production authentication
- No horizontal scaling
- Browser-only audio capture

---

## Getting Started

See `docs/runbooks/demo_runbook.md` for complete setup instructions.

### Quick Start
```bash
git clone https://github.com/Sayantan-B-dev/Ex_VoxVerity.git
cd Ex_VoxVerity
npm install
cd services/ai-service && pip install -r requirements.txt
cd ../..
npm run dev
```

### Access
- Web App: http://localhost:3000
- AI Service: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Documentation

- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/RELEASE_CHECKLIST.md` - Release verification
- `docs/KNOWN_LIMITATIONS.md` - Known limitations
- `docs/runbooks/demo_runbook.md` - Demo runbook
- `AGENTS.md` - Development constitution
- `project_info.md` - Full specification

---

## Acknowledgments

This prototype was developed for the Smart India Hackathon (SIH).
It demonstrates the feasibility of real-time voice integrity verification
using browser-first architecture and open-source AI models.

---

## License

See individual component licenses:
- AASIST-L: MIT
- ECAPA-TDNN: Apache-2.0
- Application: Project-specific
