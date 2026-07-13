# Production Auth Checklist

Target Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

Production URL: `https://app.gugumo.jp`.

Production Auth Gate status: Password Reset Production E2E and Invite onboarding rehearsal passed on 2026-07-13.

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
| Site URL | `https://app.gugumo.jp` |
| Redirect URLs | `https://app.gugumo.jp`, `https://app.gugumo.jp/?reset-password=1`, `http://localhost:3000`, `http://localhost:3000/?reset-password=1` |
| Password Reset redirect | `/?reset-password=1` on the same origin |
| Invite redirect | production URL unless a reviewed invite-specific URL is configured |

The code calls password reset with `${window.location.origin}/?reset-password=1`. Dashboard redirect allow-list must include both production and localhost callback URLs.

## Email Settings

- Custom SMTP is configured through Resend.
- Resend domain `gugumo.jp` is verified.
- Sender name: `GUGUMO`.
- SMTP host: `smtp.resend.com`.
- SMTP port: `587`.
- SMTP username: `resend`.
- Do not store the SMTP secret, API key, anon key, JWT, or token values in the repository or docs.
- Confirm email policy matches beta operation.
- Allow new users setting matches manual invite policy.
- Password reset email template points users back to the configured redirect URL.
- Invite email template explains password setup without exposing internal project details.
- Token/session expiry values are acceptable for customer support flow.

## Production Connection Guard

- Vercel Production must use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the same formal Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.
- On 2026-07-13, a password reset preflight failure was traced to Vercel Production pointing at an old, incorrect Supabase project. Do not record that old project ref in docs.
- Do not change only `NEXT_PUBLIC_SUPABASE_URL` or only `NEXT_PUBLIC_SUPABASE_ANON_KEY`; always treat the URL and anon key as a matched pair.
- After any Vercel environment variable change, redeploy Production before testing.
- Safe manual check: confirm the Supabase URL hostname contains the formal project ref, and confirm the anon key was copied from the same Supabase Dashboard project without pasting the key into docs or logs.
- Service Role keys are never required for the app runtime, Vercel env vars, Auth E2E, or customer onboarding.

## E2E Checks

Role/Tenant Manual E2E passed separately on 2026-07-12 using one dedicated test Auth user. This checklist still covers production Auth settings and customer invitation/password behavior.

Permanent DELETE Gate E2E also passed after DELETE authorization application. Owner/admin excluded own-tenant DELETE succeeded; active rows, member, viewer, cross-tenant, and anonymous DELETE remained denied; dedicated test data cleanup completed; and the DELETE Gate test Auth user was manually deleted.

Production Password Reset E2E passed on 2026-07-13:

1. `/auth/v1/recover` preflight returned 200.
2. `/auth/v1/recover` request returned 200.
3. Password reset email was received.
4. Email link opened `https://app.gugumo.jp/?reset-password=1`.
5. New password screen displayed.
6. Password update succeeded.
7. Home displayed after update.
8. Company, workspace, owner role, and existing analysis data displayed.

Remaining manual checks:

- Expired or reused reset link shows a safe failure and allows returning to login.
- Wrong email does not reveal whether an account exists.
- Logout before opening reset callback does not expose tenant data.
- Invite email template localization.
- Invite deliverability check after template change.

Production Invite user rehearsal passed on 2026-07-13:

1. Signup OFF plus Dashboard Send invitation succeeded.
2. Invite email was received.
3. Invite link opened the Production app.
4. Missing profile state stopped safely without tenant fallback. Current customer-facing copy for this pending state is `GUGUMOアカウントを準備しています`.
5. After profile creation, login and tenant bootstrap succeeded.
6. CSV upload lifecycle smoke passed in the rehearsal tenant.

For real customer onboarding, create company/workspace before invitation, create the profile as soon as the Auth user UUID is available, verify relationships, then tell the customer GUGUMO is ready to use. The app does not send an automatic ready notification.

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
- Production URL is not `https://app.gugumo.jp`.
- Redirect allow-list misses production or localhost reset URLs.
- Email provider is not configured.
- Invite or reset template points to the wrong project or old environment.
- Vercel Production Supabase URL and anon key are not from the same formal Supabase project.
- Reset callback logs raw auth errors to customer-facing UI.
- Raw access or refresh tokens appear in browser/server logs or Server Action diagnostics.

## Remaining Dashboard TODO

- Confirm Dashboard Create user behavior only as a fallback path.
- Localize Invite email template.
- Check Invite email deliverability after localization.
- Align Invite email wording with the pending provisioning screen and manual ready-to-use contact.
- Make final CAPTCHA decision.

## Password Reset Email Template Draft

Subject:

GUGUMOのパスワード再設定

Body:

GUGUMOのパスワード再設定を受け付けました。以下のボタンから新しいパスワードを設定してください。

CTA:

パスワードを再設定する

Link:

Keep the Supabase reset-link variable unchanged in the template. Do not replace it with a fixed URL.

Security note:

このメールに心当たりがない場合は、操作せずにこのメールを破棄してください。GUGUMOがお客様のパスワードをお聞きすることはありません。
