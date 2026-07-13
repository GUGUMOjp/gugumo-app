# Customer Onboarding

Target Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

## Flow

1. Contract or beta approval.
2. Confirm initial fee/monthly terms outside the app.
3. Confirm the formal Supabase project ID is `annvqxnupddnozyghqdw`.
4. GUGUMO creates company.
5. GUGUMO creates workspace under that company.
6. GUGUMO invites the owner user from Supabase Dashboard. Use `Create user` only as a reviewed fallback.
7. GUGUMO confirms the Auth user UUID after the invitation is created.
8. GUGUMO creates profile linking `profiles.id` to the Auth user UUID before the customer starts using the app whenever possible.
9. GUGUMO sets `company_id`, `workspace_id`, and `role`.
10. GUGUMO verifies company/workspace/profile consistency.
11. GUGUMO tells the customer that GUGUMO is ready to use.
12. Customer sets password from invite email or reviewed Password Reset fallback.
13. Customer logs in.
14. GUGUMO confirms Home bootstrap shows the expected company/workspace/role.
15. Customer uploads SUUMO CSV.
16. Customer reviews first dashboard.
17. Customer logs out and logs in again.
18. GUGUMO runs anonymous REST regression.
19. Customer starts recurring upload operation.

## Manual Beta Operations

- Company creation.
- Workspace creation.
- Auth invitation.
- Email confirmation status check.
- Profile linking.
- Role changes.
- Data deletion requests.
- Anonymous REST regression.
- Role/tenant E2E before external beta using one dedicated test Auth user and profile role switching.
- Role/Tenant Manual E2E passed on 2026-07-12. Re-run it before beta only if RLS policies, grants, tenant bootstrap, upload actions, or role handling change.
- Password Reset Production E2E passed on 2026-07-13 for `https://app.gugumo.jp` after Vercel Production was confirmed to use the formal Supabase project.
- Before customer onboarding, confirm Vercel Production `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are copied from the same formal Supabase project. Do not store env values in docs.
- Customer Onboarding Rehearsal passed on 2026-07-13 using [Customer Onboarding Rehearsal](./onboarding-rehearsal.md).
- Technical beta readiness still depends on careful first-customer operation. Legal / Support final acceptance is complete for limited Technical Beta, while paid/broad beta still requires formal legal review. Server Action arguments must remain free of raw bearer tokens.
- Invite user is the primary beta flow. `Create user` remains an unrehearsed fallback.
- If a customer opens the invite before profile linking is complete, the app shows `GUGUMOアカウントを準備しています` and does not show another tenant.

## Customer Tasks

- Accept invite.
- Set password.
- Upload SUUMO CSV.
- Wait for GUGUMO's ready-to-use contact if the app says `GUGUMOアカウントを準備しています`.
- Retry only failed CSV files when multi-file upload partially succeeds.
- Choose whether to cancel or continue when the app reports an exact duplicate CSV checksum.
- Reload the screen if CSV save succeeded but upload history refresh failed.

## Invite Email Status

- Production Invite user flow passed with Signup OFF.
- Invite user template localization and Supabase Dashboard save are complete.
- Post-localization Japanese Invite delivery, subject/body receipt, HTML rendering, link transition, inbox/spam placement, and deliverability are not yet verified.
- Previous English-template Invite delivery/link E2E passed during the 2026-07-13 rehearsal.
- During that rehearsal, one first Gmail delivery landed in spam; after marking it not spam, the rehearsal continued.
- Run one Japanese Invite delivery/link/spam check before the first real customer invite.
- Monitor invite/reset delivery during early beta operation.

## Do Not Promise Yet

- Self-registration.
- Customer-side user management.
- Automatic SUUMO CSV acquisition.
- CSV conversion/generation.
- Paid/broad beta legal finalization before expanding beyond the limited manually supported Technical Beta.
- Support for quoted newline fields inside CSV cells without prior parser review.

## Stop Conditions

- Wrong Supabase project.
- Auth user UUID and `profiles.id` mismatch.
- Duplicate profile for the same Auth user.
- User already linked to another tenant.
- Invalid role.
- Company/workspace mismatch.
- RLS or anonymous REST regression failure.
- Customer sees another tenant's company, workspace, or CSV data.
