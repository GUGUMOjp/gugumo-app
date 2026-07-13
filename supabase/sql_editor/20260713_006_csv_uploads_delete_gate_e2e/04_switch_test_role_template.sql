-- TEMPLATE: GUGUMO DELETE Gate E2E one-user role switch.
-- DO NOT RUN UNTIL VALUES REVIEWED.
-- Confirm Project ID before use: annvqxnupddnozyghqdw.
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- After running this template, logout from the app and login again as the same test user, or refresh the user JWT/session before REST checks.

begin;

do $$
declare
  confirmed_project_id text := '<confirmed-project-id>';
  expected_project_id constant text := 'annvqxnupddnozyghqdw';
  test_auth_user_id_text text := '<test-auth-user-id>';
  tenant_b_company_id_text text := '<tenant-b-company-id>';
  tenant_b_workspace_id_text text := '<tenant-b-workspace-id>';
  expected_current_role text := '<expected-current-role>';
  next_role text := '<next-role>';
  placeholder_values text[];
  test_auth_user_id uuid;
  tenant_b_company_id uuid;
  tenant_b_workspace_id uuid;
begin
  placeholder_values := array[
    confirmed_project_id,
    test_auth_user_id_text,
    tenant_b_company_id_text,
    tenant_b_workspace_id_text,
    expected_current_role,
    next_role
  ];

  if confirmed_project_id <> expected_project_id then
    raise exception 'STOP: confirmed Project ID must be %, got %', expected_project_id, confirmed_project_id;
  end if;

  if exists (
    select 1
    from unnest(placeholder_values) as v(value)
    where value like '<%'
       or value like '%>'
       or btrim(value) = ''
  ) then
    raise exception 'STOP: replace all placeholders and blank values before switching role';
  end if;

  if expected_current_role not in ('owner', 'admin', 'member', 'viewer') then
    raise exception 'STOP: expected current role must be owner, admin, member, or viewer';
  end if;

  if next_role not in ('owner', 'admin', 'member', 'viewer') then
    raise exception 'STOP: next role must be owner, admin, member, or viewer';
  end if;

  test_auth_user_id := test_auth_user_id_text::uuid;
  tenant_b_company_id := tenant_b_company_id_text::uuid;
  tenant_b_workspace_id := tenant_b_workspace_id_text::uuid;

  if (
    select count(*)
    from public.companies
    where id = tenant_b_company_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_COMPANY'
      and status = 'trial'
  ) <> 1 then
    raise exception 'STOP: Tenant B company mismatch';
  end if;

  if (
    select count(*)
    from public.workspaces
    where id = tenant_b_workspace_id
      and company_id = tenant_b_company_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_WORKSPACE'
      and status = 'active'
  ) <> 1 then
    raise exception 'STOP: Tenant B workspace mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = test_auth_user_id
      and company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
  ) <> 1 then
    raise exception 'STOP: expected exactly one DELETE Gate test profile in Tenant B';
  end if;

  if (
    select role
    from public.profiles
    where id = test_auth_user_id
      and company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
  ) <> expected_current_role then
    raise exception 'STOP: current role does not match expected role';
  end if;

  update public.profiles
  set role = next_role
  where id = test_auth_user_id
    and company_id = tenant_b_company_id
    and workspace_id = tenant_b_workspace_id
    and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
    and role = expected_current_role;

  if (
    select count(*)
    from public.profiles
    where id = test_auth_user_id
      and company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
      and role = next_role
  ) <> 1 then
    raise exception 'STOP: role switch did not update exactly one DELETE Gate test profile';
  end if;

  if (
    select count(*)
    from public.profiles
    where company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and id <> test_auth_user_id
  ) <> 0 then
    raise exception 'STOP: unexpected profile exists in Tenant B after role switch';
  end if;
end $$;

commit;
