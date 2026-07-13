-- TEMPLATE: GUGUMO DELETE Gate E2E Tenant B excluded row reseed.
-- DO NOT RUN UNTIL VALUES REVIEWED.
-- Confirm Project ID before use: annvqxnupddnozyghqdw.
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- Use a new positive bigint <new-tenant-b-excluded-upload-id> each time. This template stops if the id already exists.

begin;

do $$
declare
  confirmed_project_id text := '<confirmed-project-id>';
  expected_project_id constant text := 'annvqxnupddnozyghqdw';
  test_auth_user_id_text text := '<test-auth-user-id>';
  tenant_b_company_id_text text := '<tenant-b-company-id>';
  tenant_b_workspace_id_text text := '<tenant-b-workspace-id>';
  expected_current_role text := '<expected-current-role>';
  new_upload_id_text text := '<new-tenant-b-excluded-upload-id>';
  reseed_label text := '<reseed-label>';
  placeholder_values text[];
  test_auth_user_id uuid;
  tenant_b_company_id uuid;
  tenant_b_workspace_id uuid;
  new_upload_id bigint;
begin
  placeholder_values := array[
    confirmed_project_id,
    test_auth_user_id_text,
    tenant_b_company_id_text,
    tenant_b_workspace_id_text,
    expected_current_role,
    new_upload_id_text,
    reseed_label
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
    raise exception 'STOP: replace all placeholders and blank values before reseeding excluded row';
  end if;

  if expected_current_role not in ('owner', 'admin', 'member', 'viewer') then
    raise exception 'STOP: expected current role must be owner, admin, member, or viewer';
  end if;

  if reseed_label !~ '^[a-z0-9_]+$' then
    raise exception 'STOP: reseed label must contain only lowercase letters, digits, and underscores';
  end if;

  test_auth_user_id := test_auth_user_id_text::uuid;
  tenant_b_company_id := tenant_b_company_id_text::uuid;
  tenant_b_workspace_id := tenant_b_workspace_id_text::uuid;
  new_upload_id := new_upload_id_text::bigint;

  if new_upload_id <= 0 then
    raise exception 'STOP: new upload id must be a positive bigint';
  end if;

  if exists (select 1 from public.csv_uploads where id = new_upload_id) then
    raise exception 'STOP: new upload id already exists';
  end if;

  if (
    select count(*)
    from public.profiles
    where id = test_auth_user_id
      and company_id = tenant_b_company_id
      and workspace_id = tenant_b_workspace_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
      and role = expected_current_role
  ) <> 1 then
    raise exception 'STOP: expected test profile/current role mismatch before reseed';
  end if;

  if (
    select count(*)
    from public.workspaces
    where id = tenant_b_workspace_id
      and company_id = tenant_b_company_id
      and name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_WORKSPACE'
      and status = 'active'
  ) <> 1 then
    raise exception 'STOP: Tenant B workspace mismatch before reseed';
  end if;
end $$;

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
) values (
  '<new-tenant-b-excluded-upload-id>'::bigint,
  'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_RESEEDED_<reseed-label>.csv',
  '[{"物件コード":"DELETE-GATE-B-RESEEDED","物件名":"DELETE GATE TEST RESEEDED","物件掲載":"掲載","住戸名寄せ点数":"0","所属基準値":"第2基準","競合物件数(合計)":"0","合計一覧PV(合計)":"0","合計詳細PV(合計)":"0","問い合わせ(合計)":"0","掲載日数(日)(合計)":"1","物件詳細PV(一日当たり)":"0"}]'::jsonb,
  '<tenant-b-company-id>'::uuid,
  '<tenant-b-workspace-id>'::uuid,
  '<test-auth-user-id>'::uuid,
  date '2026-07-13',
  'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_RESEEDED_<reseed-label>_CHECKSUM',
  'excluded',
  now(),
  '<test-auth-user-id>'::uuid,
  now(),
  now()
);

do $$
begin
  if (
    select count(*)
    from public.csv_uploads
    where id = '<new-tenant-b-excluded-upload-id>'::bigint
      and company_id = '<tenant-b-company-id>'::uuid
      and workspace_id = '<tenant-b-workspace-id>'::uuid
      and uploaded_by = '<test-auth-user-id>'::uuid
      and status = 'excluded'
      and excluded_at is not null
      and excluded_by = '<test-auth-user-id>'::uuid
      and file_name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_RESEEDED_<reseed-label>.csv'
  ) <> 1 then
    raise exception 'STOP: reseeded excluded row count mismatch';
  end if;
end $$;

commit;
