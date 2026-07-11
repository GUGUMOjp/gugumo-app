# GUGUMO Beta Runbook

## Before Onboarding

1. Confirm signed agreement or beta approval.
2. Confirm target company and workspace name.
3. Confirm owner email.
4. Confirm the customer understands SUUMO CSV upload is manual.

## Account Setup

1. Create or verify company.
2. Create or verify workspace.
3. Invite Auth user.
4. Create profile with `company_id`, `workspace_id`, and role.
5. Ask the customer to set a password from the invite email.

## First Use

1. Customer logs in.
2. Customer uploads SUUMO CSV.
3. Confirm dashboard/report screens load.
4. Explain checksum warning and upload history.
5. Explain exclusion/activation behavior.

## Common Incidents

### Password Reset

- Customer uses the password reset link on the login screen.
- If email does not arrive, check Supabase Auth email settings manually.

### Tenant Not Linked

- Customer sees account setup incomplete screen.
- Verify `profiles.id`, `company_id`, `workspace_id`, and `role`.

### CSV Parse Failure

- Confirm the file is SUUMO CSV.
- Do not convert or generate CSV in GUGUMO.
- Ask for the original SUUMO export if needed.

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

