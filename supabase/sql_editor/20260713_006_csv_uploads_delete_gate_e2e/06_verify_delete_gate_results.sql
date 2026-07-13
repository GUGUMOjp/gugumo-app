-- TEMPLATE: GUGUMO DELETE Gate E2E results verification
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Read-only. Replace placeholders in SQL Editor only.
--
-- For rows that are not relevant to the current phase, set expected_state to skip and upload_id to 0.
-- expected_state values: present, absent, skip.

with inputs as (
  select
    '<confirmed-project-id>'::text as confirmed_project_id,
    'annvqxnupddnozyghqdw'::text as expected_project_id,
    '<test-auth-user-id>'::uuid as test_auth_user_id,
    '<tenant-b-company-id>'::uuid as tenant_b_company_id,
    '<tenant-b-workspace-id>'::uuid as tenant_b_workspace_id,
    '<tenant-c-company-id>'::uuid as tenant_c_company_id,
    '<tenant-c-workspace-id>'::uuid as tenant_c_workspace_id,
    '<expected-current-role>'::text as expected_current_role
),
expected_uploads as (
  select *
  from (values
    ('tenant_b_active_row', '<tenant-b-active-upload-id>', 'tenant_b', 'active', '<tenant-b-active-expected-state>'),
    ('owner_deleted_row', '<owner-deleted-upload-id>', 'tenant_b', 'excluded', '<owner-deleted-expected-state>'),
    ('admin_deleted_row', '<admin-deleted-upload-id>', 'tenant_b', 'excluded', '<admin-deleted-expected-state>'),
    ('member_denied_row', '<member-denied-upload-id>', 'tenant_b', 'excluded', '<member-denied-expected-state>'),
    ('viewer_denied_row', '<viewer-denied-upload-id>', 'tenant_b', 'excluded', '<viewer-denied-expected-state>'),
    ('cross_tenant_row', '<tenant-c-excluded-upload-id>', 'tenant_c', 'excluded', '<tenant-c-excluded-expected-state>'),
    ('anonymous_target_row', '<anonymous-target-upload-id>', '<anonymous-target-tenant>', 'excluded', '<anonymous-target-expected-state>')
  ) as v(row_label, upload_id_text, tenant_key, expected_status, expected_state)
),
typed_expected_uploads as (
  select
    row_label,
    case when expected_state = 'skip' then null else upload_id_text::bigint end as upload_id,
    tenant_key,
    expected_status,
    expected_state
  from expected_uploads
),
row_results as (
  select
    e.row_label,
    e.expected_state,
    e.expected_status,
    e.tenant_key,
    count(u.id)::bigint as item_count,
    bool_or(
      case
        when e.tenant_key = 'tenant_b' then u.company_id = i.tenant_b_company_id and u.workspace_id = i.tenant_b_workspace_id
        when e.tenant_key = 'tenant_c' then u.company_id = i.tenant_c_company_id and u.workspace_id = i.tenant_c_workspace_id
        else false
      end
    ) as tenant_matches,
    bool_or(u.status = e.expected_status) as status_matches
  from typed_expected_uploads e
  cross join inputs i
  left join public.csv_uploads u
    on u.id = e.upload_id
  where e.expected_state <> 'skip'
  group by e.row_label, e.expected_state, e.expected_status, e.tenant_key
),
verify_rows as (
  select
    'project_confirmation' as check_name,
    case when confirmed_project_id = expected_project_id then 'PASS' else 'FAIL' end as result_status,
    1::bigint as item_count,
    'Confirm Dashboard project is GUGUMOjp''s Project / annvqxnupddnozyghqdw.' as detail
  from inputs

  union all

  select
    'expected_state_placeholders' as check_name,
    case
      when exists (
        select 1
        from expected_uploads
        where expected_state not in ('present', 'absent', 'skip')
           or tenant_key not in ('tenant_b', 'tenant_c')
      ) then 'FAIL'
      else 'PASS'
    end as result_status,
    (
      select count(*)
      from expected_uploads
      where expected_state not in ('present', 'absent', 'skip')
         or tenant_key not in ('tenant_b', 'tenant_c')
    )::bigint as item_count,
    'Expected states must be present, absent, or skip. Tenant key must be tenant_b or tenant_c.' as detail

  union all

  select
    'test_profile_current_role' as check_name,
    case when count(*) = 1 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'Test profile must be in Tenant B with the expected current role.' as detail
  from public.profiles p
  join inputs i
    on p.id = i.test_auth_user_id
   and p.company_id = i.tenant_b_company_id
   and p.workspace_id = i.tenant_b_workspace_id
   and p.role = i.expected_current_role
   and p.name = 'GUGUMO_DELETE_GATE_E2E_20260713_TEST_USER'

  union all

  select
    'upload_expectation_' || row_label as check_name,
    case
      when expected_state = 'present' and item_count = 1 and tenant_matches and status_matches then 'PASS'
      when expected_state = 'absent' and item_count = 0 then 'PASS'
      else 'FAIL'
    end as result_status,
    item_count,
    concat('expected_state=', expected_state, '; expected_status=', expected_status, '; tenant=', tenant_key) as detail
  from row_results

  union all

  select
    'unexpected_marker_rows_outside_test_tenants' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as result_status,
    count(*)::bigint as item_count,
    'No DELETE Gate marker rows may exist outside the dedicated Tenant B/C placeholders.' as detail
  from public.csv_uploads u
  cross join inputs i
  where (u.file_name like 'GUGUMO_DELETE_GATE_E2E_20260713%' or u.checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%')
    and not (
      (u.company_id = i.tenant_b_company_id and u.workspace_id = i.tenant_b_workspace_id)
      or (u.company_id = i.tenant_c_company_id and u.workspace_id = i.tenant_c_workspace_id)
    )
)
select check_name, result_status, item_count, detail
from verify_rows
order by
  case
    when check_name = 'project_confirmation' then 10
    when check_name = 'expected_state_placeholders' then 20
    when check_name = 'test_profile_current_role' then 30
    when check_name like 'upload_expectation_tenant_b_active_row' then 40
    when check_name like 'upload_expectation_owner_deleted_row' then 50
    when check_name like 'upload_expectation_admin_deleted_row' then 60
    when check_name like 'upload_expectation_member_denied_row' then 70
    when check_name like 'upload_expectation_viewer_denied_row' then 80
    when check_name like 'upload_expectation_cross_tenant_row' then 90
    when check_name like 'upload_expectation_anonymous_target_row' then 100
    when check_name = 'unexpected_marker_rows_outside_test_tenants' then 110
    else 999
  end,
  check_name;
