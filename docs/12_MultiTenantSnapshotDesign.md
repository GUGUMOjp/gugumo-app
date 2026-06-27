# Multi Tenant / Snapshot Design v1.0

## 0. 目的

GUGUMOを複数法人が安全に利用できるBtoB SaaSへ進化させるため、Company / User / Snapshot / RLS の基本設計を定義する。

GUGUMOではSUUMO CSVを単なるアップロードファイルではなく、法人ごとの「日次スナップショット」として扱う。

---

## 1. 基本方針

- すべての業務データは `company_id` を持つ
- ユーザーは必ず1つ以上のCompanyに所属する
- 初期フェーズでは1ユーザー1Companyを基本とする
- CSVは蓄積保存する
- CSVは `csv_uploads` ではなく、将来的に `snapshots` 概念へ発展させる
- `created_at` ではなく `snapshot_date` を分析軸にする
- RLSにより他社データは参照・更新できない

---

## 2. 推奨ドメインモデル

```text
Company
↓
User / Profile
↓
Snapshot
↓
CSV Rows / Analysis
↓
Advice / Report
```

---

## 3. 推奨テーブル

### companies

- id uuid primary key
- name text not null
- status text not null
- plan text
- created_at timestamptz default now()

### profiles

- id uuid primary key
- company_id uuid references companies(id)
- email text
- name text
- role text
- created_at timestamptz default now()

`profiles.id` は `auth.users.id` と一致させる。

### snapshots

- id uuid primary key
- company_id uuid references companies(id)
- uploaded_by uuid references auth.users(id)
- snapshot_date date not null
- source text default 'suumo_csv'
- file_name text
- row_count integer
- checksum text
- created_at timestamptz default now()

### snapshot_rows

- id uuid primary key
- company_id uuid references companies(id)
- snapshot_id uuid references snapshots(id)
- row_data jsonb not null
- property_key text
- created_at timestamptz default now()

### company_settings

- id uuid primary key
- company_id uuid references companies(id)
- slots integer
- smapic_limit integer
- ward text
- prices jsonb
- updated_by uuid references auth.users(id)
- updated_at timestamptz default now()

### reports

- id uuid primary key
- company_id uuid references companies(id)
- snapshot_id uuid references snapshots(id)
- report_type text
- report_data jsonb
- created_at timestamptz default now()

---

## 4. 既存csv_uploadsとの関係

現状は `csv_uploads` に `file_name`, `file_data` を保存している。

短期的には `csv_uploads` に以下を追加してもよい。

- company_id
- uploaded_by
- snapshot_date
- row_count
- checksum

ただし中長期では、`snapshots` / `snapshot_rows` へ移行する。

判断:

- β版までは `csv_uploads + company_id` でも可
- 本格運用前に `snapshots` へ移行するのが望ましい

---

## 5. 認証方式

初期は Supabase Auth email/password を採用する。

理由:

- 法人ごとにID/PWを発行しやすい
- `auth.uid()` をRLSに利用できる
- profiles と company_id を紐付けやすい

---

## 6. Role設計

初期Role:

- owner
- admin
- member
- viewer

最小運用では admin / member から開始してよい。

権限方針:

- owner: 契約・会社設定・ユーザー管理
- admin: CSVアップロード、設定変更、閲覧
- member: CSVアップロード、閲覧
- viewer: 閲覧のみ

---

## 7. RLS方針

基本方針:

ユーザーは自社の `company_id` を持つデータのみ参照・更新できる。

例:

```sql
company_id in (
  select company_id
  from profiles
  where id = auth.uid()
)
```

対象:

- companies
- profiles
- snapshots
- snapshot_rows
- company_settings
- reports

---

## 8. Server構成方針

必要になる構成:

```text
src/server/core/supabaseServerClient.ts
src/server/repositories/companyRepository.ts
src/server/repositories/profileRepository.ts
src/server/repositories/snapshotRepository.ts
src/server/repositories/settingsRepository.ts
src/server/actions/authActions.ts
src/server/actions/snapshotActions.ts
```

---

## 9. 実装順

### Sprint 6-2

Auth基盤

- Supabase Auth接続
- login/logout
- session取得
- 未ログインガード

### Sprint 6-3

Company Context

- current profile取得
- current company取得
- role取得

### Sprint 6-4

Snapshot保存基盤

- csv_uploadsを暫定拡張するか
- snapshots / snapshot_rows を作るか最終判断
- Repository更新

### Sprint 6-5

Settings DB化

- localStorageから company_settings へ段階移行

### Sprint 6-6

RLS有効化

- company_id分離
- role別権限
- RLS policy確認

---

## 10. 現時点の判断

今すぐ実装する:

- 設計ドキュメント化
- Auth導入順序の確定
- Snapshot概念の確定

まだ実装しない:

- DBスキーマ変更
- RLS有効化
- app/page.tsxへの認証組み込み
- csv_uploads変更
- settings DB化
