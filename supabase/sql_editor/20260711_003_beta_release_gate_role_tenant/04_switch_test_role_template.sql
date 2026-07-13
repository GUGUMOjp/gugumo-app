-- TEMPLATE: GUGUMO Beta Release Gate one-user role switch.
-- DO NOT RUN UNTIL VALUES REVIEWED.
-- Confirm Project ID before use: annvqxnupddnozyghqdw.
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- After running this template, logout from the app and login again as the same test user.

begin;

do $$
declare
  confirmed_project_id text := '<confirmed-project-id>';
  expected_project_id constant text := 'annvqxnupddnozyghqdw';
  test_company_id_text text := '<test-company-b-id>';
  test_workspace_id_text text := '<test-workspace-b-id>';
  test_user_id_text text := '<test-user-id>';
  expected_current_role text := '<expected-current-role>';
  next_role text := '<next-role>';
  placeholder_values text[];
  test_company_id uuid;
  test_workspace_id uuid;
  test_user_id uuid;
begin
  placeholder_values := array[
    confirmed_project_id,
    test_company_id_text,
    test_workspace_id_text,
    test_user_id_text,
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

  test_company_id := test_company_id_text::uuid;
  test_workspace_id := test_workspace_id_text::uuid;
  test_user_id := test_user_id_text::uuid;

  if (
    select count(*)
    from public.profiles
    where id = test_user_id
      and company_id = test_company_id
      and workspace_id = test_workspace_id
  ) <> 1 then
    raise exception 'STOP: expected exactly one test profile in tenant B';
  end if;

  if (
    select role
    from public.profiles
    where id = test_user_id
      and company_id = test_company_id
      and workspace_id = test_workspace_id
  ) <> expected_current_role then
    raise exception 'STOP: current role does not match expected role';
  end if;

  update public.profiles
  set role = next_role
  where id = test_user_id
    and company_id = test_company_id
    and workspace_id = test_workspace_id
    and role = expected_current_role;

  if (
    select count(*)
    from public.profiles
    where id = test_user_id
      and company_id = test_company_id
      and workspace_id = test_workspace_id
      and role = next_role
  ) <> 1 then
    raise exception 'STOP: role switch did not update exactly one test profile';
  end if;

  if (
    select count(*)
    from public.profiles
    where company_id = test_company_id
      and workspace_id = test_workspace_id
      and id <> test_user_id
  ) <> 0 then
    raise exception 'STOP: unexpected profile exists in tenant B after role switch';
  end if;
end $$;

commit;
