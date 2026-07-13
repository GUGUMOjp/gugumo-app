-- TEMPLATE: GUGUMO Beta Release Gate one-user test tenant cleanup.
-- DO NOT RUN UNTIL VALUES REVIEWED.
-- Confirm Project ID before use: annvqxnupddnozyghqdw.
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- Replace placeholders in SQL Editor only. Do not save real UUIDs, emails, JWTs, or API keys.
-- Auth user is not deleted by this SQL. Delete the test Auth user manually in Supabase Dashboard after cleanup.

-- Review cleanup targets before running the transaction.
select
  'review_cleanup_targets_before_running_transaction' as check_name,
  '<confirmed-project-id>' as confirmed_project_id,
  '<test-company-b-id>' as test_company_b_id,
  '<test-company-b-name>' as test_company_b_name,
  '<test-workspace-b-id>' as test_workspace_b_id,
  '<test-workspace-b-name>' as test_workspace_b_name,
  '<test-user-id>' as test_user_id,
  '<test-user-display-name>' as test_user_display_name,
  '<expected-csv-upload-count>' as expected_csv_upload_count;

begin;

-- Cleanup order avoids foreign-key conflicts:
-- 1. csv_uploads
-- 2. profiles
-- 3. workspaces
-- 4. companies

do $$
declare
  confirmed_project_id text := '<confirmed-project-id>';
  expected_project_id constant text := 'annvqxnupddnozyghqdw';
  test_company_id_text text := '<test-company-b-id>';
  test_workspace_id_text text := '<test-workspace-b-id>';
  test_user_id_text text := '<test-user-id>';
  expected_csv_upload_count_text text := '<expected-csv-upload-count>';
  placeholder_values text[];
  test_company_id uuid;
  test_workspace_id uuid;
  test_user_id uuid;
  expected_csv_upload_count integer;
begin
  placeholder_values := array[
    confirmed_project_id,
    test_company_id_text,
    '<test-company-b-name>',
    test_workspace_id_text,
    '<test-workspace-b-name>',
    test_user_id_text,
    '<test-user-display-name>',
    expected_csv_upload_count_text
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
    raise exception 'STOP: replace all placeholders and blank values before cleanup';
  end if;

  test_company_id := test_company_id_text::uuid;
  test_workspace_id := test_workspace_id_text::uuid;
  test_user_id := test_user_id_text::uuid;
  expected_csv_upload_count := expected_csv_upload_count_text::integer;

  if expected_csv_upload_count < 0 then
    raise exception 'STOP: expected csv upload count must be zero or greater';
  end if;

  if (
    select count(*)
    from public.companies
    where id = test_company_id
      and name = '<test-company-b-name>'
      and status = 'trial'
  ) <> 1 then
    raise exception 'STOP: cleanup company target is missing or does not match the expected test company';
  end if;

  if (
    select count(*)
    from public.workspaces
    where id = test_workspace_id
      and company_id = test_company_id
      and name = '<test-workspace-b-name>'
      and status = 'active'
  ) <> 1 then
    raise exception 'STOP: cleanup workspace target is missing or does not match the expected test workspace';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = test_user_id
      and company_id = test_company_id
      and workspace_id = test_workspace_id
      and name = '<test-user-display-name>'
      and role in ('owner', 'admin', 'member', 'viewer')
  ) <> 1 then
    raise exception 'STOP: cleanup profile target count mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where company_id = test_company_id
      and workspace_id = test_workspace_id
      and id <> test_user_id
  ) <> 0 then
    raise exception 'STOP: unexpected profile exists in cleanup tenant; possible customer-data collision';
  end if;

  if (
    select count(*)
    from public.csv_uploads
    where company_id = test_company_id
      and workspace_id = test_workspace_id
  ) <> expected_csv_upload_count then
    raise exception 'STOP: cleanup csv_uploads count mismatch; review before deleting';
  end if;
end $$;

delete from public.csv_uploads
where company_id = '<test-company-b-id>'::uuid
  and workspace_id = '<test-workspace-b-id>'::uuid;

delete from public.profiles
where id = '<test-user-id>'::uuid
  and company_id = '<test-company-b-id>'::uuid
  and workspace_id = '<test-workspace-b-id>'::uuid
  and name = '<test-user-display-name>';

delete from public.workspaces
where id = '<test-workspace-b-id>'::uuid
  and company_id = '<test-company-b-id>'::uuid
  and name = '<test-workspace-b-name>';

delete from public.companies
where id = '<test-company-b-id>'::uuid
  and name = '<test-company-b-name>'
  and status = 'trial';

do $$
declare
  test_company_id uuid := '<test-company-b-id>'::uuid;
  test_workspace_id uuid := '<test-workspace-b-id>'::uuid;
  test_user_id uuid := '<test-user-id>'::uuid;
begin
  if exists (select 1 from public.csv_uploads where company_id = test_company_id or workspace_id = test_workspace_id) then
    raise exception 'STOP: cleanup residue remains in csv_uploads';
  end if;

  if exists (select 1 from public.profiles where id = test_user_id or company_id = test_company_id or workspace_id = test_workspace_id) then
    raise exception 'STOP: cleanup residue remains in profiles';
  end if;

  if exists (select 1 from public.workspaces where id = test_workspace_id or company_id = test_company_id) then
    raise exception 'STOP: cleanup residue remains in workspaces';
  end if;

  if exists (select 1 from public.companies where id = test_company_id) then
    raise exception 'STOP: cleanup residue remains in companies';
  end if;
end $$;

commit;
