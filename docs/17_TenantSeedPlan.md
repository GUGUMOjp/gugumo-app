# Tenant Seed Plan v1.1

## 1. 目的

開発環境でCompany / Workspace / Profileの初期データを作成し、CurrentWorkspaceContextとRLSの前提を満たす。

このSQLはまだ実行しない。

DB変更・Supabase設定変更・RLS有効化は、別Sprintで実施判断する。

---

## 2. 前提

- Supabase Authで開発ユーザーを作成済みであること
- `auth.users.id` を確認できること
- `companies / workspaces / profiles` テーブル作成後に実施すること
- 本番環境では直接実行しないこと
- RLSはSeed前にONにしないこと
- RLS有効化はServer Auth方針確定後の別Sprintで実施すること

---

## 3. 初期データ案

### Company

- name: GUGUMO Demo Company
- status: trial
- plan: beta

### Workspace

- name: Demo Workspace
- status: active

### Profile

- id: auth.users.id
- company_id: 作成したcompany id
- workspace_id: 作成したworkspace id
- email: 開発ユーザーemail
- name: 開発管理者
- role: owner

---

## 4. Seed SQL Draft

以下は実行前に必ず値を置き換える。

- `<AUTH_USER_ID>`
- `<DEV_EMAIL>`
- `<COMPANY_ID>`
- `<WORKSPACE_ID>`

### 冪等性方針

Seed SQLは `on conflict (id) do update` を採用する。

理由:

- 開発seedを再実行しても同じIDのデータを最新の定義へ揃えられる
- `do nothing` では、name / status / role を変更したい場合に古い値が残る
- 固定IDを使う前提では、意図しない重複作成よりも上書き更新の方が検証しやすい

ただし、本番seedでは会社ごとに正式データを作るため、この開発用SQLを流用しない。

---

## 5. 実行前環境確認

以下を必ず目視確認する。

- Supabase project name
- Supabase project URL
- 開発環境であること
- 本番環境ではないこと
- `GUGUMO Demo Company` が本番に入らないこと

```sql
select current_database();
```

```sql
select id, name, status, plan
from public.companies
where name = 'GUGUMO Demo Company';
```

既に本番相当のデータが存在する環境では、このSeed SQLを実行しない。

### Step 1: auth.users.idを確認

auth.usersはSQLで直接作らず、Supabase Auth UIまたはAuth APIで作成する。

作成後、対象ユーザーの `auth.users.id` を確認する。

```sql
select id, email, created_at
from auth.users
where email = '<DEV_EMAIL>';
```

### Step 2: company insert

```sql
insert into public.companies (
  id,
  name,
  status,
  plan
) values (
  '<COMPANY_ID>',
  'GUGUMO Demo Company',
  'trial',
  'beta'
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  plan = excluded.plan;
```

### Step 3: workspace insert

```sql
insert into public.workspaces (
  id,
  company_id,
  name,
  status
) values (
  '<WORKSPACE_ID>',
  '<COMPANY_ID>',
  'Demo Workspace',
  'active'
)
on conflict (id) do update set
  company_id = excluded.company_id,
  name = excluded.name,
  status = excluded.status;
```

### Step 4: profile insert

```sql
insert into public.profiles (
  id,
  company_id,
  workspace_id,
  email,
  name,
  role
) values (
  '<AUTH_USER_ID>',
  '<COMPANY_ID>',
  '<WORKSPACE_ID>',
  '<DEV_EMAIL>',
  '開発管理者',
  'owner'
)
on conflict (id) do update set
  company_id = excluded.company_id,
  workspace_id = excluded.workspace_id,
  email = excluded.email,
  name = excluded.name,
  role = excluded.role;
```

---

## 6. Seed後確認SQL

### companies確認

```sql
select id, name, status, plan, created_at
from public.companies
where id = '<COMPANY_ID>';
```

### workspaces確認

```sql
select id, company_id, name, status, created_at
from public.workspaces
where id = '<WORKSPACE_ID>';
```

### profiles確認

```sql
select id, company_id, workspace_id, email, name, role, created_at
from public.profiles
where id = '<AUTH_USER_ID>';
```

### companies / workspaces / profiles の整合性確認

```sql
select
  c.id as company_id,
  c.name as company_name,
  c.status as company_status,
  w.id as workspace_id,
  w.name as workspace_name,
  w.status as workspace_status,
  p.id as profile_id,
  p.email,
  p.name as profile_name,
  p.role,
  p.company_id = w.company_id as company_matches
from public.profiles p
join public.workspaces w on w.id = p.workspace_id
join public.companies c on c.id = p.company_id
where p.id = '<AUTH_USER_ID>';
```

### owner profile確認

```sql
select id, email, role
from public.profiles
where id = '<AUTH_USER_ID>'
  and role = 'owner';
```

### CurrentWorkspaceContext前提確認

```sql
select
  p.id as user_id,
  p.email,
  p.name as profile_name,
  p.role,
  c.id as company_id,
  c.name as company_name,
  w.id as workspace_id,
  w.name as workspace_name,
  w.company_id = c.id as workspace_company_matches
from public.profiles p
join public.companies c on c.id = p.company_id
join public.workspaces w on w.id = p.workspace_id
where p.id = '<AUTH_USER_ID>';
```

確認ポイント:

- `role` が `owner` であること
- `workspace_company_matches` が `true` であること
- `company_name` と `workspace_name` が取得できること
- CurrentWorkspaceContextに必要な `userId / email / profileName / companyId / companyName / workspaceId / workspaceName / role` が揃うこと

---

## 7. Rollback SQL

Seed rollbackとSchema rollbackは明確に分ける。

### Seed rollback

開発seedだけを戻す場合はこちらを使う。

```sql
delete from public.profiles
where id = '<AUTH_USER_ID>';

delete from public.workspaces
where id = '<WORKSPACE_ID>';

delete from public.companies
where id = '<COMPANY_ID>';
```

`profiles` は `companies / workspaces / auth.users` を参照するため先に削除する。

`workspaces` は `companies` を参照するため、`companies` より先に削除する。

### Schema rollback

既存データがある場合は `drop table` 禁止。

テーブル自体を削除する場合は、`docs/16_TenantBaseSqlDraft.md` のSchema rollbackを参照する。

本番相当データや他ユーザーのデータが入っている環境では、Schema rollbackを実行しない。

---

## 8. RLS前提の注意

- Seed前にRLSをONにしない
- Seedと同時にRLSを有効化しない
- RLS有効化は別Sprintで実施する
- Server Auth方針確定後にRLSへ進む
- RLS有効化後は、profiles / companies / workspaces のselect policyがないとCurrentWorkspaceContextが失敗する

---

## 9. 注意事項

- auth.users はSQLで直接作らず、Supabase Auth UIまたはAuth APIで作る
- profiles.id は auth.users.id と一致させる
- 本番では個別会社ごとに正式データを作る
- seed後にCurrentWorkspaceContextが通るか確認する
- RLSはseedと同時に有効化しない
- 既存データがある場合は、同じIDやemailが衝突しないことを確認する
- demo seed値を本番環境へ投入しない

---

## 10. 今回の判断

このSprintではSeed手順をdocs化するだけに留める。

Supabaseでの実行可否は、CTOレビュー後に別Sprintで判断する。

現時点では、SQL実行はまだ不可。
