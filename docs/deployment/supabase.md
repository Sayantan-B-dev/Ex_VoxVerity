# Deploying Supabase (free)

Supabase provides Postgres, Auth (for NextAuth we use a custom credentials
flow backed by `app_users` — Supabase only hosts the DB here), Storage, and
Realtime. The app talks to it from Vercel via the **anon key** with **Row
Level Security** enforced on every table.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) (GitHub login works).
2. **New project** → name it (e.g. `voxverity`), choose a strong DB password
   (save it), pick a region close to your Vercel deployment (e.g. `us-east-1`
   if Vercel is `iad1`, or Frankfurt/Singapore to match).
3. Wait ~1–2 minutes for provisioning.

> Free tier: **2 projects**, 500 MB database, 50 MB file storage, always-on
> Realtime. That is plenty for this app (we never store raw audio).

## 2. Run the migrations

The schema lives in `supabase/migrations/`. Apply them in order. You can use
either the SQL editor or the CLI:

**Option A — SQL Editor (easiest):**

1. Dashboard → **SQL Editor**.
2. Paste `supabase/migrations/full_schema.sql` → **Run**.
3. Then paste `004_realtime_publications.sql`, `005_fix_grants.sql`,
   `006_add_call_invites.sql`, `007_add_room_code.sql` — run each in turn.

**Option B — Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # dashboard URL has it
npx supabase db push
```

> `reset.sql` **wipes the database** — never run it on a deployed project.

## 3. Verify RLS is ON

Every table the app exposes (`calls`, `alerts`, `incidents`, `analysis_results`,
`profiles`, `app_users`, `call_invites`, `evidence_records`, `presence`, …)
must have **Row Level Security enabled** (Dashboard → Table Editor → each table
→ toggle RLS) with policies that scope rows to the caller's organization.
Never disable RLS "to make it work" — the anon key is public and RLS is the
only thing protecting the data.

## 4. Copy the keys

Project Settings → **API**:

| Key | Where it goes |
|---|---|
| Project URL (`https://<ref>.supabase.co`) | Vercel `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` public key | Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> Use the **anon** key, never the `service_role` key. The service key is only
> for server-side tools and must never be set as a public env var.

## 5. Realtime

Realtime is enabled via `004_realtime_publications.sql` (publications on the
tables the dashboard listens to: `alerts`, `calls`, `analysis_results`).

- Dashboard → Database → **Replication**: confirm the tables are in the
  publication.
- The browser subscribes with the anon key over WSS — Supabase hosts the
  realtime gateway, so Vercel needs nothing special.

## 6. Auth notes

The app uses NextAuth with a custom credentials provider backed by the
`app_users` table (password hash in `password_hash`). Supabase Auth itself is
not used for login — only the Postgres instance. Keep the `anon` key public
and rely on RLS + the Next.js server for anything privileged.

## Post-deploy sanity checks

```bash
# From the AI service / anywhere with network:
curl "https://<ref>.supabase.co/rest/v1/calls?select=id&limit=1" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"      # expect 200 or an RLS-limited empty set, NOT 401/403
```

- Register a user in the deployed app → check a row lands in `app_users`.
- Create a room → check `calls` gets a row and the code is returned.