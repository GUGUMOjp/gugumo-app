# Snapshot Migration SQL Draft v1.1

## 0. 目的

このドキュメントは、`snapshots / snapshot_rows` 作成前に、実行予定SQLをレビューするための下書きである。

このSQLはまだ実行しない。

DB変更・Supabase設定変更・RLS有効化は、別Sprintで実施判断する。

---

## 1. 実行前確認SQL

以下は、migration実行前に既存テーブル・カラム・データ状態を確認するためのSQLである。

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads', 'snapshots', 'snapshot_rows')
order by table_name;
```

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('companies', 'workspaces', 'profiles')
  and column_name in ('id', 'company_id', 'workspace_id', 'role', 'status')
order by table_name, ordinal_position;
```

```sql
select count(*) as company_count from public.companies;
select count(*) as workspace_count from public.workspaces;
select count(*) as profile_count from public.profiles;
select count(*) as csv_upload_count from public.csv_uploads;
```

```sql
select id, company_id, workspace_id, role
from public.profiles
where company_id is null
   or workspace_id is null
   or role is null;
```

---

## 2. 制約案

以下は制約案であり、今回は実行しない。

```sql
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'admin', 'member', 'viewer'));

alter table public.companies
  add constraint companies_status_check
  check (status in ('active', 'trial', 'suspended', 'cancelled'));

alter table public.workspaces
  add constraint workspaces_status_check
  check (status in ('active', 'archived'));
```

既存データが制約に合わない場合、ALTER前にデータ補正が必要。

---

## 3. テーブル作成SQL

このセクションはテーブル作成のみを対象とする。RLSは含めない。

### snapshots

```sql
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  workspace_id uuid not null references public.workspaces(id),
  uploaded_by uuid not null references auth.users(id),
  snapshot_date date not null,
  source text not null default 'suumo_csv',
  file_name text not null,
  row_count integer not null,
  checksum text,
  created_at timestamptz default now()
);
```

### snapshot_rows

```sql
create table if not exists public.snapshot_rows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  workspace_id uuid not null references public.workspaces(id),
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  row_data jsonb not null,
  property_key text,
  created_at timestamptz default now()
);
```

---

## 4. Index作成SQL

```sql
create index if not exists snapshots_company_workspace_snapshot_date_idx
  on public.snapshots (company_id, workspace_id, snapshot_date);

create index if not exists snapshots_company_workspace_created_at_idx
  on public.snapshots (company_id, workspace_id, created_at);

create index if not exists snapshot_rows_snapshot_id_idx
  on public.snapshot_rows (snapshot_id);

create index if not exists snapshot_rows_company_workspace_idx
  on public.snapshot_rows (company_id, workspace_id);

create index if not exists snapshot_rows_property_key_idx
  on public.snapshot_rows (property_key);
```

---

## 5. RLS SQL Draft

このRLS SQLはまだ実行しない。

RLS有効化前に、`profiles`, `companies`, `workspaces`, 認証、CurrentWorkspaceContextの疎通を確認する。

### RLS有効化SQL

```sql
alter table public.snapshots enable row level security;
alter table public.snapshot_rows enable row level security;
```

### select policy案

```sql
create policy "Users can select own workspace snapshots"
on public.snapshots
for select
using (
  company_id in (
    select company_id
    from public.profiles
    where id = auth.uid()
  )
  and workspace_id in (
    select workspace_id
    from public.profiles
    where id = auth.uid()
  )
);

create policy "Users can select own workspace snapshot rows"
on public.snapshot_rows
for select
using (
  company_id in (
    select company_id
    from public.profiles
    where id = auth.uid()
  )
  and workspace_id in (
    select workspace_id
    from public.profiles
    where id = auth.uid()
  )
);
```

### insert policy案

```sql
create policy "Users can insert own workspace snapshots"
on public.snapshots
for insert
with check (
  uploaded_by = auth.uid()
  and company_id in (
    select company_id
    from public.profiles
    where id = auth.uid()
  )
  and workspace_id in (
    select workspace_id
    from public.profiles
    where id = auth.uid()
  )
);

create policy "Users can insert own workspace snapshot rows"
on public.snapshot_rows
for insert
with check (
  company_id in (
    select company_id
    from public.profiles
    where id = auth.uid()
  )
  and workspace_id in (
    select workspace_id
    from public.profiles
    where id = auth.uid()
  )
);
```

---

## 6. snapshot_rows整合性方針

`snapshot_rows.company_id / workspace_id` は、RLS・検索性能のため冗長に持つ。

ただし、`snapshot_id` が参照する `snapshots.company_id / workspace_id` と不一致になるリスクがある。

初期はRepositoryで以下を担保する。

- Snapshot作成時の `company_id / workspace_id` を使ってrowsを生成する
- `snapshot_id` は `saveSnapshotWithRows` 内で付与する
- 呼び出し側から任意の `snapshot_id` を渡させない

将来的にはDB関数 / RPC / transactionで担保する。

現状の `saveSnapshotWithRows` はtransactionではないため、rows insert失敗時に親snapshotのみ残る可能性がある。

本格運用前にRPC化を検討する。

---

## 7. checksum方針

初期は `checksum: null` を許容する。

checksum未実装中は、重複アップロードを完全には防がない。

本格運用前にファイル内容hashを導入する。

将来的には以下のunique制約を検討する。

```sql
create unique index snapshots_unique_checksum_idx
  on public.snapshots (company_id, workspace_id, snapshot_date, checksum)
  where checksum is not null;
```

---

## 8. Rollback SQL

### policy削除案

```sql
drop policy if exists "Users can select own workspace snapshot rows" on public.snapshot_rows;
drop policy if exists "Users can insert own workspace snapshot rows" on public.snapshot_rows;
drop policy if exists "Users can select own workspace snapshots" on public.snapshots;
drop policy if exists "Users can insert own workspace snapshots" on public.snapshots;
```

### table削除案

```sql
drop table if exists public.snapshot_rows;
drop table if exists public.snapshots;
```

`snapshot_rows` は `snapshots` を参照するため、削除順は `snapshot_rows` を先にする。

---

## 9. 実行前チェックリスト

- 開発環境であることを確認する
- 本番環境で直接実行しない
- 既存 `csv_uploads` を残す
- `csv_uploads` の既存データをバックアップする
- `snapshots / snapshot_rows` が未作成または空であることを確認する
- RLSをテーブル作成と同時にONにしない
- `profiles`, `companies`, `workspaces` の存在とデータを確認する
- `profiles.id = auth.users.id` が成立していることを確認する
- `profiles.company_id / workspace_id / role` が埋まっていることを確認する
- `checksum` は初期null許容で進めるか確認する
- `saveSnapshotWithRows` のtransaction課題を許容する範囲か確認する
- Repository疎通テストの手順を別Sprintで用意する

---

## 10. Billing / Legal / Security注記

Billing用Companyカラムは今後追加予定。

検討候補:

- stripe_customer_id
- stripe_subscription_id
- billing_status
- trial_ends_at
- current_period_end
- seat_limit
- workspace_limit

Legal / Securityで今後整理する項目:

- データ保存期間
- 退会時削除
- 監査ログ
- `row_data` 保存項目棚卸し
- 専門家レビュー

---

## 11. 今回の判断

このSprintではSQLをdocs化するだけに留める。

Supabaseでの実行可否は、CTOレビュー後に別Sprintで判断する。

現時点では、SQL実行はまだ不可。
