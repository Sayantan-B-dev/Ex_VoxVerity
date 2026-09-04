# VoxVerity — Agent Constitution

> This file is the authoritative instruction set for any coding agent working on VoxVerity.
> Always read this file before making changes. Always read the current phase file before implementing.

## Mission

VoxVerity is an AI-powered real-time voice integrity verification platform. It detects suspicious, synthetic, cloned, replayed, or manipulated voice activity in authorized communication contexts. The browser-facing product is the primary user interface.

## Source of Truth

- **Full specification and engineering plan:** `project_info.md` at the project root.
- This `AGENTS.md` file defines agent behavior rules.
- `plan.md` defines the master phase map.
- `design.md` defines UX and product behavior.
- `docs/build-status.md` tracks phase progress.
- `docs/phases/` contains individual phase implementation files.

**Always refer to `project_info.md` for detailed requirements, architecture, technology choices, API inventory, database model, and phase execution details.** When in doubt, the specification in `project_info.md` overrides any summary in these agent files.

## Technology Stack (Do Not Substitute)

| Layer | Technology |
|---|---|
| Web framework | Next.js 16 (App Router), TypeScript |
| Runtime | Node.js 24 LTS |
| Package manager | npm |
| Backend auth/database | Supabase (Auth, PostgreSQL, RLS, Storage) |
| AI service | Python 3.13, FastAPI, PyTorch |
| DSP | Librosa, SciPy, NumPy |
| Models | AASIST-L (anti-spoofing), ECAPA-TDNN (speaker embeddings) |
| Blockchain | Solidity, Hardhat, ethers.js, Polygon Amoy testnet |

Any deliberate substitution requires a recorded Architecture Decision Record (ADR) in `docs/decisions/`.

## No-Go Technologies

- No Vite. The web application is Next.js only.
- No Tailwind unless the team explicitly decides later.
- No desktop agent as the core browser input architecture.
- No universal PSTN/phone interception claims.
- No raw audio or biometric embeddings stored on-chain.
- No secrets in client bundles, logs, screenshots, or blockchain payloads.
- No `service-role` keys exposed to the browser.

## Phase Discipline

1. **One phase at a time.** Do not start a later phase because its code is easy.
2. **Read before writing.** Read `AGENTS.md`, `plan.md`, `design.md`, `docs/build-status.md`, and the current phase file before any implementation.
3. **Inspect before changing.** Read existing code before modifying it.
4. **Smallest viable implementation.** Build the minimum that satisfies the phase objective and acceptance criteria.
5. **Verify.** Run the required checks (build, tests, manual verification) for the phase.
6. **Build check.** Run `npm run build` from the project root and confirm it passes **before every commit**. No exceptions.
7. **Commit.** Commit with the phase-specific commit message specified in the phase file.
8. **Stop.** After committing, stop. Wait for the next phase instruction.
9. **Clean working tree.** Every phase must end with a clean working tree.

## Phase Order (Risk-Control Mechanism)

The phase order is mandatory and exists to control risk:

1. Browser shell before auth
2. Auth before database
3. Database before security workflows
4. AI service before realtime
5. Realtime before model inference
6. Controlled WebRTC input before live-call demo claims
7. Evidence before blockchain
8. Security hardening before release

## Testing Discipline

- Every backend endpoint must have unit/integration coverage appropriate to risk.
- TypeScript must compile without errors.
- ESLint must pass.
- Next.js build must succeed.
- DSP metrics must be tested with known synthetic signals.
- Risk engine must be tested at boundary values (0, 25, 26, 50, 51, 75, 76, 100).
- Evidence hash must be reproducible from the same canonical input.

## Security Rules

- Never log raw audio, access tokens, passwords, private keys, or unnecessary PII.
- Never use `service-role` keys on the client.
- Supabase Row Level Security is mandatory on all exposed application tables.
- Never disable RLS to "make the demo work."
- Inputs must be validated at API boundaries.
- WebSocket connections must be authenticated and origin-checked.
- Blockchain private keys are server-only, never in client code.

## Privacy Rules

- Microphone and capture permissions must be requested through browser APIs, not hidden.
- The UI must show capture state (on, paused, denied, unsupported, disconnected).
- Raw audio should be processed in memory whenever possible.
- If temporary audio is persisted for debug, disclose retention and provide deletion.
- Database records reference sessions and derived results, not raw audio.
- Do not store OAuth tokens unnecessarily; never expose them in client telemetry.

## Git Requirements

- Every phase ends with a commit using the exact commit message specified in the phase file.
- Commit messages use conventional commit format (`feat:`, `fix:`, `chore:`, `security:`, `perf:`, `docs:`, `release:`).
- Never push without explicit user permission.
- Never force-push.
- Keep the working tree clean after each phase.

## Model Limitations (Truthfulness Rules)

- AASIST-L is an anti-spoofing model, not a universal detector of every future voice cloning method.
- Out-of-domain performance can be substantially weaker than benchmark performance.
- Speaker similarity can be affected by channel, noise, duration, language, and environmental conditions.
- Acoustic features like loudness and dynamics cannot prove that speech is human or synthetic.
- A risk score is a policy output, not a probability unless statistically calibrated.
- A human operator remains part of the high-impact workflow.
- Never label model output as an absolute fraud verdict. Use "model score" or "spoof signal" until calibration exists.
- The UI must not display "87% fake" unless a calibrated probability has been empirically established.

## Stop Conditions

- If a prerequisite is missing (e.g., Supabase credentials, blockchain wallet), stop and report the blocker.
- If a phase fails verification, fix before committing.
- If an architectural conflict is found, document it as an ADR, do not patch blindly.
- If uncertainty exists about requirements, ask the user.

## Documentation Requirements

- `docs/build-status.md` must be updated after every phase with: phase number, status, commit hash, verification date, test results, known limitations, and next phase.
- `docs/phases/` must contain a file for each phase.
- Architecture Decision Records go in `docs/decisions/`.
- API documentation goes in `docs/api/`.

## References

- Full specification: `project_info.md`
- Phase map: `plan.md`
- Design/UX: `design.md`
- Build status: `docs/build-status.md`
- Phase files: `docs/phases/`
