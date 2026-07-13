-- TEMPLATE: GUGUMO Beta Release Gate one-user test tenant creation.
-- DO NOT RUN UNTIL VALUES REVIEWED.
-- Confirm Project ID before use: annvqxnupddnozyghqdw.
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- Create or invite exactly one test Auth user in Supabase Dashboard before running.
-- Do not save real email addresses, UUIDs, JWTs, or API keys back into the repository.

begin;

-- Manual prerequisites before running this template:
-- 1. Create or invite one dedicated test Auth user in Supabase Dashboard.
-- 2. Do not use existing info accounts or existing customer tenant users.
-- 3. Confirm the test user is email-confirmed or can complete invite/password setup.
-- 4. Copy the test Auth user UUID into <test-user-id> only in SQL Editor.
-- 5. Set <confirmed-project-id> to annvqxnupddnozyghqdw only after visually confirming the Dashboard project.
-- 6. Use owner as <initial-test-role> unless a reviewer explicitly chooses another valid role.
-- 7. Confirm no placeholder remains.

do $$
declare
  confirmed_project_id text := '<confirmed-project-id>';
  expected_project_id constant text := 'annvqxnupddnozyghqdw';
  test_company_id_text text := '<test-company-b-id>';
  test_workspace_id_text text := '<test-workspace-b-id>';
  test_user_id_text text := '<test-user-id>';
  initial_test_role text := '<initial-test-role>';
  test_company_name text := '<test-company-b-name>';
  test_workspace_name text := '<test-workspace-b-name>';
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
    '<test-user-email-placeholder>',
    '<test-user-display-name>',
    initial_test_role,
    test_company_name,
    test_workspace_name,
    '<test-plan-name>',
    '<test-seed-file-name>',
    '<test-snapshot-date>',
    '<test-checksum-placeholder>'
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
    raise exception 'STOP: replace all placeholders and blank values before running this template';
  end if;

  if initial_test_role not in ('owner', 'admin', 'member', 'viewer') then
    raise exception 'STOP: initial role must be owner, admin, member, or viewer';
  end if;

  test_company_id := test_company_id_text::uuid;
  test_workspace_id := test_workspace_id_text::uuid;
  test_user_id := test_user_id_text::uuid;

  if exists (select 1 from public.companies where id = test_company_id) then
    raise exception 'STOP: company id already exists: %', test_company_id;
  end if;

  if exists (select 1 from public.workspaces where id = test_workspace_id) then
    raise exception 'STOP: workspace id already exists: %', test_workspace_id;
  end if;

  if exists (select 1 from public.profiles where id = test_user_id) then
    raise exception 'STOP: test Auth user already has a profile';
  end if;

  if (select count(*) from auth.users where id = test_user_id) <> 1 then
    raise exception 'STOP: expected one existing test Auth user created manually in Supabase Dashboard';
  end if;
end $$;

insert into public.companies (
  id,
  name,
  status,
  plan,
  created_at
) values (
  '<test-company-b-id>'::uuid,
  '<test-company-b-name>',
  'trial',
  '<test-plan-name>',
  now()
);

insert into public.workspaces (
  id,
  company_id,
  name,
  status,
  created_at
) values (
  '<test-workspace-b-id>'::uuid,
  '<test-company-b-id>'::uuid,
  '<test-workspace-b-name>',
  'active',
  now()
);

insert into public.profiles (
  id,
  company_id,
  workspace_id,
  email,
  name,
  role,
  created_at
) values (
  '<test-user-id>'::uuid,
  '<test-company-b-id>'::uuid,
  '<test-workspace-b-id>'::uuid,
  '<test-user-email-placeholder>',
  '<test-user-display-name>',
  '<initial-test-role>',
  now()
);

-- Optional seed CSV row for read/update checks. Use a small non-sensitive fixture.
insert into public.csv_uploads (
  file_name,
  file_data,
  company_id,
  workspace_id,
  uploaded_by,
  snapshot_date,
  checksum,
  status,
  excluded_at,
  excluded_by
) values (
  '<test-seed-file-name>.csv',
  '[{"物件コード":"TEST-001","物件名":"TEST PROPERTY","物件掲載":"掲載","住戸名寄せ点数":"0","所属基準値":"第2基準","競合物件数(合計)":"0","合計一覧PV(合計)":"0","合計詳細PV(合計)":"0","問い合わせ(合計)":"0","掲載日数(日)(合計)":"1","物件詳細PV(一日当たり)":"0"}]'::jsonb,
  '<test-company-b-id>'::uuid,
  '<test-workspace-b-id>'::uuid,
  '<test-user-id>'::uuid,
  '<test-snapshot-date>'::date,
  '<test-checksum-placeholder>',
  'active',
  null,
  null
);

do $$
declare
  test_company_id uuid := '<test-company-b-id>'::uuid;
  test_workspace_id uuid := '<test-workspace-b-id>'::uuid;
  test_user_id uuid := '<test-user-id>'::uuid;
begin
  if (select count(*) from public.companies where id = test_company_id and name = '<test-company-b-name>' and status = 'trial') <> 1 then
    raise exception 'STOP: post-create company count mismatch';
  end if;

  if (select count(*) from public.workspaces where id = test_workspace_id and company_id = test_company_id and name = '<test-workspace-b-name>' and status = 'active') <> 1 then
    raise exception 'STOP: post-create workspace count mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = test_user_id
      and company_id = test_company_id
      and workspace_id = test_workspace_id
      and role = '<initial-test-role>'
  ) <> 1 then
    raise exception 'STOP: post-create profile count mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where company_id = test_company_id
      and workspace_id = test_workspace_id
      and id <> test_user_id
  ) <> 0 then
    raise exception 'STOP: unexpected profile exists in test tenant';
  end if;

  if (
    select count(*)
    from public.csv_uploads
    where company_id = test_company_id
      and workspace_id = test_workspace_id
      and uploaded_by = test_user_id
      and file_name = '<test-seed-file-name>.csv'
  ) <> 1 then
    raise exception 'STOP: post-create csv_uploads seed count mismatch';
  end if;
end $$;

commit;
