# Auth Settings to Apply in Supabase Dashboard

Dashboard path: `Authentication -> URL Configuration` and `Authentication -> Providers/Email`.

## Recommended V1 values
- **Confirm email**: Enabled (production), optional during local dev.
- **Site URL**:
  - Local: `http://localhost:3000`
  - Production: your Vercel app URL.
- **Redirect URLs** (allowlist):
  - `http://localhost:3000/**`
  - `https://<your-vercel-domain>/**`
- **Password recovery redirect**:
  - `http://localhost:3000/reset` (local)
  - `https://<your-vercel-domain>/reset` (prod)
- **JWT expiry / session TTL**:
  - Start with 1 day; shorten for stricter security.

## Verification checklist
1. Register new user.
2. Verify email link lands on allowed URL.
3. Login works.
4. Forgot-password email arrives and reset flow completes.
5. Session persists and refreshes without random logouts.

