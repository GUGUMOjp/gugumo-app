# Customer Onboarding

Target Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

## Flow

1. Contract or beta approval.
2. Confirm initial fee/monthly terms outside the app.
3. Confirm the formal Supabase project ID is `annvqxnupddnozyghqdw`.
4. GUGUMO creates company.
5. GUGUMO creates workspace under that company.
6. GUGUMO invites the owner user from Supabase Dashboard. Use `Create user` only as a reviewed fallback.
7. GUGUMO confirms email confirmation or invite status.
8. GUGUMO creates profile linking `profiles.id` to the Auth user UUID.
9. GUGUMO sets `company_id`, `workspace_id`, and `role`.
10. GUGUMO verifies company/workspace/profile consistency.
11. Customer sets password from invite email or reviewed Password Reset fallback.
12. Customer logs in.
13. GUGUMO confirms Home bootstrap shows the expected company/workspace/role.
14. Customer uploads SUUMO CSV.
15. Customer reviews first dashboard.
16. Customer logs out and logs in again.
17. GUGUMO runs anonymous REST regression.
18. Customer starts recurring upload operation.

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
- Use [Customer Onboarding Rehearsal](./onboarding-rehearsal.md) before creating the first real customer tenant.
- Technical beta readiness still depends on legal/support and onboarding rehearsal. Server Action arguments must remain free of raw bearer tokens.

## Customer Tasks

- Accept invite.
- Set password.
- Upload SUUMO CSV.
- Contact support if account setup incomplete appears.
- Retry only failed CSV files when multi-file upload partially succeeds.
- Choose whether to cancel or continue when the app reports an exact duplicate CSV checksum.
- Reload the screen if CSV save succeeded but upload history refresh failed.

## Do Not Promise Yet

- Self-registration.
- Customer-side user management.
- Automatic SUUMO CSV acquisition.
- CSV conversion/generation.
- Legal text finalization before the external paid beta approval is complete.
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
