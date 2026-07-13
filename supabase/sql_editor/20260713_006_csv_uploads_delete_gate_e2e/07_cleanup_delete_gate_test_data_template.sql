-- TEMPLATE: GUGUMO DELETE Gate E2E cleanup.
-- DO NOT RUN UNTIL VALUES REVIEWED.
-- Confirm Project ID before use: annvqxnupddnozyghqdw.
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- Replace placeholders in SQL Editor only. Do not save real UUIDs, emails, JWTs, API keys, or Service Role keys.
-- Auth user is not deleted by this SQL. Delete the test Auth user manually in Supabase Dashboard after cleanup succeeds.

-- Review cleanup targets before running the transaction. This query is informational.
select
  'review_delete_gate_cleanup_targets_before_transaction' as check_name,
  '<confirmed-project-id>' as confirmed_project_id,
  '<test-auth-user-id>' as test_auth_user_id,
  '<tenant-b-company-id>' as tenant_b_company_id,
  '<tenant-b-workspace-id>' as tenant_b_workspace_id,
  '<tenant-c-company-id>' as tenant_c_company_id,
  '<tenant-c-workspace-id>' as tenant_c_workspace_id,
  '<expected-tenant-b-csv-upload-count>' as expected_tenant_b_csv_upload_count,
  '<expected-tenant-c-csv-upload-count>' as expected_tenant_c_csv_upload_count;

begin;

do $$
declare
  confirmed_project_id text := '<confirmed-project-id>';
  expected_project_id constant text := 'annvqxnupddnozyghqdw';
  test_auth_user_id_text text := '<test-auth-user-id>';
  tenant_b_company_id_text text := '<tenant-b-company-id>';
  tenant_b_workspace_id_text text := '<tenant-b-workspace-id>';
  tenant_c_company_id_text text := '<tenant-c-company-id>';
  tenant_c_workspace_id_text text := '<tenant-c-workspace-id>';
  expected_tenant_b_csv_upload_count_text text := '<expected-tenant-b-csv-upload-count>';
  expected_tenant_c_csv_upload_count_text text := '<expected-tenant-c-csv-upload-count>';
  placeholder_values text[];
  test_auth_user_id uuid;
  tenant_b_company_id uuid;
  tenant_b_workspace_id uuid;
  tenant_c_company_id uuid;
  tenant_c_workspace_id uuid;
  expected_tenant_b_csv_upload_count integer;
  expected_tenant_c_csv_upload_count integer;
begin
  placeholder_values := array[
    confirmed_project_id,
    test_auth_user_id_text,
    tenant_b_company_id_text,
    tenant_b_workspace_id_text,
    tenant_c_company_id_text,
    tenant_c_workspace_id_text,
    expected_tenant_b_csv_upload_count_text,
    expected_tenant_c_csv_upload_count_text
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

  test_auth_user_id := test_auth_user_id_text::uuid;
  tenant_b_company_id := tenant_b_company_id_text::uuid;
  tenant_b_workspace_id := tenant_b_workspace_id_text::uuid;
  tenant_c_company_id := tenant_c_company_id_text::uuid;
  tenant_c_workspace_id := tenant_c_workspace_id_text::uuid;
  expected_tenant_b_csv_upload_count := expected_tenant_b_csv_upload_count_text::integer;
  expected_tenant_c_csv_upload_count := expected_tenant_c_csv_upload_count_text::integer;

  if expected_tenant_b_csv_upload_count < 0 or expected_tenant_c_csv_upload_count < 0 then
    raise exception 'STOP: expected csv upload counts must be zero or greater';
  end if;

  if (
    select count(*)
    from public.companies
    where id = tenant_b_company_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_COMPANY'
      and status = 'trial'
  ) <> 1 then
    raise exception 'STOP: Tenant B company cleanup target mismatch';
  end if;

  if (
    select count(*)
    from public.companies
    where id = tenant_c_company_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_COMPANY'
      and status = 'trial'
  ) <> 1 then
    raise exception 'STOP: Tenant C company cleanup target mismatch';
  end if;

  if (
    select count(*)
    from public.workspaces
    where id = tenant_b_workspace_id
      and company_id = tenant_b_company_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_WORKSPACE'
      and status = 'active'
  ) <> 1 then
    raise exception 'STOP: Tenant B workspace cleanup target mismatch';
  end if;

  if (
    select count(*)
    from public.workspaces
    where id = tenant_c_workspace_id
      and company_id = tenant_c_company_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_WORKSPACE'
      and status = 'active'
  ) <> 1 then
    raise exception 'STOP: Tenant C workspace cleanup target mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = test_auth_user_id
      and company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
      and role in ('owner', 'admin', 'member', 'viewer')
  ) <> 1 then
    raise exception 'STOP: Tenant B test profile cleanup target mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and id <> test_auth_user_id
  ) <> 0 then
    raise exception 'STOP: unexpected profile exists in Tenant B cleanup target';
  end if;

  if (
    select count(*)
    from public.profiles
    where company_id = tenant_c_company_id
       or workspace_id = tenant_c_workspace_id
  ) <> 0 then
    raise exception 'STOP: unexpected profile exists in Tenant C cleanup target';
  end if;

  if (
    select count(*)
    from public.csv_uploads
    where company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and (file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%' or checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%')
  ) <> expected_tenant_b_csv_upload_count then
    raise exception 'STOP: Tenant B csv_uploads cleanup count mismatch';
  end if;

  if (
    select count(*)
    from public.csv_uploads
    where company_id = tenant_c_company_id
      and workspace_id = tenant_c_workspace_id
      and (file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%' or checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%')
  ) <> expected_tenant_c_csv_upload_count then
    raise exception 'STOP: Tenant C csv_uploads cleanup count mismatch';
  end if;

  if exists (
    select 1
    from public.csv_uploads
    where (
        (company_id = tenant_b_company_id and workspace_id = tenant_b_workspace_id)
        or (company_id = tenant_c_company_id and workspace_id = tenant_c_workspace_id)
      )
      and not (file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%' or checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%')
  ) then
    raise exception 'STOP: non-marker csv_uploads row exists in cleanup target tenant';
  end if;
end $$;

delete from public.csv_uploads
where (
    (company_id = '<tenant-b-company-id>'::uuid and workspace_id = '<tenant-b-workspace-id>'::uuid)
    or (company_id = '<tenant-c-company-id>'::uuid and workspace_id = '<tenant-c-workspace-id>'::uuid)
  )
  and (file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%' or checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%');

delete from public.profiles
where id = '<test-auth-user-id>'::uuid
  and company_id = '<tenant-b-company-id>'::uuid
  and workspace_id = '<tenant-b-workspace-id>'::uuid
  and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER';

delete from public.workspaces
where (
    id = '<tenant-b-workspace-id>'::uuid
    and company_id = '<tenant-b-company-id>'::uuid
    and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_WORKSPACE'
  )
  or (
    id = '<tenant-c-workspace-id>'::uuid
    and company_id = '<tenant-c-company-id>'::uuid
    and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_WORKSPACE'
  );

delete from public.companies
where (
    id = '<tenant-b-company-id>'::uuid
    and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_COMPANY'
    and status = 'trial'
  )
  or (
    id = '<tenant-c-company-id>'::uuid
    and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_COMPANY'
    and status = 'trial'
  );

do $$
declare
  test_auth_user_id uuid := '<test-auth-user-id>'::uuid;
  tenant_b_company_id uuid := '<tenant-b-company-id>'::uuid;
  tenant_b_workspace_id uuid := '<tenant-b-workspace-id>'::uuid;
  tenant_c_company_id uuid := '<tenant-c-company-id>'::uuid;
  tenant_c_workspace_id uuid := '<tenant-c-workspace-id>'::uuid;
begin
  if exists (
    select 1
    from public.csv_uploads
    where file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%'
       or checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%'
       or company_id in (tenant_b_company_id, tenant_c_company_id)
       or workspace_id in (tenant_b_workspace_id, tenant_c_workspace_id)
  ) then
    raise exception 'STOP: cleanup residue remains in csv_uploads';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = test_auth_user_id
       or company_id in (tenant_b_company_id, tenant_c_company_id)
       or workspace_id in (tenant_b_workspace_id, tenant_c_workspace_id)
       or name like 'GUGUMO_DELETE_GATE_E2E_20260713%'
  ) then
    raise exception 'STOP: cleanup residue remains in profiles';
  end if;

  if exists (
    select 1
    from public.workspaces
    where id in (tenant_b_workspace_id, tenant_c_workspace_id)
       or company_id in (tenant_b_company_id, tenant_c_company_id)
       or name like 'GUGUMO_DELETE_GATE_E2E_20260713%'
  ) then
    raise exception 'STOP: cleanup residue remains in workspaces';
  end if;

  if exists (
    select 1
    from public.companies
    where id in (tenant_b_company_id, tenant_c_company_id)
       or name like 'GUGUMO_DELETE_GATE_E2E_20260713%'
  ) then
    raise exception 'STOP: cleanup residue remains in companies';
  end if;
end $$;

commit;
