# Tenant Seed Plan v1.0

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
);
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
);
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
);
```

---

## 5. 確認SQL

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

### profile.company_id と workspace.company_id の整合性確認

```sql
select
  p.id as profile_id,
  p.company_id as profile_company_id,
  p.workspace_id,
  w.company_id as workspace_company_id,
  p.company_id = w.company_id as company_matches
from public.profiles p
join public.workspaces w on w.id = p.workspace_id
where p.id = '<AUTH_USER_ID>';
```

---

## 6. Rollback SQL

削除順に注意する。

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

---

## 7. 注意事項

- auth.users はSQLで直接作らず、Supabase Auth UIまたはAuth APIで作る
- profiles.id は auth.users.id と一致させる
- 本番では個別会社ごとに正式データを作る
- seed後にCurrentWorkspaceContextが通るか確認する
- RLSはseedと同時に有効化しない
- 既存データがある場合は、同じIDやemailが衝突しないことを確認する

---

## 8. 今回の判断

このSprintではSeed手順をdocs化するだけに留める。

Supabaseでの実行可否は、CTOレビュー後に別Sprintで判断する。

現時点では、SQL実行はまだ不可。
