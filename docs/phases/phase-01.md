# Phase 01: Repository Bootstrap and Constitution

## Objective

Create the monorepo, base Next.js app, Git hygiene, and agent engineering files.

## Depends On

None

## Status

In Progress

## Execution Steps

1. ✅ Create repository and initialize Git.
2. ✅ Create Next.js 16 app with TypeScript, App Router, and ESLint.
3. ✅ Create top-level directories for services, blockchain, supabase, packages, and docs.
4. ✅ Create constitution and phase protocol files (AGENTS.md, plan.md, design.md).
5. ⬜ Run Next.js dev server and build.
6. ⬜ Commit.

## Outputs

- Git repository
- Next.js web app scaffold (`apps/web/`)
- Top-level directory structure (`services/`, `blockchain/`, `supabase/`, `packages/`, `docs/`)
- AGENTS.md (agent constitution)
- plan.md (master phase map)
- design.md (UX/product behavior)
- docs/build-status.md
- docs/phases/phase-01.md

## Acceptance Criteria

- [ ] Repository opens
- [ ] `npm run dev` works (in apps/web)
- [ ] `npm run build` succeeds (in apps/web)
- [ ] No Vite project exists
- [ ] AGENTS.md exists at project root
- [ ] plan.md exists at project root
- [ ] design.md exists at project root
- [ ] docs/build-status.md exists
- [ ] Working tree clean after commit

## Manual Verification

- Open the home page in a browser via `npm run dev`
- Confirm AGENTS.md, plan.md, design.md exist at root
- Confirm `apps/web/` contains a working Next.js app
- Confirm no Vite artifacts exist

## Failure Handling

- Missing prerequisite stops phase.
- Any conflicting architecture is documented and not patched blindly.

## Required Git Commit Message

```
chore: bootstrap voxverity project
```

## Notes

- Next.js 16.3.4 was scaffolded with `create-next-app` using TypeScript, App Router, ESLint, no Tailwind, no src directory.
- The auto-generated AGENTS.md in `apps/web/` is the Next.js default; the root-level AGENTS.md is the project constitution.
- Full specification reference: `project_info.md`
