# Customer Onboarding Rehearsal

Status: CURRENT runbook and 2026-07-13 Production rehearsal record.

Purpose: rehearse one new customer onboarding on Production before creating a real customer tenant.

Target Production URL: `https://app.gugumo.jp`

Target Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

Do not use the old or forbidden project `ivtaxvuysqqnzpnwndqt`.

Do not store real customer emails, passwords, Auth user UUIDs, JWTs, API keys, SMTP secrets, or filled SQL values in the repository.

## Current Auth Baseline

- Production Password Reset E2E passed on 2026-07-13.
- Vercel Production is connected to the formal Supabase project.
- Resend Custom SMTP is active.
- Reset Password email is localized.
- Password minimum length is 8.
- Allow new users to sign up is OFF.
- Anonymous sign-in is OFF.
- Google OAuth is not used.
- Email/password auth is the only beta auth method.

## 2026-07-13 Production Rehearsal Result

Result: PASS.

Executed against GUGUMOjp's Project / `annvqxnupddnozyghqdw` and `https://app.gugumo.jp`.

Logical test data used:

- Company: `Onboarding Rehearsal Company`
- Workspace: `Onboarding Rehearsal Workspace`
- Role: `owner`

Do not record the filled email address, Auth user UUID, row UUIDs, password, invite token, JWT, or other secrets in this repository.

Observed:

- Signup OFF plus Supabase Dashboard `Send invitation` worked.
- Invite email was sent and received.
- Invite link opened the Production app.
- Before profile creation, the app showed account setup incomplete and did not show another tenant.
- After profile creation, login succeeded and Home showed the rehearsal company, rehearsal workspace, and owner role.
- Existing Demo tenant CSV history was not visible to the rehearsal tenant.
- SUUMO CSV upload, save, Home analysis reflection, exclude, restore, duplicate warning, and duplicate cancel all passed.
- Tenant UI isolation was re-confirmed.

Cleanup:

- Rehearsal `csv_uploads`, `profiles`, `workspaces`, `companies`, and Auth user were manually removed in that order.
- Existing Demo Company, Demo Workspace, existing owner profile, and existing formal CSV data were not changed.
- This is a human Dashboard cleanup record; the repository did not query the DB to re-confirm it.

Invite email follow-up:

- Functional result: PASS.
- Template quality: default English template remains.
- Deliverability: one first Gmail delivery landed in spam. Do not treat this single event as proof of permanent SMTP failure.
- Reset Password email via the same Custom SMTP path was received successfully.
- SPF/DKIM/DMARC and mailbox reputation require external DNS/email-provider confirmation; the repository cannot verify them.

## Adopted Method

Use Supabase Dashboard `Invite user` as the primary beta onboarding method.

Reason:

- Signup OFF blocks public self-registration, but admin-issued invitations remain the intended manual operation.
- The customer sets their own password through the invite/reset email flow, so GUGUMO does not handle temporary passwords.
- The Auth user row is created by Supabase Auth, then `profiles.id` can be linked to that Auth user UUID.
- After the Auth user UUID is visible, the operator should create the profile and verify the tenant relationship before telling the customer that GUGUMO is ready to use.
- If the customer opens the app before the profile is linked, the app shows a customer-facing pending provisioning screen: `GUGUMOアカウントを準備しています`. It must not show another tenant's data.

Fallback:

- Use Dashboard `Create user` only if `Invite user` is unavailable or fails during rehearsal.
- If using `Create user`, do not send or store a password in docs. Prefer forcing the customer through Password Reset after the Auth user and profile are linked.
- `Create user` fallback was not rehearsed in Production and is not the primary beta flow.

## Required Tenant Shape

- One `companies` row for the customer.
- One `workspaces` row under that company.
- One `profiles` row whose `id` exactly equals the Supabase Auth user UUID.
- `profiles.company_id` must equal the company id.
- `profiles.workspace_id` must equal the workspace id.
- `workspaces.company_id` must equal the company id.
- Initial role for the first user is `owner`.

For the initial beta, use a one-company, one-workspace, one-owner starting point. Multiple owners are not blocked by the schema, but the beta operation should keep one owner unless a customer contract explicitly requires otherwise.

## Preflight

1. Open Supabase Dashboard.
2. Select GUGUMOjp's Project.
3. Confirm the project ID is exactly `annvqxnupddnozyghqdw`.
4. Confirm the browser URL and Dashboard header are not the old or forbidden project.
5. Open Authentication settings.
6. Confirm:
   - Email/password provider is enabled.
   - Allow new users to sign up is OFF.
   - Anonymous sign-in is OFF.
   - Password minimum length is 8.
   - Custom SMTP is active through Resend.
7. Open Vercel Production env settings if needed and confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are from the same formal Supabase project. Do not paste values into docs.

STOP if any project, URL, env, or Auth setting does not match the expected Production baseline.

## SQL Editor Boundary

This rehearsal document does not create a new executable write SQL package.

If SQL Editor is used during rehearsal:

- Run read-only checks separately from write operations.
- Read-only checks may inspect row counts, project confirmation text, company/workspace/profile relationships, and Auth user/profile consistency.
- Write operations must be reviewed immediately before use and must use placeholders until pasted into SQL Editor.
- Never save filled SQL with real UUIDs, real emails, passwords, customer names, JWTs, or API keys back to the repository.
- Do not use Service Role.
- Do not run any SQL if the Dashboard project is not GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

Recommended read-only checks before asking the customer to log in:

- Exactly one intended company row.
- Exactly one intended workspace row under that company.
- Exactly one intended Auth user.
- Exactly one profile whose `id` equals the Auth user UUID.
- Profile company/workspace/role match the intended tenant.
- No existing customer tenant row is selected for rehearsal cleanup.

## Manual Order

### 1. Prepare Customer Values Outside the Repository

Prepare the following in a private operator note, not in Git:

- Customer company name.
- Workspace/store name.
- Customer owner email.
- Customer display name.
- Initial role: `owner`.
- Cleanup marker for rehearsal data if this is a test.

PASS:

- Values are reviewed by a human.
- No real values are stored in repository files.

STOP:

- Customer email, UUID, password, or filled SQL appears in any tracked file.

### 2. Create Company

Open Supabase Dashboard > Table Editor > `companies`.

Insert one company row:

- `name`: customer company name.
- `status`: `active` for real onboarding, or `trial` for rehearsal if appropriate.
- `plan`: reviewed beta plan label or blank if not used.

Save and copy the generated company id into the private operator note.

PASS:

- Exactly one intended company row exists.
- Company status is valid.

STOP:

- Duplicate company name or wrong company id.
- You are in the wrong Supabase project.

Rollback:

- If no workspace/profile/csv data was created, delete the company row from the Dashboard only after confirming it is the rehearsal/customer row.
- If child rows exist, clean up in order: `csv_uploads` -> `profiles` -> `workspaces` -> `companies`.

### 3. Create Workspace

Open Supabase Dashboard > Table Editor > `workspaces`.

Insert one workspace row:

- `company_id`: the company id from step 2.
- `name`: customer workspace/store name.
- `status`: `active`.

Save and copy the generated workspace id into the private operator note.

PASS:

- Workspace belongs to the intended company.
- Workspace status is `active`.

STOP:

- Workspace company id does not match.
- Duplicate or wrong workspace row.

Rollback:

- Delete the workspace only after confirming no profile or upload rows depend on it.

### 4. Invite Auth User

Open Supabase Dashboard > Authentication > Users.

Use `Invite user`:

- Enter the customer owner email.
- Confirm the invite email uses the Production URL.
- Send the invite.

After the user appears in Auth users, copy the Auth user UUID into the private operator note.

Operational target:

- Create the profile and complete the integrity verification as soon as the Auth user UUID is available.
- Aim to finish profile setup before the customer opens the invite link.
- Because the invite email is sent immediately, a race condition remains. If the customer opens the app before profile creation, the app should show `GUGUMOアカウントを準備しています` and no tenant data.

PASS:

- Exactly one Auth user exists for the intended email.
- Auth user UUID is available.
- Invite status is visible and no duplicate Auth user was created.

STOP:

- Invite user is unavailable with Signup OFF.
- Email points to the wrong project or wrong URL.
- Duplicate Auth users exist for the same customer email.

Fallback:

- If Invite user is unavailable, use Dashboard `Create user` only after lead review. Then use Password Reset for customer password setup.

Rollback:

- If no profile has been created, delete the unintended Auth user from Supabase Dashboard.
- If a profile exists, delete dependent customer rows first, then delete the Auth user.

### 5. Create Profile

Open Supabase Dashboard > Table Editor > `profiles`.

Insert one profile row:

- `id`: Auth user UUID from step 4.
- `company_id`: company id from step 2.
- `workspace_id`: workspace id from step 3.
- `email`: customer owner email.
- `name`: customer display name.
- `role`: `owner`.

PASS:

- `profiles.id` exactly equals `auth.users.id`.
- `profiles.company_id` and `profiles.workspace_id` match the intended tenant.
- `profiles.role` is `owner`.
- There is no second profile for the same Auth user.

STOP:

- Auth user UUID and profile id differ.
- Company/workspace mismatch.
- Role is not one of `owner`, `admin`, `member`, `viewer`.
- Auth user already has a profile for another tenant.

Rollback:

- Delete the profile before deleting workspace/company/Auth user.

### 6. Integrity Verification

Before telling the customer that GUGUMO is ready to use, verify from Dashboard table views:

- Company row exists and status is valid.
- Workspace row exists and belongs to the company.
- Profile row exists and belongs to both company and workspace.
- Auth user UUID equals `profiles.id`.
- Initial role is `owner`.

PASS:

- All relationships are exactly consistent.

STOP:

- Any missing row, duplicate row, mismatch, invalid role, or wrong project.

After PASS:

- Contact the customer outside the app and tell them that GUGUMO is ready to use.
- Do not promise an automatic ready notification from the app. There is no operator UI, background job, provisioning status table, or automatic email in this beta flow.

### 7. Customer First Login

Ask the customer to open the invite email and set a password, or use Password Reset if the invite flow was not used.

Customer opens `https://app.gugumo.jp`.

PASS:

- Login succeeds.
- Home displays the intended company, workspace, and owner role.
- The pending provisioning screen is not shown.

STOP:

- The pending provisioning screen appears after the operator believed setup was complete.
- Company/workspace/role is wrong.
- Login succeeds but no tenant data appears.
- Any other tenant's data appears.

Rollback:

- Do not upload CSV. Review profile/company/workspace/Auth user relationships first.

### 8. Tenant Isolation Check

Use only safe UI checks unless a reviewed REST/SQL gate is explicitly approved.

PASS:

- Customer sees only their own company/workspace.
- Existing customer data is not visible.
- Anonymous access remains blocked.

STOP:

- Any cross-tenant data is visible.
- Unauthenticated access reaches app data.

### 9. CSV Lifecycle Smoke Check

Use a reviewed SUUMO CSV from the customer or a rehearsal-only SUUMO CSV.

For owner:

- Upload CSV: allowed.
- History appears after save.
- Reload keeps history.
- Exclude/activate: allowed.
- Permanent delete: allowed only for excluded rows.

PASS:

- CSV data belongs to the intended workspace.
- Reload does not show stale or cross-tenant data.

STOP:

- Upload is saved under the wrong tenant.
- Viewer can upload.
- Member/viewer can mutate upload lifecycle.
- Active rows show permanent delete.

## Role Rehearsal

For a real first customer, start with `owner`.

Role expectations:

- `owner`: view, upload, exclude/activate, permanently delete excluded own-tenant CSV.
- `admin`: same upload lifecycle permissions as owner, but not the contractual default first user.
- `member`: view and upload, no exclude/activate, no permanent delete.
- `viewer`: view only, no upload, no mutations.

Initial beta conclusion:

- Use one owner for the first user of each company.
- Add admin/member/viewer only after the owner onboarding path is confirmed.
- Multiple owners are schema-possible but operationally avoid them in the first beta unless explicitly approved.

## Rehearsal Test Account Policy

Prefer a new dedicated rehearsal email controlled by GUGUMO.

Do not reuse an old test user unless Dashboard confirms:

- The Auth user belongs to the formal project.
- The Auth user has no existing profile.
- There are no leftover test company/workspace/csv rows.

Test naming:

- Use a clear rehearsal marker in company/workspace names.
- Never use existing customer tenant names.
- Never use existing owner/admin profiles for rehearsal.

Production DB test data is acceptable only for a short, reviewed rehearsal and must be cleaned up immediately.

Cleanup order:

1. `csv_uploads`
2. `profiles`
3. `workspaces`
4. `companies`
5. Auth user from Supabase Dashboard

Do not delete rows by id alone unless the name, marker, tenant relationship, and row counts are verified.

## Missing Implementation Classification

Technical Beta after onboarding rehearsal:

- No app code is required if the Dashboard manual flow is followed and one-owner onboarding is used.
- A reviewed manual integrity checklist is required.

Recommended during beta:

- Dedicated placeholder SQL template for creating company/workspace/profile with preflight and cleanup.
- Read-only onboarding verification SQL.
- Lightweight audit log or operator checklist for customer tenant creation.

Required before formal launch:

- Admin onboarding UI or secured operator workflow.
- Idempotent tenant creation with duplicate checks.
- Auditable invite/profile linking record.
- Safer cleanup/deactivation workflow.
- Multi-user invite policy and owner/admin management workflow.

Not needed now:

- Public signup.
- Service Role in app runtime.
- Profile auto-create trigger for this manual beta flow.
- Customer-side user management.

## Final STOP Conditions

- Wrong Supabase project.
- Old or forbidden project is open.
- Service Role is requested for the app flow.
- Real credential or UUID is about to be saved into Git.
- Auth user has no matching profile before customer login.
- Profile points to the wrong company or workspace.
- Workspace does not belong to company.
- Role is invalid.
- Customer sees another tenant's data.
- Any SQL or Dashboard write operation is not reviewed for the exact tenant.
