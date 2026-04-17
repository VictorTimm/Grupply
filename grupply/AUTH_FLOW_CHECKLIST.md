# Auth Flow Setup and Test Guide (Step-by-Step)

This is a beginner-friendly checklist for setting up and testing login/register/reset in Grupply.

Do this guide in order from top to bottom.

---

## 0) Before you start

1. Start your app locally.
   - In terminal, run from `grupply/`: `npm run dev`
   - Confirm app opens at `http://localhost:3000`
2. Confirm your `.env.local` has working Supabase keys.
3. Log in to your Supabase project dashboard in browser.

If any of these fail, stop and fix first.

---

## 1) Configure Supabase Auth URLs (click-by-click)

### A. Open URL settings

1. In Supabase left sidebar, click `Authentication`.
2. Click `URL Configuration` (sometimes under Authentication settings).

### B. Set Site URL

1. Find `Site URL`.
2. For local testing, enter:
   - `http://localhost:3000`
3. Click `Save`.

For production later, replace with your real deployed app URL.

### C. Add Redirect URLs

1. In `Redirect URLs`, click `Add URL`.
2. Add local callback URL:
   - `http://localhost:3000/auth/callback`
3. Click `Save`.

For production later, add:
- `https://<your-production-domain>/auth/callback`

Important: if `/auth/callback` is missing, verification/reset links will fail.

---

## 2) Check Supabase email template behavior

You usually do not need to customize templates to make this work.

1. In Supabase sidebar, go to `Authentication` -> `Email Templates`.
2. Open:
   - `Confirm signup`
   - `Reset password`
3. Ensure templates are not hardcoding raw Supabase auth links.
4. Keep default template variables/flow so app-provided redirect URLs are honored.

Rule: do not paste custom URLs that bypass your app callback.

---

## 3) Decide how you want to test signup

You have two modes:

- **Email confirmation ON**: user signs up -> sees `/verify` -> confirms via email -> returns to login success.
- **Email confirmation OFF**: user signs up -> goes directly to `/dashboard`.

If you want to test full verify flow, turn confirmation ON in:
- `Authentication` -> `Providers` -> `Email` (name may vary slightly).

---

## 4) Test flow #1: Create new company signup

1. In browser, open `http://localhost:3000/register?flow=new`
2. Fill:
   - Organization name
   - First name
   - Last name
   - Email (new email not used before)
   - Password
3. Click `Create account`.

Expected results:

- If email confirmation ON: you land on `/verify`.
- If email confirmation OFF: you land on `/dashboard`.

Then:

1. Open `Settings`.
2. Confirm you can see an `Invite code`.
3. Confirm this account is organization owner/admin-level for invite management.

---

## 5) Test flow #2: Join with invite code

1. Copy invite code from `Settings` (owner account).
2. Open private/incognito window (important so old session does not interfere).
3. Go to `http://localhost:3000/register`
4. Fill:
   - Invite code
   - First name
   - Last name
   - New email
   - Password
5. Submit.

Expected:

- User account is created and linked to same organization as owner.
- If confirmation ON, user first goes through `/verify`.

Quick tenant check:

1. Log in as second user.
2. Go to `Settings`.
3. Compare organization ID with owner account; they should match.

---

## 6) Test flow #3: Email verification

Use a fresh email that is not verified yet.

1. Register a new account.
2. Confirm app shows `/verify`.
3. Open inbox for that email.
4. Click Supabase verification email link.

Expected:

- Link hits app callback route.
- You are redirected to `/login?verified=1`.
- Login page shows success message like “Your email is verified.”

If this fails:

- Re-check `Site URL` and `Redirect URLs`.
- Confirm `/auth/callback` is exactly allowed in Supabase.

---

## 7) Test flow #4: Forgot password + set new password

1. Open `http://localhost:3000/reset`
2. Enter an existing account email.
3. Click `Send reset link`.

Expected:

- Page shows success state (`?sent=1` behavior).

Next:

1. Open reset email inbox.
2. Click reset link.
3. Link should go through `/auth/callback` and then to `/reset/confirm`.
4. Enter new password + confirm.
5. Submit.

Expected:

- Redirect to `/login?reset=success`.
- Login page shows success message.
- You can log in with the new password.

---

## 8) Test failure cases (must pass)

### A. Invalid invite code

1. Open `/register`.
2. Enter fake invite code.
3. Submit.

Expected:

- Clear error shown.
- No profile/member should be created for wrong org.

### B. Expired or reused reset/verify link

1. Reopen an old link after already used or expired.

Expected:

- Redirect to `/login?error=...`
- App should not crash.

### C. Open `/reset/confirm` directly with no reset session

Expected:

- Redirect to login with explanatory error.

---

## 9) Production checklist (when deploying)

When moving to production, repeat URL settings:

1. Set `Site URL` to your production app URL.
2. Add production redirect URL:
   - `https://<your-production-domain>/auth/callback`
3. Keep local URLs too if you still test locally.
4. Re-run the same 4 flows in production environment.

---

## 10) Quick pass/fail summary table

- Create-company signup works: pass/fail
- Invite-code signup works: pass/fail
- Email verification returns to login success: pass/fail
- Reset flow reaches `/reset/confirm` and updates password: pass/fail
- Invalid/expired links fail safely: pass/fail

If any item fails, fix that item before launch.
