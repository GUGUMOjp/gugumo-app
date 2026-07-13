# Production Auth Checklist

Target Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

Production URL is not confirmed from the repository. Fill it manually as `要入力`.

## Dashboard Path

1. Open Supabase Dashboard.
2. Select GUGUMOjp's Project.
3. Confirm project ID: `annvqxnupddnozyghqdw`.
4. Open Authentication.
5. Open URL Configuration.
6. Open Providers and Email configuration.
7. Open Email Templates.

## URL Configuration

| Item | Expected |
| --- | --- |
| Site URL | `要入力` production URL |
| Redirect URLs | production URL, production `/?reset-password=1`, `http://localhost:3000`, `http://localhost:3000/?reset-password=1` |
| Password Reset redirect | `/?reset-password=1` on the same origin |
| Invite redirect | production URL unless a reviewed invite-specific URL is configured |

The code calls password reset with `${window.location.origin}/?reset-password=1`. Dashboard redirect allow-list must include both production and localhost callback URLs.

## Email Settings

- Email Provider configured and verified.
- Confirm email policy matches beta operation.
- Allow new users setting matches manual invite policy.
- Password reset email template points users back to the configured redirect URL.
- Invite email template explains password setup without exposing internal project details.
- Token/session expiry values are acceptable for customer support flow.

## E2E Checks

Role/Tenant Manual E2E passed separately on 2026-07-12 using one dedicated test Auth user. This checklist still covers production Auth settings and customer invitation/password behavior.

Permanent DELETE Gate E2E also passed after DELETE authorization application. Owner/admin excluded own-tenant DELETE succeeded; active rows, member, viewer, cross-tenant, and anonymous DELETE remained denied; dedicated test data cleanup completed; and the DELETE Gate test Auth user was manually deleted.

1. Password reset request for existing user sends an email.
2. Reset link opens `/?reset-password=1`.
3. Expired reset link shows a safe failure and allows returning to login.
4. Wrong email does not reveal whether an account exists.
5. Logout before opening reset callback does not expose tenant data.
6. Password update succeeds from a valid recovery session.
7. User can log in again with the new password.
8. Invite link opens the expected production URL.
9. Invited user can set password, log in, and bootstrap tenant context.

## Token Handling Gate

- Server Action arguments must not include Supabase access tokens, refresh tokens, `Authorization` headers, or raw bearer strings.
- Browser code must not manually read the access token for workspace or CSV Server Action calls.
- Server Actions must create a request-scoped Supabase client from the chunked cookie-backed browser session and run repositories with the authenticated user JWT so RLS remains active.
- Service Role, global mutable sessions, and singleton `setSession()` are prohibited for production Auth.
- After any auth transport change, verify workspace bootstrap, upload history, duplicate detection, insert, exclude/activate, logout/login, and all role/tenant expectations again.
- Permanent delete authorization verification record: owner/admin excluded-only DELETE, active-row denial, member/viewer denial, cross-tenant denial, anonymous denial, and absence of deleted rows after reload have passed. Repeat this gate only when DELETE policy, GRANT, upload lifecycle code, or tenant authorization changes.
- Inspect browser and server logs during that regression and confirm that no raw access token, refresh token, Authorization header, email address, or filled test UUID is emitted.

## Stop Conditions

- Dashboard project is not `annvqxnupddnozyghqdw`.
- Production URL is unknown.
- Redirect allow-list misses production or localhost reset URLs.
- Email provider is not configured.
- Invite or reset template points to the wrong project or old environment.
- Reset callback logs raw auth errors to customer-facing UI.
- Raw access or refresh tokens appear in browser/server logs or Server Action diagnostics.
