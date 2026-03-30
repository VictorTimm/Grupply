# Supabase Finalization Checklist (Grupply)

Use this checklist after running migrations.

## 1) SQL/Migrations
- Run migrations in order:
  - `migrations/0001_init.sql`
  - `migrations/0002_rls.sql`
  - `migrations/0003_rpc.sql`
  - `migrations/0004_gdpr.sql`
  - `migrations/0005_guardrails_and_realtime.sql`
- Run seed:
  - `seed.sql`

## 2) RLS Matrix Verification
- Run `verification/01_rls_matrix.sql` in SQL Editor.
- Replace placeholder UUIDs first.
- Confirm:
  - Cross-org reads are blocked.
  - Users only update themselves.
  - Notifications are per-user.
  - Messages are participant-only.

## 3) Realtime Verification
- Run `verification/02_realtime_checks.sql`.
- Ensure publication includes:
  - `public.notifications`
  - `public.messages`

## 4) Auth Settings (Dashboard -> Authentication)
- Enable email confirmations (recommended in prod).
- Add redirect URLs:
  - local: `http://localhost:3000`
  - prod: your Vercel URL
- Confirm reset-password email flow works.
- Set session TTL appropriate for your risk profile.

## 5) Backups / PITR
- Dashboard -> Project Settings -> Backups
- Confirm backups enabled (and PITR if plan supports it).

## 6) Secrets
- Keep anon key in app env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Never expose service-role key in browser/client code.

