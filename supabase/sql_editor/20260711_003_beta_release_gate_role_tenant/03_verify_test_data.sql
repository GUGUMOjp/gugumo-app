-- GUGUMO Beta Release Gate one-user test data verification.
-- Target Supabase project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- Read-only checks. Replace placeholders in SQL Editor only.

select
  'confirm_project_id_before_verification' as check_name,
  'annvqxnupddnozyghqdw' as expected_project_id,
  'Confirm the SQL Editor is opened in GUGUMOjp''s Project.' as operator_action;

select
  'test_company_workspace_profile_integrity' as check_name,
  c.id as company_id,
  c.name as company_name,
  w.id as workspace_id,
  w.name as workspace_name,
  p.id as profile_id,
  p.role as current_role,
  case
    when c.id is null then 'FAIL: company missing'
    when c.name <> '<test-company-b-name>' then 'FAIL: company name mismatch'
    when w.id is null then 'FAIL: workspace missing'
    when w.name <> '<test-workspace-b-name>' then 'FAIL: workspace name mismatch'
    when w.company_id <> c.id then 'FAIL: workspace company mismatch'
    when p.id is null then 'FAIL: profile missing'
    when p.company_id <> c.id then 'FAIL: profile company mismatch'
    when p.workspace_id <> w.id then 'FAIL: profile workspace mismatch'
    when p.role not in ('owner', 'admin', 'member', 'viewer') then 'FAIL: invalid current role'
    else 'PASS'
  end as result
from public.companies c
left join public.workspaces w
  on w.id = '<test-workspace-b-id>'::uuid
left join public.profiles p
  on p.id = '<test-user-id>'::uuid
where c.id = '<test-company-b-id>'::uuid;

select
  'test_auth_user_exists' as check_name,
  count(*) as auth_user_count,
  case
    when count(*) = 1 then 'PASS'
    else 'FAIL: auth user missing or duplicated'
  end as result
from auth.users
where id = '<test-user-id>'::uuid;

select
  'test_profile_count' as check_name,
  count(*) as profile_count,
  case
    when count(*) = 1 then 'PASS'
    else 'FAIL: expected exactly one test profile'
  end as result
from public.profiles
where id = '<test-user-id>'::uuid
  and company_id = '<test-company-b-id>'::uuid
  and workspace_id = '<test-workspace-b-id>'::uuid;

select
  'unexpected_profiles_in_tenant_b' as check_name,
  count(*) as unexpected_profile_count,
  case
    when count(*) = 0 then 'PASS'
    else 'FAIL: unexpected profile exists in tenant B'
  end as result
from public.profiles
where company_id = '<test-company-b-id>'::uuid
  and workspace_id = '<test-workspace-b-id>'::uuid
  and id <> '<test-user-id>'::uuid;

select
  'test_seed_csv_upload' as check_name,
  count(*) as seed_csv_count,
  case
    when count(*) >= 1 then 'PASS'
    else 'FAIL: seed csv row missing'
  end as result
from public.csv_uploads
where company_id = '<test-company-b-id>'::uuid
  and workspace_id = '<test-workspace-b-id>'::uuid
  and uploaded_by = '<test-user-id>'::uuid
  and file_name = '<test-seed-file-name>.csv';
