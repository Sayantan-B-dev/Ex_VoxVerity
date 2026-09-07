# FRONTEND MERGE PLAN — soumya ✕ subhankar ✕ VoxVerity

> This document is the authoritative plan for merging the two UI reference projects into the
> VoxVerity product frontend. It is written **before** the work starts, is updated as work
> proceeds, and every item below is a tracked checkbox.

---

## 1. Goal

The root `voxverity` project (Next.js + Supabase + FastAPI AI service) is fully built and works.
Two UI reference projects were added alongside it:

- **`soumya/`** — a designed, polished component set (Figma-derived): bento dashboard cards,
  radial risk meter, waveform, auth screens, profile, settings, landing, and animated viz
  primitives (stream feed, sonar, mesh surface, candles). Uses **Tailwind CSS v4** design tokens.
- **`subhankar/`** — a clean application **layout shell**: fixed sidebar + top navbar + page area,
  with page ideas for Dashboard, Live Analysis, Reports, Alerts, Profile, Settings. Uses Tailwind v4.

This plan creates **`temp_proj/`**: a new, **standalone Next.js 16 frontend-only project** that takes
**all components from `soumya/`** and arranges them in **the layout structure of `subhankar/`**,
rebranded to the VoxVerity voice-integrity product idea described in `project_info.md`.

`temp_proj/` is a style-verification harness. Once the merged style is confirmed, it will be
migrated into `apps/web/` and wired to the existing backend (Supabase + AI service).

**Hard rules (from the user):**

- ✅ Do **not** modify or delete anything inside `soumya/` or `subhankar/`.
- ✅ Do **not** import from `soumya/` or `subhankar/` — copy code into `temp_proj/` and make it fully independent.
- ✅ `temp_proj/` must be runnable on its own (`npm run dev`) with **no backend required**.
- ✅ All routes must work (no dead links, no 404s when navigating).
- ✅ No hard-coded fake data scattered through components — data is centralized in one typed
  demo-data layer (see §5) that gets swapped for real backend calls during migration.
- ✅ Next.js only. No Vite.

---

## 2. Source Material Inventory

### 2.1 Components taken from `soumya/` (copied, not imported)

| soumya component | Role in temp_proj |
|---|---|
| `components/primitives.tsx` | `Card`, `Tag`, `InfoHint`, `TickMeter`, `riskColor` — design system primitives |
| `components/forms.tsx` | `Field`, `Input`, `Select`, `Toggle`, `Checkbox`, `Btn` |
| `components/RiskMeter.tsx` | Segmented radial risk gauge (used on dashboard, live, landing, calls) |
| `components/Waveform.tsx` | Animated live waveform (live monitor) |
| `components/Loading.tsx` | Loading/init screen (used as route `loading.tsx`) |
| `components/Landing.tsx` | Public landing page (rebranded AEGISAI → VoxVerity, content → voice integrity) |
| `components/Auth.tsx` | Sign-in / sign-up / OTP flows (login & register pages) |
| `components/Dashboard.tsx` | Dashboard bento grid (rebranded to voice-risk content) |
| `components/LiveMonitoring.tsx` | Live call monitor (call header, threat banner, risk meter, waveform, metric cards) |
| `components/FraudMonitoring.tsx` | Flagged-calls review table (transactions → calls, approve/block → verify/dismiss) |
| `components/Profile.tsx` | Profile page (identity, security, preferences, account actions, delete modal) |
| `components/Settings.tsx` | Settings page with tabs (General, Notifications, Security, Integrations, API Keys, Advanced) |
| `components/TopNav.tsx` | Not copied as a top nav — its elements (search, bell, avatar, status pill) merge into the subhankar-style `Navbar` |
| `components/viz/*` | `Candles`, `MeshSurface`, `Sonar`, `StreamFeed` — animated SVG visualizations |
| `src/index.css` | Design tokens (colors, fonts, keyframes) → `app/globals.css` |

### 2.2 Layout structure taken from `subhankar/`

| subhankar element | Adaptation in temp_proj |
|---|---|
| `App.jsx` shell (sidebar + navbar + page area) | `app/(protected)/layout.tsx` |
| `components/Sidebar.jsx` | `components/Sidebar.tsx` — fixed left rail, logo, grouped nav, logout + system-status footer |
| `components/Navbar.jsx` | `components/Navbar.tsx` — top bar: menu toggle, search, date, bell, avatar (soumya tokens) |
| Pages (Dashboard, Live Analysis, Reports, Alerts, Profile, Settings) | Mapped to VoxVerity routes — see §4 |

### 2.3 Product context taken from `project_info.md` + `apps/web/`

- Route inventory (section 16 of `project_info.md`) — the exact route list `apps/web` already ships.
- Domain types (section 19): `RiskLevel`, `SessionState`, `CaptureState`, `SourceType`,
  `SyntheticLabel`, `VerificationDecision`, `IncidentStatus`.
- `apps/web/app/(protected)/layout.tsx` — the nav grouping (Main / Security Operations /
  Intelligence / Configuration / Admin) is preserved in the new sidebar so migration is a drop-in.
- Real backend flows (Supabase + AI service) are **not** wired in temp_proj; the data layer is
  shaped like the backend response shapes so the swap is mechanical.

---

## 3. Technology Decisions (recorded)

| # | Decision | Rationale |
|---|---|---|
| D1 | `temp_proj` uses **Next.js 16.3.4 + React 19 + TypeScript + npm** | Matches `apps/web` and the project baseline (`project_info.md` §5.1). |
| D2 | **Tailwind CSS v4** is adopted for the merged frontend | Both reference projects (`soumya`, `subhankar`) are Tailwind v4. The project's "no Tailwind" default (AGENTS.md) is superseded by this explicit user decision. When merged, `apps/web` will add Tailwind v4 alongside/over its current CSS-variable system. |
| D3 | Design tokens come from `soumya/src/index.css` (`@theme` colors, Inter / Micro 5 / Fira Code fonts, keyframes) | This is the confirmed visual language the user wants. |
| D4 | Branding = **VoxVerity** (voice integrity). soumya's AEGISAI/banking-security copy is rewritten to voice-integrity content; component *structure and styles* stay identical. | The product idea is VoxVerity (`project_info.md`). |
| D5 | **Central demo-data layer** `lib/demo-data.ts` — all seed data lives here, typed, clearly marked as placeholder, consumed by pages via props. No fake data hard-coded inside components. | Satisfies "no hard-coded fake data"; the module is replaced by Supabase/AI-service queries at migration (Phase 10). |
| D6 | No auth gating in temp_proj (routes render the styled shell); "Sign in"/"Launch" flows navigate client-side. | `temp_proj` verifies style. Real auth/middleware is already implemented in `apps/web` and stays there. |
| D7 | No ESLint config in temp_proj (lean scaffold). Type check via `tsc --noEmit`, build via `next build`. | ESLint config is inherited from `apps/web` at migration. |
| D8 | `subhankar`'s `GaugeChart`/`AudioWaveform` are **not** copied — `soumya`'s `RiskMeter`/`Waveform` are superior equivalents and the user asked for soumya components. | Avoid duplicate widgets. |

---

## 4. temp_proj Route Map

Public (no shell):

| Route | Source |
|---|---|
| `/` | `soumya Landing` rebranded (own header/footer) |
| `/help` | Simple styled page (primitives) |
| `/status` | Simple styled page (primitives) |

Auth (soumya `Auth` component):

| Route | Source |
|---|---|
| `/login` | `Auth` mode=signin |
| `/register` | `Auth` mode=signup |
| `/forgot-password` | Styled form (forms primitives) |
| `/reset-password` | Styled form (forms primitives) |

Protected (subhankar shell: Sidebar + Navbar):

| Route | Source |
|---|---|
| `/dashboard` | `soumya Dashboard` rebranded |
| `/live` | `soumya LiveMonitoring` |
| `/calls` | `soumya FraudMonitoring` → flagged calls review |
| `/calls/[callId]` | Call detail (primitives + data) |
| `/analysis` | Analysis lab list (primitives + data) |
| `/analysis/[analysisId]` | Analysis result detail |
| `/alerts` | Alert list (soumya style cards + data) |
| `/alerts/[alertId]` | Alert detail |
| `/incidents` | Incident table |
| `/incidents/[incidentId]` | Incident detail |
| `/verification` | Verification workflow queue |
| `/threat-intelligence` | Threat campaigns (Sonar viz reuse) |
| `/analytics` | Analytics (Candles + tables) |
| `/blockchain` | Evidence registry (hash verification) |
| `/audit` | Audit trail table |
| `/integrations` | Integration cards |
| `/models` | Model registry table |
| `/settings` | `soumya Settings` |
| `/settings/profile` · `/settings/security` · `/settings/notifications` · `/settings/privacy` · `/settings/risk` | Styled settings sub-pages |
| `/lab` · `/lab/audio` · `/lab/live` | Analysis Lab |
| `/admin` · `/admin/users` · `/admin/organizations` · `/admin/roles` · `/admin/models` · `/admin/system` | Admin pages |
| `(protected)/loading.tsx` | `soumya Loading` |

This covers the full `project_info.md` §16 inventory so the sidebar has no dead links and direct
URL entry never 404s.

---

## 5. Data Layer Contract

`lib/demo-data.ts` exports:

- Domain types (§19 of project_info): `RiskLevel`, `SessionState`, `CaptureState`, `SourceType`,
  `SyntheticLabel`, `VerificationDecision`, `IncidentStatus`.
- Demo entities shaped like backend responses: `calls[]`, `alerts[]`, `incidents[]`,
  `verificationRequests[]`, `evidenceRecords[]`, `auditEvents[]`, `models[]`,
  `threatCampaigns[]`, `integrations[]`, `orgUsers[]`, `riskPolicies`, `analytics`,
  `riskTrend` (weekly risk series), `dspMetrics`, `liveSession` (current live-call context).

Every export is labeled **DEMO / placeholder** with a banner comment. Pages receive data through
props from this module. At migration (Phase 10) each export maps to a Supabase query or AI-service
call in `apps/web/lib/*`, with **zero component changes**.

---

## 6. Phase Checklist

### Phase 1 — Plan & decisions
- [x] `FRONTEND_MERGE_PLAN.md` created at project root (this file)
- [x] Technology decisions recorded (§3)
- [x] Source inventory captured (§2) and route map defined (§4)

### Phase 2 — Scaffold `temp_proj`
- [x] `package.json` (Next 16.3.4, React 19.2.8, Tailwind v4, lucide-react, TypeScript)
- [x] `tsconfig.json` (path alias `@/*`), `next.config.ts`, `postcss.config.mjs`
- [x] `.gitignore`, `README.md`
- [x] `app/globals.css` — Tailwind import + soumya `@theme` tokens, fonts, keyframes
- [x] `app/layout.tsx` — root layout + metadata (VoxVerity)

### Phase 3 — Shared design system (copied from soumya)
- [x] `components/primitives.tsx` (Card, Tag, InfoHint, TickMeter, riskColor)
- [x] `components/forms.tsx` (Field, Input, Select, Toggle, Checkbox, Btn)
- [x] `components/RiskMeter.tsx`
- [x] `components/Waveform.tsx`
- [x] `components/Loading.tsx`
- [x] `components/viz/Candles.tsx`, `MeshSurface.tsx`, `Sonar.tsx`, `StreamFeed.tsx`

### Phase 4 — Shell (structured like subhankar) + data layer
- [ ] `components/Sidebar.tsx` (fixed rail, grouped nav, logout, system status)
- [ ] `components/Navbar.tsx` (menu toggle, search, date, bell, avatar)
- [ ] `components/PageHeader.tsx` (breadcrumb + title + actions)
- [x] `lib/demo-data.ts` + `lib/format.ts`
- [x] `components/Sidebar.tsx` (fixed rail, grouped nav, logout, system status)
- [x] `components/Navbar.tsx` + `components/PageHeader.tsx`

### Phase 5 — Public & auth pages
- [x] `/` Landing (soumya Landing → VoxVerity voice-integrity copy)
- [x] `/help`, `/status`
- [x] `/login`, `/register` (soumya Auth)
- [x] `/forgot-password`, `/reset-password`

### Phase 6 — Protected shell + core pages
- [x] `app/(protected)/layout.tsx` (Sidebar + Navbar shell) + `loading.tsx`
- [x] `/dashboard` (soumya Dashboard → voice risk content)
- [x] `/live` (soumya LiveMonitoring)
- [x] `/calls` + `/calls/[callId]` (FraudMonitoring → flagged calls)
- [x] `/alerts` + `/alerts/[alertId]`
- [x] `/profile`
- [x] `/settings` (soumya Settings)
- [x] settings sub-pages (profile/security/notifications/privacy/risk)

### Phase 7 — Secondary protected routes
- [x] `/analysis` + `/analysis/[analysisId]`
- [x] `/incidents` + `/incidents/[incidentId]`
- [x] `/verification`, `/threat-intelligence`, `/analytics`, `/blockchain`, `/audit`
- [x] `/integrations`, `/models`
- [x] `/lab`, `/lab/audio`, `/lab/live`
- [x] `/admin` + `/admin/*` (users, organizations, roles, models, system)

### Phase 8 — Verification
- [ ] `npm install` succeeds
- [ ] `npx tsc --noEmit` passes (zero type errors)
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts; smoke-test every route in the sidebar
- [ ] Dynamic routes (`/calls/[callId]`, `/alerts/[alertId]`, …) render with demo ids
- [ ] No imports from `soumya/` or `subhankar/` (fully independent)
- [ ] Working tree clean; plan checkboxes updated

### Phase 9 — User style review (STOP after this)
- [ ] User runs `temp_proj` and confirms the merged style
- [ ] Any visual adjustments requested are made in temp_proj and re-verified

### Phase 10 — Migration into `apps/web` (NOT executed now — future)
- [ ] Copy `temp_proj/app/*` route files into `apps/web/app/*` (same route names)
- [ ] Copy `components/*` + `lib/demo-data.ts` → `apps/web/`
- [ ] Add Tailwind v4 + tokens to `apps/web` (decision D2)
- [ ] Replace `lib/demo-data.ts` exports with Supabase queries / AI-service calls
  (`apps/web/lib/supabase/*`, `apps/web/lib/ai-service.ts`)
- [ ] Reintroduce auth middleware + Supabase session handling (keep existing `apps/web` auth)
- [ ] Run `apps/web` typecheck, lint, build; fix regressions
- [ ] Update `docs/build-status.md`; commit with conventional message
- [ ] Cleanup: `temp_proj/` may be deleted after successful migration (ask user first)

---

## 7. Known Limitations (temp_proj)

1. Demo data is illustrative of backend response shapes, not live data.
2. No real authentication — protected routes render without login (by design, D6).
3. Mic/WebRTC capture is not wired; `/live` uses the animated waveform visualization.
4. OAuth/Google button in `Auth` is a styled placeholder (real provider flows live in `apps/web`).
5. Landing marketing copy is rewritten for VoxVerity but still needs product/legal review.

---

## 8. References

- `project_info.md` — SRS, route inventory (§16), domain types (§19), tech baseline (§5)
- `soumya/src/components/*` + `soumya/src/index.css` — component & token source
- `subhankar/src/App.jsx` + `subhankar/src/components/*` — layout shell source
- `apps/web/app/(protected)/layout.tsx` — nav grouping target for migration
- `AGENTS.md` — constitution (phase discipline, no-go tech, privacy/security rules)