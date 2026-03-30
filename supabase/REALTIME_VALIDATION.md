# Realtime Validation (Notifications + Messages)

## Prerequisites
- Migration `0005_guardrails_and_realtime.sql` applied.
- App running in two browser sessions (User A and User B).

## Validate notifications stream
1. Login as User A in browser window 1.
2. Insert a notification row for User A (SQL editor).
3. Confirm User A dashboard receives realtime update.
4. Insert notification for User C (different org).
5. Confirm User A does **not** receive User C notification.

## Validate messages stream
1. Start/get direct conversation between User A and User B.
2. Send message from User A.
3. Confirm User B receives realtime update in thread.
4. Login as User C (not a participant) in another session.
5. Confirm User C cannot read/subscribe to that conversation's messages.

## SQL check
Run `verification/02_realtime_checks.sql` and confirm both tables appear.

