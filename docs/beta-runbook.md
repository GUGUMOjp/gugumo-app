# GUGUMO Beta Runbook

Target Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

Never run beta operations against `ivtaxvuysqqnzpnwndqt`.

## Before Onboarding

1. Confirm signed agreement or beta approval.
2. Confirm the Supabase Dashboard project ID is `annvqxnupddnozyghqdw`.
3. Confirm target company and workspace name.
4. Confirm owner email outside the repository.
5. Confirm the customer understands SUUMO CSV upload is manual.
6. Confirm GUGUMO does not generate CSV and does not recalculate SUUMO-provided values.

## Account Setup

1. Create or verify `companies` row in the formal project.
2. Create or verify `workspaces` row under that company.
3. Send invitation from Supabase Dashboard. Use Create user only as a reviewed fallback.
4. Confirm the Auth user UUID after the invitation is created.
5. Create exactly one `profiles` row whose `id` equals the Auth user UUID as soon as possible.
6. Set `company_id`, `workspace_id`, and `role`.
7. Verify company/workspace/profile consistency with read-only SQL.
8. Tell the customer that GUGUMO is ready to use, then ask them to set a password from the invite email.

If the customer opens the invite before profile creation is complete, the app must show `GUGUMOアカウントを準備しています` and must not show another tenant. Treat this as a normal pending provisioning state, not as a customer-facing error.

Production onboarding rehearsal passed on 2026-07-13:

- Signup OFF plus Send invitation worked.
- Invite email was received and opened the Production app.
- Missing profile state stopped safely without tenant fallback.
- Current customer-facing pending copy is `GUGUMOアカウントを準備しています`.
- Linked owner profile bootstrapped the rehearsal tenant.
- Existing Demo tenant CSV history was not visible.
- SUUMO CSV upload, save, Home analysis reflection, exclude, restore, duplicate warning, and duplicate cancel passed.
- Rehearsal tenant rows and Auth user were manually cleaned up by human Dashboard operation.

Invite email status:

- Invite user template localization and Supabase Dashboard save are complete.
- 2026-07-13 Production human verification passed for Japanese Invite subject, Japanese body, actual delivery, Gmail inbox receipt, HTML rendering, GUGUMO logo rendering, and CTA rendering.
- Subject: `【GUGUMO】アカウント登録のご案内`.
- CTA: `アカウント登録を完了する`.
- Previous English-template Invite delivery/link E2E passed during the 2026-07-13 rehearsal.
- Historical Invite ConfirmationURL/link flow, invite link transition, and registration flow passed in earlier production E2E.
- Latest Japanese HTML Invite CTA click-through E2E was not re-executed in this closeout. Treat it as an early-beta smoke/monitoring item, not a Technical Beta P1 blocker.
- During that rehearsal, one first Gmail delivery landed in spam; do not treat this as a proven permanent SMTP failure.
- Monitor invite/reset delivery during early beta operation.

## Stop Conditions

- The Dashboard project is not `annvqxnupddnozyghqdw`.
- `company_id` and `workspace_id` do not match.
- `auth.users.id` and `profiles.id` do not match.
- `role` is not one of `owner`, `admin`, `member`, or `viewer`.
- The user has duplicate profile rows.
- The user is already linked to another tenant.
- RLS or policy verification reports FAIL.
- Anonymous REST regression returns data.
- Public signup or anonymous sign-in is enabled unexpectedly.
- Failed login, password reset, or email delivery abuse spikes enough to indicate bot or credential-stuffing activity.

## First Use

1. Customer logs in.
2. Confirm Home bootstrap shows the expected company, workspace, and role.
3. Customer uploads SUUMO CSV.
4. Confirm dashboard/report screens load.
5. Confirm logout/login keeps the same tenant context.
6. Explain checksum warning and upload history.
7. Explain exclusion/activation behavior.
8. Run anonymous REST regression for `companies`, `workspaces`, `profiles`, `csv_uploads`, and `csv_uploads?select=file_data`.

## Manual Role/Tenant Gate

Use `supabase/sql_editor/20260711_003_beta_release_gate_role_tenant/` before external beta:

Current verification record:

- Executed on 2026-07-12 against GUGUMOjp's Project `annvqxnupddnozyghqdw`.
- The repository templates remain placeholders. Do not commit filled UUIDs, email addresses, JWTs, API keys, or Service Role keys.
- One dedicated test Auth user was used, then manually deleted from Supabase Dashboard after cleanup.
- Existing formal accounts and existing tenant A data were not changed.
- Service Role was not used.
- Cleanup completed with 0 residual rows in `companies`, `workspaces`, `profiles`, and `csv_uploads`.

Observed role results:

| Role | SELECT own tenant | INSERT own tenant | UPDATE own tenant | DELETE |
| --- | --- | --- | --- | --- |
| owner | PASS | PASS | PASS | PASS: 403 denied |
| admin | PASS | PASS: HTTP 201 | PASS: HTTP 200 | PASS: 403 denied |
| member | PASS | PASS: HTTP 201 | PASS: HTTP 200 `[]`; row unchanged | PASS: 403 denied |
| viewer | PASS | PASS: 403 RLS denied | PASS: HTTP 200 `[]`; row unchanged | PASS: 403 denied |

Permanent delete authorization has been applied and post-apply verification passed. Browser and DELETE-focused Security E2E are complete:

- Upload history distinguishes `同一内容 N件` from `同名ファイルあり`. Exact duplicate content is workspace + non-empty checksum; same-name means file_name matches but content is different or unknown. checksum NULL is not treated as exact content match. This is a judgment aid before permanent delete, not a delete recommendation.
- active row has no `完全削除` button.
- excluded row shows `有効に戻す` and `完全削除`.
- owner/admin can delete excluded own-tenant rows.
- owner/admin cannot delete active rows.
- member/viewer cannot delete excluded rows.
- cross-tenant and anonymous DELETE remain denied.
- deleted rows disappear after reload and no longer trigger duplicate checksum warning.
- Dedicated DELETE Gate Tenant B/C test data cleanup completed.
- The dedicated DELETE Gate test Auth user was manually deleted from Supabase Dashboard.
- Existing formal accounts and existing tenant data were not changed. Service Role was not used.

Observed permanent-delete results:

| Case | Result |
| --- | --- |
| owner own-tenant excluded DELETE | PASS: allowed; target row absent |
| admin own-tenant excluded DELETE | PASS: allowed; target row absent |
| active row DELETE | PASS: denied/no mutation; row remains |
| member excluded DELETE | PASS: denied/no mutation; row remains |
| viewer excluded DELETE | PASS: denied/no mutation; row remains |
| owner cross-tenant DELETE | PASS: denied/no mutation; row remains |
| anonymous DELETE | PASS: denied/no mutation; row remains |
| unexpected marker row | PASS: 0 |

Observed tenant-boundary results:

| Case | Result |
| --- | --- |
| tenant A `csv_uploads` SELECT | PASS: HTTP 200 `[]` |
| tenant A `company_id` INSERT | PASS: HTTP 403 RLS denied |
| tenant A `workspace_id` INSERT | PASS: HTTP 403 RLS denied |
| `uploaded_by` spoof | PASS: HTTP 403 RLS denied |
| tenant B row `company_id` changed to tenant A | PASS: HTTP 403 RLS denied |
| tenant B row `workspace_id` changed to tenant A | PASS: HTTP 403 RLS denied |

For future reruns of the permanent-delete gate, use `supabase/sql_editor/20260713_006_csv_uploads_delete_gate_e2e/` with fresh placeholders only. Do not reuse old filled UUIDs, upload IDs, emails, JWTs, or test tenant values.

## Common Incidents

### Password Reset

- Customer uses the password reset link on the login screen.
- Code redirects to `/?reset-password=1`.
- Production URL is `https://app.gugumo.jp`.
- Dashboard Site URL and Redirect URLs are configured for Production and localhost callbacks.
- Custom SMTP uses Resend with the verified `gugumo.jp` domain.
- Password Reset Production E2E passed on 2026-07-13: reset request, received email, production callback, password update, Home bootstrap, company/workspace/role display, and existing analysis display.
- Japanese HTML Password Reset email human verification passed on 2026-07-13: actual delivery, email receipt, Japanese copy, HTML rendering, and GUGUMO logo rendering.
- Subject: `【GUGUMO】パスワード再設定のご案内`.
- CTA: `パスワードを再設定する`.
- If password reset fails after a Vercel env change, confirm that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are copied from the same formal Supabase project and redeploy Production.
- If email does not arrive, check Supabase Auth email settings manually.

### Auth Abuse / CAPTCHA Gate

- Current Technical Beta decision: `CAPTCHA_DEFER_WITH_GATES`.
- Do not introduce CAPTCHA during the first limited, manually supported customer onboarding unless abuse signals appear.
- Keep public signup OFF and anonymous sign-in OFF.
- During early beta, manually review Supabase Auth logs, failed login patterns, password reset request volume, customer reports of unexpected reset email, Vercel logs, and Resend sending anomalies.
- Re-open CAPTCHA implementation if credential stuffing, reset abuse, Auth rate-limit hits, bot traffic, public signup, or broad/paid beta expansion changes the current attack surface.

### Tenant Not Linked

- Customer sees `GUGUMOアカウントを準備しています`.
- Verify `profiles.id`, `company_id`, `workspace_id`, and `role`.
- If the profile is missing, treat it as pending provisioning and finish profile setup before telling the customer that GUGUMO is ready to use.
- Do not treat permission errors, query failures, invalid role, or company/workspace mismatch as normal pending provisioning.

### CSV Parse Failure

- Confirm the file is SUUMO CSV.
- Do not convert or generate CSV in GUGUMO.
- Ask for the original SUUMO export if needed.
- Empty files, unsupported extensions, missing required headers, malformed CSV, and size-limit failures should show customer-facing Japanese messages.
- Minimal required headers for upload acceptance are `物件コード`, `物件名`, and `物件掲載`.
- `住戸名寄せ点数`, PV, inquiry, competition, and listing-day columns are SUUMO-derived analysis inputs. Missing values may degrade analysis quality but are not upload-blocking headers.
- The current parser is line-oriented and does not support quoted newline fields. If a SUUMO export contains quoted newlines, treat it as a known parser limitation and review before changing data.

### CSV Partial Save

- If multiple files were uploaded and one fails, saved files remain in the upload history.
- Ask the customer to retry only the failed file.
- Do not say all files succeeded when any file failed.
- If duplicate checksum rows are found, the operator can cancel the whole selected batch or continue saving the whole selected batch.
- If CSV save succeeds but history refresh fails, ask the customer to reload the screen. Do not ask them to re-upload the saved CSV.

### Supabase Failure

- Check Supabase project status.
- Do not use Service Role to bypass normal user flows.

### Vercel Failure

- Check deployment and environment variables.
- Roll back to the last known good deployment if needed.

## Rollback

- Application rollback: redeploy prior commit.
- DB rollback: only from reviewed SQL rollback plan.
- Data deletion: manual review required before deletion.
- Test tenant cleanup: delete `csv_uploads`, `profiles`, `workspaces`, then `companies`; delete Auth users last from Dashboard.
