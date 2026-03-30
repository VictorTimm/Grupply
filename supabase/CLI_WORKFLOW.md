# Supabase CLI Workflow (Recommended)

This project can be managed from Dashboard only, but CLI keeps schema changes reproducible.

## Install CLI
- `npm i -D supabase`

## Useful Commands (from repository root)
- Link project:
  - `npx supabase link --project-ref <your-project-ref>`
- Pull remote schema into migration:
  - `npx supabase db pull`
- Create new migration:
  - `npx supabase migration new <name>`
- Apply local migrations to remote:
  - `npx supabase db push`
- Run seed against local (if using local stack):
  - `npx supabase db reset`

## Team Rules
- Every DB change must be a migration file in `supabase/migrations/`.
- Never patch production schema manually without committing equivalent migration.
- Keep RLS policy changes in dedicated migration files when possible.

