# Technical Beta Readiness

Status date: 2026-07-13

Current status: Conditional GO for a limited Technical Beta.

This is the current readiness source of truth. Historical audit notes remain in `docs/release-readiness-audit.md` and `docs/release-readiness-audit-validation.md`.

## Scope

Technical Beta means a limited customer onboarding with manual operator support, manual SUUMO CSV upload, and close monitoring. It is not paid self-serve general availability.

## Current Gate Results

| Gate | Status | Evidence |
| --- | --- | --- |
| Repository | PASS | `main` at `b1cc75a`, clean and synced before this closeout; no package/lockfile drift. |
| Production deploy | PASS | `https://app.gugumo.jp` deployed and connected to the formal Supabase project. |
| Production Auth | PASS | Password Reset Production E2E passed; Signup OFF; anonymous sign-in OFF; password minimum 8; email/password only; Resend Custom SMTP active. |
| Invite onboarding | PASS with P1 email-quality follow-up | Production Invite user flow passed with Signup OFF. Invite template remains default English and one Gmail delivery landed in spam once. |
| Tenant isolation | PASS | Missing profile stopped safely; current customer-facing copy treats it as pending provisioning. Linked owner saw only the rehearsal tenant; existing Demo tenant CSV history was not visible. |
| CSV lifecycle | PASS | Upload, save, Home analysis reflection, exclude, restore, duplicate warning, and cancel duplicate save passed in Production rehearsal. |
| Cleanup | PASS by human Dashboard operation | Rehearsal `csv_uploads`, `profiles`, `workspaces`, `companies`, and Auth user were manually removed on 2026-07-13. Repository did not query the DB. |
| Security | PASS for Technical Beta | RLS/JWT transport, anonymous REST denial, role/tenant E2E, DELETE Gate, and token transport audits passed. |
| Legal/customer-facing | Conditional | Current legal pages are beta-level/provisional; acceptable only if contract/onboarding terms cover the beta customer. |

## Production Onboarding Rehearsal Record

Executed on 2026-07-13 against GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

Rehearsal logical data:

- Company: `Onboarding Rehearsal Company`
- Workspace: `Onboarding Rehearsal Workspace`
- Role: `owner`

Do not store the filled Auth user email, UUIDs, password, JWT, invite token, or other secrets in the repository.

Observed PASS:

- Formal Supabase project was confirmed.
- Company and workspace were created manually.
- Supabase Dashboard `Send invitation` succeeded with Signup OFF.
- Invite email was received and link opened the Production app.
- Before profile creation, the app stopped at account setup incomplete and did not fall back to another tenant.
- Current UX spec for the same internal safe stop is `GUGUMOアカウントを準備しています`.
- After profile creation, `profiles.id = auth.users.id` and tenant relationships were correct.
- Production login succeeded.
- Header/Home displayed the rehearsal company, rehearsal workspace, and owner role.
- Existing Demo tenant CSV history was not visible to the rehearsal tenant.
- SUUMO CSV upload and save succeeded.
- Analysis result appeared on Home.
- Exclude and restore succeeded.
- Same CSV re-upload showed the workspace/checksum duplicate warning.
- Duplicate save was canceled.
- Tenant UI isolation was re-confirmed.

Cleanup record:

- One rehearsal `csv_uploads` row was manually deleted.
- One rehearsal `profiles` row was manually deleted.
- One rehearsal `workspaces` row was manually deleted.
- One rehearsal `companies` row was manually deleted.
- The rehearsal Auth user was manually deleted.
- Existing Demo Company, Demo Workspace, existing owner profile, and existing formal CSV data were not changed.

This cleanup record is based on human Dashboard operation on 2026-07-13. The repository did not run SQL or query the DB to re-verify cleanup.

## Invite Email Follow-Up

Observed:

- Invite email worked functionally.
- Invite email template was still the Supabase default English template.
- The first Gmail delivery landed in spam once; after marking it not spam, the rehearsal continued.
- Password Reset email through the same Custom SMTP path was received successfully.

Interpretation:

- Do not classify this as a proven permanent deliverability failure.
- Treat Invite email copy as a customer-facing quality issue.
- Keep Invite email copy consistent with the pending provisioning UX: the operator should create and verify the profile, then tell the customer when GUGUMO is ready to use.
- SPF/DKIM/DMARC and mailbox reputation cannot be verified from the repository; external DNS/email settings must be checked outside Codex.

Beta blocker:

- Not a P0 blocker for a very limited, manually supported Technical Beta.
- P1 before inviting a real customer: localize Invite email template and perform one live invite delivery check to the customer domain or test mailbox.

## P0: Must Finish Before Technical Beta

No open P0 items are currently identified from repository state and known Production E2E evidence.

## P1: Strongly Recommended Before First Customer Invite

### Invite email template and deliverability check

- Current state: Invite flow works, but template is default English and one Gmail delivery went to spam once.
- Why remaining: Password Reset template was localized; Invite template still needs customer-facing polish.
- Risk: Customer confusion or missed invite.
- Response: Localize the Supabase Invite email template, preserve link variables, and run one delivery check.
- Code change: No.
- Dashboard/DNS/ops change: Dashboard email template change; DNS/mailbox deliverability check may be needed.
- Estimate: S.
- Blocks beta: No for internal/manual rehearsal; recommended before first external invite.

### Legal/support final acceptance

- Current state: Legal pages and support policy exist but remain beta/provisional in repository inventory.
- Why remaining: Contract and legal wording require business/legal decision.
- Risk: Customer expectation mismatch for paid use, cancellation, data retention, and support.
- Response: Confirm beta contract/onboarding terms cover current provisional pages.
- Code change: Possibly copy only.
- Dashboard/DNS/ops change: No.
- Estimate: M.
- Blocks beta: Blocks paid/broad beta; limited technical beta can proceed with explicit terms.

### CAPTCHA final decision

- Current state: Signup OFF and anonymous sign-in OFF reduce exposure.
- Why remaining: CAPTCHA setting is a risk decision for Auth endpoints.
- Risk: Credential stuffing or bot reset requests if abused.
- Response: Decide whether to enable CAPTCHA based on beta traffic and Supabase Auth logs.
- Code change: Maybe, depending provider.
- Dashboard/DNS/ops change: Dashboard/Auth provider configuration.
- Estimate: S-M.
- Blocks beta: No for limited manual beta.

## P2: Address During Technical Beta

### Read-only onboarding verification SQL

- Current state: Manual Dashboard verification is documented; no dedicated read-only SQL package for onboarding closeout.
- Risk: Operator misses a relationship mismatch.
- Response: Add placeholder read-only verification SQL for company/workspace/profile/Auth consistency.
- Code change: No app code.
- Dashboard/DNS/ops change: SQL Editor read-only execution during rehearsal.
- Estimate: S.
- Blocks beta: No.

### Onboarding audit checklist

- Current state: Runbook exists; no structured per-customer operator checklist artifact.
- Risk: Harder to prove who created which tenant and when.
- Response: Create a non-secret checklist template.
- Code change: No.
- Dashboard/DNS/ops change: Operator process.
- Estimate: S.
- Blocks beta: No.

### Email deliverability monitoring

- Current state: One invite spam incident observed; reset email passed.
- Risk: Future invites may be missed.
- Response: Monitor invite/reset delivery and check SPF/DKIM/DMARC/reputation externally.
- Code change: No.
- Dashboard/DNS/ops change: DNS/email provider review.
- Estimate: S-M.
- Blocks beta: No, but important.

### Error tracking and monitoring

- Current state: Manual E2E and console checks passed; no dedicated production error tracking integration is recorded.
- Risk: Production failures may be discovered late.
- Response: Add lightweight monitoring/error review process.
- Code change: Possibly later.
- Dashboard/DNS/ops change: Monitoring setup.
- Estimate: M.
- Blocks beta: No for closely monitored limited beta.

## P3: Required Before Formal Release

- Admin onboarding UI or secured operator workflow.
- Automated profile provisioning or transactional tenant bootstrap.
- Idempotent tenant creation and duplicate prevention.
- Persistent audit log for invite/profile/tenant lifecycle.
- Multi-user support workflow.
- Owner transfer.
- Invite resend workflow.
- Account suspension.
- Tenant deletion and customer offboarding.
- Backup/restore drill and documented owner responsibilities.
- Formal legal text and paid contract alignment.
- Longer-term snapshot/snapshot_rows architecture.

## Known Non-Blockers For Limited Technical Beta

- `Create user` fallback is not rehearsed. It is not the primary flow.
- The repository cannot confirm whether the named leftover test Auth account has DB relations. Delete only after DB relationship checks.
- The repository cannot prove whether Demo Company/Demo Workspace is still required. Do not delete it without DB relationship and smoke-test dependency review.
- Existing fixed UUIDs in an old SQL package remain known review debt, not a new closeout finding.

## Go / No-Go

Decision: A. Technical Beta GO for a limited, manually supported first customer.

Conditions:

- Use Invite user, not public signup.
- Keep one initial owner per customer.
- Confirm project and env before any customer operation.
- Create company/workspace before invitation, create the profile as soon as the Auth user UUID is available, and contact the customer after integrity verification.
- Localize/check Invite email before the first real customer invite when practical.
- Keep legal/support/customer expectations explicit in onboarding.
- Do not delete the named leftover test Auth account or Demo tenant until DB relationships are verified.
