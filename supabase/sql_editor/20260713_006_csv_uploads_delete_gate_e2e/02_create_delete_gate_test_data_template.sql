-- TEMPLATE: GUGUMO DELETE Gate E2E dedicated test data creation.
-- DO NOT RUN UNTIL VALUES REVIEWED.
-- Confirm Project ID before use: annvqxnupddnozyghqdw.
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- Replace placeholders in SQL Editor only. Do not save real UUIDs, emails, passwords, JWTs, API keys, or Service Role keys.
-- Auth user must be created manually in Supabase Dashboard before running this template.

begin;

do $$
declare
  confirmed_project_id text := '<confirmed-project-id>';
  expected_project_id constant text := 'annvqxnupddnozyghqdw';
  marker constant text := 'GUGUMO_DELETE_GATE_E2E_20260713';
  test_auth_user_id_text text := '<test-auth-user-id>';
  test_auth_user_email_placeholder text := '<test-auth-user-email-placeholder>';
  tenant_b_company_id_text text := '<tenant-b-company-id>';
  tenant_b_workspace_id_text text := '<tenant-b-workspace-id>';
  tenant_c_company_id_text text := '<tenant-c-company-id>';
  tenant_c_workspace_id_text text := '<tenant-c-workspace-id>';
  tenant_b_active_upload_id_text text := '<tenant-b-active-upload-id>';
  tenant_b_excluded_upload_id_text text := '<tenant-b-excluded-upload-id>';
  tenant_c_excluded_upload_id_text text := '<tenant-c-excluded-upload-id>';
  placeholder_values text[];
  test_auth_user_id uuid;
  tenant_b_company_id uuid;
  tenant_b_workspace_id uuid;
  tenant_c_company_id uuid;
  tenant_c_workspace_id uuid;
  tenant_b_active_upload_id bigint;
  tenant_b_excluded_upload_id bigint;
  tenant_c_excluded_upload_id bigint;
begin
  placeholder_values := array[
    confirmed_project_id,
    test_auth_user_id_text,
    test_auth_user_email_placeholder,
    tenant_b_company_id_text,
    tenant_b_workspace_id_text,
    tenant_c_company_id_text,
    tenant_c_workspace_id_text,
    tenant_b_active_upload_id_text,
    tenant_b_excluded_upload_id_text,
    tenant_c_excluded_upload_id_text
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
    raise exception 'STOP: replace all placeholders and blank values before creating DELETE Gate test data';
  end if;

  test_auth_user_id := test_auth_user_id_text::uuid;
  tenant_b_company_id := tenant_b_company_id_text::uuid;
  tenant_b_workspace_id := tenant_b_workspace_id_text::uuid;
  tenant_c_company_id := tenant_c_company_id_text::uuid;
  tenant_c_workspace_id := tenant_c_workspace_id_text::uuid;
  tenant_b_active_upload_id := tenant_b_active_upload_id_text::bigint;
  tenant_b_excluded_upload_id := tenant_b_excluded_upload_id_text::bigint;
  tenant_c_excluded_upload_id := tenant_c_excluded_upload_id_text::bigint;

  if tenant_b_active_upload_id <= 0
     or tenant_b_excluded_upload_id <= 0
     or tenant_c_excluded_upload_id <= 0 then
    raise exception 'STOP: csv_uploads test ids must be positive bigint values';
  end if;

  if cardinality(array[
    tenant_b_active_upload_id,
    tenant_b_excluded_upload_id,
    tenant_c_excluded_upload_id
  ]) <> (
    select count(distinct upload_id)
    from unnest(array[
      tenant_b_active_upload_id,
      tenant_b_excluded_upload_id,
      tenant_c_excluded_upload_id
    ]) as ids(upload_id)
  ) then
    raise exception 'STOP: csv_uploads test ids must be unique';
  end if;

  if (select count(*) from auth.users where id = test_auth_user_id) <> 1 then
    raise exception 'STOP: expected one existing DELETE Gate test Auth user created manually in Supabase Dashboard';
  end if;

  if exists (select 1 from public.profiles where id = test_auth_user_id) then
    raise exception 'STOP: DELETE Gate test Auth user already has a profile';
  end if;

  if exists (select 1 from public.companies where id in (tenant_b_company_id, tenant_c_company_id)) then
    raise exception 'STOP: one or more test company ids already exist';
  end if;

  if exists (select 1 from public.workspaces where id in (tenant_b_workspace_id, tenant_c_workspace_id)) then
    raise exception 'STOP: one or more test workspace ids already exist';
  end if;

  if exists (
    select 1
    from public.csv_uploads
    where id in (tenant_b_active_upload_id, tenant_b_excluded_upload_id, tenant_c_excluded_upload_id)
  ) then
    raise exception 'STOP: one or more test csv_uploads ids already exist';
  end if;

  if exists (
    select 1 from public.companies where name like '%' || marker || '%'
    union all
    select 1 from public.workspaces where name like '%' || marker || '%'
    union all
    select 1 from public.profiles where name like '%' || marker || '%'
    union all
    select 1 from public.csv_uploads where file_name like '%' || marker || '%' or checksum like marker || '%'
  ) then
    raise exception 'STOP: DELETE Gate marker residue already exists; cleanup before creating new test data';
  end if;
end $$;

insert into public.companies (
  id,
  name,
  status,
  plan,
  created_at
) values
  (
    '<tenant-b-company-id>'::uuid,
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_COMPANY',
    'trial',
    'delete-gate-e2e',
    now()
  ),
  (
    '<tenant-c-company-id>'::uuid,
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_COMPANY',
    'trial',
    'delete-gate-e2e',
    now()
  );

insert into public.workspaces (
  id,
  company_id,
  name,
  status,
  created_at
) values
  (
    '<tenant-b-workspace-id>'::uuid,
    '<tenant-b-company-id>'::uuid,
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_WORKSPACE',
    'active',
    now()
  ),
  (
    '<tenant-c-workspace-id>'::uuid,
    '<tenant-c-company-id>'::uuid,
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_WORKSPACE',
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
  '<test-auth-user-id>'::uuid,
  '<tenant-b-company-id>'::uuid,
  '<tenant-b-workspace-id>'::uuid,
  '<test-auth-user-email-placeholder>',
  'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER',
  'owner',
  now()
);

insert into public.csv_uploads (
  id,
  file_name,
  file_data,
  company_id,
  workspace_id,
  uploaded_by,
  snapshot_date,
  checksum,
  status,
  excluded_at,
  excluded_by,
  uploaded_at,
  created_at
) values
  (
    '<tenant-b-active-upload-id>'::bigint,
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_ACTIVE.csv',
    '[{"物件コード":"DELETE-GATE-B-ACTIVE","物件名":"DELETE GATE TEST ACTIVE","物件掲載":"掲載","住戸名寄せ点数":"0","所属基準値":"第2基準","競合物件数(合計)":"0","合計一覧PV(合計)":"0","合計詳細PV(合計)":"0","問い合わせ(合計)":"0","掲載日数(日)(合計)":"1","物件詳細PV(一日当たり)":"0"}]'::jsonb,
    '<tenant-b-company-id>'::uuid,
    '<tenant-b-workspace-id>'::uuid,
    '<test-auth-user-id>'::uuid,
    date '2026-07-13',
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_ACTIVE_CHECKSUM',
    'active',
    null,
    null,
    now(),
    now()
  ),
  (
    '<tenant-b-excluded-upload-id>'::bigint,
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_EXCLUDED.csv',
    '[{"物件コード":"DELETE-GATE-B-EXCLUDED","物件名":"DELETE GATE TEST EXCLUDED","物件掲載":"掲載","住戸名寄せ点数":"0","所属基準値":"第2基準","競合物件数(合計)":"0","合計一覧PV(合計)":"0","合計詳細PV(合計)":"0","問い合わせ(合計)":"0","掲載日数(日)(合計)":"1","物件詳細PV(一日当たり)":"0"}]'::jsonb,
    '<tenant-b-company-id>'::uuid,
    '<tenant-b-workspace-id>'::uuid,
    '<test-auth-user-id>'::uuid,
    date '2026-07-13',
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_EXCLUDED_CHECKSUM',
    'excluded',
    now(),
    '<test-auth-user-id>'::uuid,
    now(),
    now()
  ),
  (
    '<tenant-c-excluded-upload-id>'::bigint,
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_EXCLUDED.csv',
    '[{"物件コード":"DELETE-GATE-C-EXCLUDED","物件名":"DELETE GATE TEST CROSS TENANT","物件掲載":"掲載","住戸名寄せ点数":"0","所属基準値":"第2基準","競合物件数(合計)":"0","合計一覧PV(合計)":"0","合計詳細PV(合計)":"0","問い合わせ(合計)":"0","掲載日数(日)(合計)":"1","物件詳細PV(一日当たり)":"0"}]'::jsonb,
    '<tenant-c-company-id>'::uuid,
    '<tenant-c-workspace-id>'::uuid,
    '<test-auth-user-id>'::uuid,
    date '2026-07-13',
    'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_EXCLUDED_CHECKSUM',
    'excluded',
    now(),
    '<test-auth-user-id>'::uuid,
    now(),
    now()
  );

do $$
declare
  test_auth_user_id uuid := '<test-auth-user-id>'::uuid;
  tenant_b_company_id uuid := '<tenant-b-company-id>'::uuid;
  tenant_b_workspace_id uuid := '<tenant-b-workspace-id>'::uuid;
  tenant_c_company_id uuid := '<tenant-c-company-id>'::uuid;
  tenant_c_workspace_id uuid := '<tenant-c-workspace-id>'::uuid;
begin
  if (select count(*) from public.companies where id in (tenant_b_company_id, tenant_c_company_id) and name like 'GUGUMO_DELETE_GATE_E2E_20260713%') <> 2 then
    raise exception 'STOP: post-create company count mismatch';
  end if;

  if (
    select count(*)
    from public.workspaces
    where (id = tenant_b_workspace_id and company_id = tenant_b_company_id)
       or (id = tenant_c_workspace_id and company_id = tenant_c_company_id)
  ) <> 2 then
    raise exception 'STOP: post-create workspace count mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = test_auth_user_id
      and company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and role = 'owner'
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
  ) <> 1 then
    raise exception 'STOP: post-create tenant B profile count mismatch';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = test_auth_user_id
      and company_id = tenant_c_company_id
      and workspace_id = tenant_c_workspace_id
  ) <> 0 then
    raise exception 'STOP: test user must not have a tenant C profile';
  end if;

  if (
    select count(*)
    from public.csv_uploads
    where company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and status = 'active'
      and file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%'
  ) <> 1 then
    raise exception 'STOP: post-create tenant B active upload count mismatch';
  end if;

  if (
    select count(*)
    from public.csv_uploads
    where company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and status = 'excluded'
      and file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%'
  ) <> 1 then
    raise exception 'STOP: post-create tenant B excluded upload count mismatch';
  end if;

  if (
    select count(*)
    from public.csv_uploads
    where company_id = tenant_c_company_id
      and workspace_id = tenant_c_workspace_id
      and status = 'excluded'
      and file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%'
  ) <> 1 then
    raise exception 'STOP: post-create tenant C excluded upload count mismatch';
  end if;
end $$;

commit;
