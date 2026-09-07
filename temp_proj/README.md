# VoxVerity Frontend (temp_proj)

Standalone **Next.js 16** frontend that merges the two UI reference projects:

- **Components**: copied from `../soumya/` (bento dashboards, risk meter, waveform, auth, profile,
  settings, landing, animated viz primitives) — rebranded AEGISAI → VoxVerity.
- **Layout**: structured like `../subhankar/` (fixed sidebar + top navbar + page area).

> ⚠️ This project is a **style-verification harness**. It runs fully standalone with no backend.
> All data lives in `lib/demo-data.ts` (typed placeholder data shaped like the real backend
> contract) — see `../FRONTEND_MERGE_PLAN.md` for the full migration plan into `apps/web`.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

## Verify

```bash
npm run typecheck  # tsc --noEmit
npm run build      # next build
```

## Structure

```
app/
  page.tsx                      # Landing (public)
  (public)/help, (public)/status
  (auth)/login, register, forgot-password, reset-password
  (protected)/layout.tsx        # Sidebar + Navbar shell
  (protected)/...               # all protected routes (dashboard, live, calls, alerts, …)
components/                     # primitives, forms, RiskMeter, Waveform, Loading, viz/*,
                                # Sidebar, Navbar, PageHeader, Landing, Auth
lib/
  demo-data.ts                  # typed placeholder data (replaced by backend at migration)
  format.ts                     # duration / time-ago / risk-band helpers
```