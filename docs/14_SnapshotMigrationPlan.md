# Snapshot Migration Plan v1.0

## 0. 目的

GUGUMOのCSV保存を、将来的に `csv_uploads` から `snapshots / snapshot_rows` へ移行するためのDB migration方針を定義する。

---

## 1. 前提

- 現在は `csv_uploads` に `file_name`, `file_data` を保存している
- Snapshot Repository基盤は作成済み
- まだ実DBに `snapshots / snapshot_rows` は作成しない
- 既存保存挙動は壊さない

---

## 2. 作成予定テーブル

### snapshots

- id uuid primary key
- company_id uuid not null
- workspace_id uuid not null
- uploaded_by uuid not null
- snapshot_date date not null
- source text not null default 'suumo_csv'
- file_name text not null
- row_count integer not null
- checksum text
- created_at timestamptz default now()

### snapshot_rows

- id uuid primary key
- company_id uuid not null
- workspace_id uuid not null
- snapshot_id uuid not null references snapshots(id) on delete cascade
- row_data jsonb not null
- property_key text
- created_at timestamptz default now()

---

## 3. Index方針

推奨index:

- snapshots(company_id, workspace_id, snapshot_date)
- snapshots(company_id, workspace_id, created_at)
- snapshot_rows(snapshot_id)
- snapshot_rows(company_id, workspace_id)
- snapshot_rows(property_key)

---

## 4. Unique制約方針

本格運用では以下を検討する。

- snapshots(company_id, workspace_id, snapshot_date, checksum)

ただし、checksum本実装前はunique制約を急がない。

---

## 5. RLS方針

全テーブルでRLSを有効化する。

基本policy:

```sql
company_id in (
  select company_id
  from profiles
  where id = auth.uid()
)
```

Workspace分離を厳密化する場合:

```sql
workspace_id in (
  select workspace_id
  from profiles
  where id = auth.uid()
)
```

将来、複数Workspace所属を導入する場合は `workspace_memberships` 経由に変更する。

---

## 6. Migration順

### Step 1

テーブル作成のみ。

- snapshots
- snapshot_rows

既存保存処理はまだ切り替えない。

### Step 2

RLS policy追加。

### Step 3

Repository疎通テスト。

### Step 4

Upload保存処理をSnapshot Repositoryへ切替。

### Step 5

必要なら既存csv_uploadsから移行。

---

## 7. Rollback方針

初期段階では既存 `csv_uploads` を残す。

問題があれば、Upload保存処理を `csv_uploads` へ戻せるようにする。

`snapshots / snapshot_rows` は移行確認が完了するまで削除しない。

---

## 8. 注意事項

- DB変更は必ずSupabase側で確認しながら実施
- RLS有効化後はinsert/selectが失敗しやすいので、認証・profile・workspace contextを先に整える
- 既存ユーザーがいる場合はmigration前にバックアップを取る
- 本番環境で直接試さない

---

## 9. 今回の判断

今すぐDB変更はしない。

まずMigration Planを確定し、その後にSQL実行チケットへ進む。
