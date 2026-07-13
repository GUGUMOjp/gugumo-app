-- GUGUMO DELETE Gate E2E test data verification
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Read-only. Replace placeholders in SQL Editor only.

with inputs as (
  select
    '<confirmed-project-id>'::text as confirmed_project_id,
    'annvqxnupddnozyghqdw'::text as expected_project_id,
    '<test-auth-user-id>'::uuid as test_auth_user_id,
    '<tenant-b-company-id>'::uuid as tenant_b_company_id,
    '<tenant-b-workspace-id>'::uuid as tenant_b_workspace_id,
    '<tenant-b-active-upload-id>'::bigint as tenant_b_active_upload_id,
    '<tenant-b-excluded-upload-id>'::bigint as tenant_b_excluded_upload_id,
    '<tenant-c-company-id>'::uuid as tenant_c_company_id,
    '<tenant-c-workspace-id>'::uuid as tenant_c_workspace_id,
    '<tenant-c-excluded-upload-id>'::bigint as tenant_c_excluded_upload_id
),
verify_rows as (
  select
    'project_confirmation' as check_name,
    case when confirmed_project_id = expected_project_id then 'PASS' else 'STOP' end as result_status,
    1::bigint as item_count,
    'Confirm Dashboard project is GUGUMOjp''s Project / annvqxnupddnozyghqdw.' as detail
  from inputs

  union all

  select
    'tenant_b_company' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Tenant B test company must exist exactly once with the DELETE Gate marker.' as detail
  from public.companies c
  join inputs i on c.id = i.tenant_b_company_id
  where c.name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_COMPANY'
    and c.status = 'trial'

  union all

  select
    'tenant_b_workspace' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Tenant B workspace must belong to Tenant B company.' as detail
  from public.workspaces w
  join inputs i
    on w.id = i.tenant_b_workspace_id
   and w.company_id = i.tenant_b_company_id
  where w.name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_WORKSPACE'
    and w.status = 'active'

  union all

  select
    'tenant_b_profile' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'The test Auth user must have exactly one Tenant B profile with initial/current role owner/admin/member/viewer.' as detail
  from public.profiles p
  join inputs i
    on p.id = i.test_auth_user_id
   and p.company_id = i.tenant_b_company_id
   and p.workspace_id = i.tenant_b_workspace_id
  where p.name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'
    and p.role in ('owner', 'admin', 'member', 'viewer')

  union all

  select
    'tenant_b_profile_initial_owner' as check_name,
    case when count(*) = 1 then 'PASS' else 'REVIEW' end as result_status,
    count(*)::bigint as item_count,
    'Immediately after create, role should be owner. Later phases may intentionally switch role.' as detail
  from public.profiles p
  join inputs i
    on p.id = i.test_auth_user_id
   and p.company_id = i.tenant_b_company_id
   and p.workspace_id = i.tenant_b_workspace_id
  where p.role = 'owner'

  union all

  select
    'tenant_c_company' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Tenant C cross-tenant test company must exist exactly once.' as detail
  from public.companies c
  join inputs i on c.id = i.tenant_c_company_id
  where c.name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_COMPANY'
    and c.status = 'trial'

  union all

  select
    'tenant_c_workspace' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Tenant C workspace must belong to Tenant C company.' as detail
  from public.workspaces w
  join inputs i
    on w.id = i.tenant_c_workspace_id
   and w.company_id = i.tenant_c_company_id
  where w.name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_WORKSPACE'
    and w.status = 'active'

  union all

  select
    'tenant_c_profile_absence' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'The test Auth user must not have a Tenant C profile.' as detail
  from public.profiles p
  join inputs i
    on p.id = i.test_auth_user_id
   and p.company_id = i.tenant_c_company_id
   and p.workspace_id = i.tenant_c_workspace_id

  union all

  select
    'tenant_b_active_upload' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Tenant B active row must exist for active-row DELETE denial.' as detail
  from public.csv_uploads u
  join inputs i
    on u.id = i.tenant_b_active_upload_id
   and u.company_id = i.tenant_b_company_id
   and u.workspace_id = i.tenant_b_workspace_id
   and u.uploaded_by = i.test_auth_user_id
  where u.status = 'active'
    and u.file_name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_ACTIVE.csv'
    and u.checksum = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_ACTIVE_CHECKSUM'

  union all

  select
    'tenant_b_excluded_upload' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Tenant B excluded row must exist for own-tenant DELETE tests.' as detail
  from public.csv_uploads u
  join inputs i
    on u.id = i.tenant_b_excluded_upload_id
   and u.company_id = i.tenant_b_company_id
   and u.workspace_id = i.tenant_b_workspace_id
   and u.uploaded_by = i.test_auth_user_id
  where u.status = 'excluded'
    and u.excluded_at is not null
    and u.excluded_by = i.test_auth_user_id
    and u.file_name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_EXCLUDED.csv'
    and u.checksum = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_EXCLUDED_CHECKSUM'

  union all

  select
    'tenant_c_excluded_upload' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Tenant C excluded row must exist for cross-tenant DELETE denial.' as detail
  from public.csv_uploads u
  join inputs i
    on u.id = i.tenant_c_excluded_upload_id
   and u.company_id = i.tenant_c_company_id
   and u.workspace_id = i.tenant_c_workspace_id
  where u.status = 'excluded'
    and u.file_name = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_EXCLUDED.csv'
    and u.checksum = 'GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_EXCLUDED_CHECKSUM'

  union all

  select
    'unexpected_marker_rows' as check_name,
    case when marker_count = 0 then 'PASS' else 'FAIL' end as result_status,
    marker_count::bigint as item_count,
    'No marker rows may exist outside the placeholder Tenant B/C IDs.' as detail
  from (
    select count(*) as marker_count
    from public.csv_uploads u
    cross join inputs i
    where (u.file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%' or u.checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%')
      and not (
        (u.company_id = i.tenant_b_company_id and u.workspace_id = i.tenant_b_workspace_id)
        or (u.company_id = i.tenant_c_company_id and u.workspace_id = i.tenant_c_workspace_id)
      )
  ) residue
)
select check_name, result_status, item_count, detail
from verify_rows
order by
  case check_name
    when 'project_confirmation' then 10
    when 'tenant_b_company' then 20
    when 'tenant_b_workspace' then 30
    when 'tenant_b_profile' then 40
    when 'tenant_b_profile_initial_owner' then 50
    when 'tenant_b_active_upload' then 60
    when 'tenant_b_excluded_upload' then 70
    when 'tenant_c_company' then 80
    when 'tenant_c_workspace' then 90
    when 'tenant_c_profile_absence' then 100
    when 'tenant_c_excluded_upload' then 110
    when 'unexpected_marker_rows' then 120
    else 999
  end;
