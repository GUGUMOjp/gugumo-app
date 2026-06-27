# Tenant Base SQL Draft v1.0

## 1. 目的

Company / Workspace / Profile をMulti Tenantの前提テーブルとして作成するSQL Draft。

このSQLはまだ実行しない。

DB変更・Supabase設定変更・RLS有効化は、別Sprintで実施判断する。

---

## 2. 作成予定テーブル

### companies

- id uuid primary key
- name text not null
- status text not null
- plan text
- created_at timestamptz default now()

status check案:

- active
- trial
- suspended
- cancelled

```sql
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null,
  plan text,
  created_at timestamptz default now(),
  constraint companies_status_check
    check (status in ('active', 'trial', 'suspended', 'cancelled'))
);
```

### workspaces

- id uuid primary key
- company_id uuid not null references public.companies(id) on delete cascade
- name text not null
- status text not null
- created_at timestamptz default now()

status check案:

- active
- archived

```sql
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  status text not null,
  created_at timestamptz default now(),
  constraint workspaces_status_check
    check (status in ('active', 'archived'))
);
```

### profiles

- id uuid primary key references auth.users(id) on delete cascade
- company_id uuid not null references public.companies(id)
- workspace_id uuid not null references public.workspaces(id)
- email text
- name text
- role text not null
- created_at timestamptz default now()

role check案:

- owner
- admin
- member
- viewer

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  workspace_id uuid not null references public.workspaces(id),
  email text,
  name text,
  role text not null,
  created_at timestamptz default now(),
  constraint profiles_role_check
    check (role in ('owner', 'admin', 'member', 'viewer'))
);
```

---

## 3. Index SQL

```sql
create index if not exists workspaces_company_id_idx
  on public.workspaces (company_id);

create index if not exists profiles_company_id_idx
  on public.profiles (company_id);

create index if not exists profiles_workspace_id_idx
  on public.profiles (workspace_id);

create index if not exists profiles_role_idx
  on public.profiles (role);
```

---

## 4. 整合性注意

`profiles.company_id` と `workspaces.company_id` の不一致を防ぐ必要がある。

初期はアプリ / Repositoryで以下を担保する。

- Profile作成時に、指定されたWorkspaceが同じCompanyに属していることを確認する
- CurrentWorkspaceContext取得時に、WorkspaceとCompanyの紐付けが一致することを確認する

将来的にはDB制約またはtrigger / RPCを検討する。

---

## 5. RLS Draft

このRLS SQLはまだ実行しない。

RLS有効化前に、Authユーザー、Company、Workspace、Profileの初期データを整える。

### RLS有効化SQL

```sql
alter table public.companies enable row level security;
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
```

### users can select own company

```sql
create policy "Users can select own company"
on public.companies
for select
using (
  id in (
    select company_id
    from public.profiles
    where id = auth.uid()
  )
);
```

### users can select own workspace

```sql
create policy "Users can select own workspace"
on public.workspaces
for select
using (
  id in (
    select workspace_id
    from public.profiles
    where id = auth.uid()
  )
);
```

### users can select own profile

```sql
create policy "Users can select own profile"
on public.profiles
for select
using (
  id = auth.uid()
);
```

owner / admin権限は後続Sprintで拡張する。

---

## 6. Rollback SQL

削除順に注意する。

既存データがある場合は `drop table` 禁止。

Seedだけを戻す場合は、Schema rollbackではなく `docs/17_TenantSeedPlan.md` のSeed rollbackを使う。

```sql
drop table if exists public.profiles;
drop table if exists public.workspaces;
drop table if exists public.companies;
```

`profiles` は `companies / workspaces / auth.users` を参照するため先に削除する。

`workspaces` は `companies` を参照するため、`companies` より先に削除する。

---

## 7. 実行前チェックリスト

- 開発Supabaseであること
- 本番環境で直接実行しない
- auth.usersに開発ユーザーがあること
- 既存profiles / companies / workspacesがない、または衝突しないこと
- snapshots SQLより先に実行すること
- RLSは同時にONにしないこと
- 初期Company / Workspace / Profile seed手順を別Sprintで確認すること
- 開発用seed手順は `docs/17_TenantSeedPlan.md` を参照すること
- Schema rollbackとSeed rollbackを混同しないこと

---

## 8. 今回の判断

このSprintではSQLをdocs化するだけに留める。

Supabaseでの実行可否は、CTOレビュー後に別Sprintで判断する。

現時点では、SQL実行はまだ不可。
