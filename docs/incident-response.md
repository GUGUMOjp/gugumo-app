# Incident Response

## Severity

| Level | Example | Initial response |
| --- | --- | --- |
| Critical | Tenant data leak risk, destructive data change | Stop affected operation, preserve logs, notify owner |
| High | Login unavailable, upload unavailable | Confirm provider status, communicate workaround |
| Medium | Report display issue, duplicate warning issue | Record scope, schedule fix |
| Low | Copy/layout issue | Backlog unless customer-blocking |

## First Checks

1. Confirm environment is `/Users/tanakajunichi/Desktop/gugumo-app`.
2. Confirm Supabase project is `annvqxnupddnozyghqdw`.
3. Check latest deployed commit.
4. Check Supabase status.
5. Check Vercel status.

## Data Incident Rules

- Do not run ad hoc destructive SQL.
- Do not use Service Role for normal customer operation.
- Preserve evidence before changes.
- Separate customer communication from root cause analysis.

## Customer Communication

- Explain impact in customer language.
- Avoid internal implementation terms.
- Give next update time.

