# Snapshot Migration SQL Draft v1.0

## 0. 目的

このドキュメントは、`snapshots / snapshot_rows` 作成前に、実行予定SQLをレビューするための下書きである。

このSQLはまだ実行しない。

DB変更・Supabase設定変更・RLS有効化は、別Sprintで実施判断する。

---

## 1. 作成予定テーブルSQL

### snapshots

```sql
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  workspace_id uuid not null,
  uploaded_by uuid not null,
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
  company_id uuid not null,
  workspace_id uuid not null,
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  row_data jsonb not null,
  property_key text,
  created_at timestamptz default now()
);
```

---

## 2. Index作成SQL

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

## 3. RLS下書き

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

## 4. Rollback SQL

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

## 5. 実行前チェックリスト

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
- Repository疎通テストの手順を別Sprintで用意する

---

## 6. 今回の判断

このSprintではSQLをdocs化するだけに留める。

Supabaseでの実行可否は、CTOレビュー後に別Sprintで判断する。
