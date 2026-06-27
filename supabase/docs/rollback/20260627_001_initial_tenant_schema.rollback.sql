-- Rollback for 20260627_001_initial_tenant_schema.sql.
--
-- DANGER:
-- Do not run this rollback if existing tenant data is present.
-- This drops tenant base tables and all dependent data.
--
-- If only development seed data needs to be removed, use the seed rollback
-- flow documented in docs/17_TenantSeedPlan.md instead of this schema rollback.

drop table if exists public.profiles;
drop table if exists public.workspaces;
drop table if exists public.companies;
