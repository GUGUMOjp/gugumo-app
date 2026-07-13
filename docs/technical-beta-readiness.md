# Technical Beta Readiness

Status date: 2026-07-13

Current status: Conditional GO for a limited Technical Beta.

This is the current readiness source of truth. Historical audit notes remain in `docs/release-readiness-audit.md` and `docs/release-readiness-audit-validation.md`.

## Scope

Technical Beta means a limited customer onboarding with manual operator support, manual SUUMO CSV upload, and close monitoring. It is not paid self-serve general availability.

## Current Gate Results

| Gate | Status | Evidence |
| --- | --- | --- |
| Repository | PASS | `main` at `72e3300`, clean and synced before this CAPTCHA review; no package/lockfile drift. |
| Production deploy | PASS | `https://app.gugumo.jp` deployed and connected to the formal Supabase project. |
| Production Auth | PASS | Password Reset Production E2E passed; Signup OFF; anonymous sign-in OFF; password minimum 8; email/password only; Resend Custom SMTP active. |
| Invite onboarding | PASS with P1 post-localization delivery check | Production Invite user flow passed with Signup OFF. Invite user template localization and Dashboard save are done; post-localization Japanese delivery/link/spam check is not yet verified. |
| Tenant isolation | PASS | Missing profile stopped safely; current customer-facing copy treats it as pending provisioning. Linked owner saw only the rehearsal tenant; existing Demo tenant CSV history was not visible. |
| CSV lifecycle | PASS | Upload, save, Home analysis reflection, exclude, restore, duplicate warning, and cancel duplicate save passed in Production rehearsal. |
| Cleanup | PASS by human Dashboard operation | Rehearsal `csv_uploads`, `profiles`, `workspaces`, `companies`, and Auth user were manually removed on 2026-07-13. Repository did not query the DB. |
| Security | PASS for Technical Beta | RLS/JWT transport, anonymous REST denial, role/tenant E2E, DELETE Gate, and token transport audits passed. |
| CAPTCHA | DEFERRED WITH GATES | Public signup and anonymous sign-in are OFF, beta is invite-only and manually supported, and no CAPTCHA provider/env/settings change is required before the first customer. |
| Legal/customer-facing | PASS for limited Technical Beta | Customer-facing legal/support pages avoid visible provisional labels and defer formal contract, pricing, contact, retention, and cancellation details to individual agreement/onboarding terms. |

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

## Invite Email Record

Observed:

- Invite email worked functionally.
- During the 2026-07-13 rehearsal, the invite template was still the Supabase default English template.
- During that rehearsal, the first Gmail delivery landed in spam once; after marking it not spam, the rehearsal continued.
- Password Reset email through the same Custom SMTP path was received successfully.
- Current operational status: Invite user template localization and Supabase Dashboard save are complete.
- Post-localization Japanese Invite delivery, subject/body receipt, HTML rendering, ConfirmationURL transition, inbox/spam placement, and deliverability are not yet verified.

Interpretation:

- Do not classify this as a proven permanent deliverability failure.
- Treat the post-localization delivery check as an operational P1 gate before the first real customer invite.
- Keep monitoring invite delivery during early beta operation.
- Keep Invite email copy consistent with the pending provisioning UX: the operator should create and verify the profile, then tell the customer when GUGUMO is ready to use.
- SPF/DKIM/DMARC and mailbox reputation cannot be verified from the repository; external DNS/email settings must be checked outside Codex.

Beta blocker:

- Not a P0 blocker for a very limited, manually supported Technical Beta.
- P1 before the first real customer invite: send one Japanese Invite test and verify subject/body, link transition, and inbox/spam placement.

## P0: Must Finish Before Technical Beta

No open P0 items are currently identified from repository state and known Production E2E evidence.

## P1: Strongly Recommended Before First Customer Invite

### Invite email post-localization delivery check

- Current state: Invite template localization and Dashboard save are done; post-localization Japanese delivery/link/spam check is not yet verified.
- Why remaining: The previous live Invite E2E passed while the template was still English. The Japanese subject/body and link behavior have not been re-sent after localization.
- Risk: Customer confusion, missed invite, or broken localized email rendering.
- Response: Send one Japanese Invite test before the first real customer invite and verify subject/body, HTML display, ConfirmationURL transition, and inbox/spam placement.
- Code change: No.
- Dashboard/DNS/ops change: Supabase Dashboard Send invitation; DNS/email-provider review only if delivery issues recur.
- Estimate: S.
- Blocks beta: No for internal/manual readiness; required as an operational gate before the first real customer invite.

## Closed / Deferred Security Decisions

### CAPTCHA final decision

- Final selection: `CAPTCHA_DEFER_WITH_GATES`.
- Technical Beta decision: Do not add CAPTCHA before the first limited, manually supported customer.
- Security reason: The public Auth attack surface is limited to login and password reset request forms. Public signup and anonymous sign-in are OFF, Invite issuance is operator-only through Supabase Dashboard, password update requires a recovery session, and tenant data remains protected by authenticated user JWT plus RLS.
- UX reason: CAPTCHA would add friction to invited owner login/reset during a small manual beta, while not materially reducing tenant-data exposure under the current signup-off posture.
- Implementation reason: CAPTCHA would require provider setup, secret management, Supabase/Vercel configuration, and additional E2E coverage. That cost is better reserved for abuse signals or broader exposure.
- Supabase dependency: The app currently relies on Supabase Auth protections and manual log review for login/reset abuse. Repository code cannot read current Dashboard rate-limit values. A human Dashboard check on 2026-07-13 observed Sign-ups / Sign-ins `30 requests / 5 min / IP`, Token refreshes `150 requests / 5 min / IP`, Token verifications `30 requests / 5 min / IP`, and Anonymous sign-in OFF; re-check these if Auth settings change. The previously observed `2 emails / hour` limit applied to Supabase standard email before Custom SMTP and is not treated as the current Resend sending limit.
- Future trigger conditions: Re-open CAPTCHA if public signup is enabled, failed login or password reset attempts spike, customers report unexpected reset emails, Supabase Auth rate limits are hit, bot traffic increases, or GUGUMO moves toward broad/paid beta.
- Code change: No.
- Dashboard/DNS/ops change now: No.
- Blocks beta: No for limited manual beta.

## P2: Address During Technical Beta

### Legal/support formalization for paid or broader beta

- Current state: Production-facing pages are accepted for limited, manually supported Technical Beta when paired with individual agreement/onboarding terms.
- Why remaining: Formal paid/broad beta still needs final legal review for operator identity, contact disclosure, cancellation, retention/deletion, and support commitments.
- Risk: Customer expectation mismatch as customer count or paid scope grows.
- Response: Finalize terms, privacy, data handling, support policy, and 特商法 applicability before paid/broad beta.
- Code change: Possibly copy only.
- Dashboard/DNS/ops change: No.
- Estimate: M-L.
- Blocks beta: No for limited manual beta; yes before paid/broad beta.

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

- Current state: One invite spam incident was observed during the English-template rehearsal; reset email passed. The Japanese post-localization Invite delivery check remains P1 before the first real customer invite.
- Risk: Future invites may be missed.
- Response: Monitor invite/reset delivery and check SPF/DKIM/DMARC/reputation externally.
- Code change: No.
- Dashboard/DNS/ops change: DNS/email provider review.
- Estimate: S-M.
- Blocks beta: No, but important.

### Auth abuse monitoring

- Current state: No CAPTCHA is implemented. Public signup and anonymous sign-in are OFF; login and password reset request remain public Auth forms.
- Risk: Credential stuffing, login brute force, password reset abuse, or email sending anomalies.
- Response: During early beta, manually review Supabase Auth logs, failed login patterns, reset request volume, Vercel logs, Resend sending volume, and customer reports of unexpected reset email.
- Code change: No until trigger conditions are met.
- Dashboard/DNS/ops change: Manual dashboard/log review.
- Estimate: S.
- Blocks beta: No for limited manual beta; re-open before broad/paid beta or if abuse appears.

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
- Before the first real customer invite, run one Japanese Invite delivery/link/spam check after localization.
- Keep CAPTCHA deferred with gates: public signup and anonymous sign-in OFF, and manually watch login/reset abuse signals during early beta.
- Keep invite/reset delivery under observation during early beta.
- Keep legal/support/customer expectations explicit in onboarding and individual agreement terms.
- Do not delete the named leftover test Auth account or Demo tenant until DB relationships are verified.
