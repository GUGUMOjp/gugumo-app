# Multi Tenant / Snapshot Design v1.2

## 0. 目的

GUGUMOを複数法人が安全に利用できるBtoB SaaSへ進化させるため、Company / Workspace / User / Snapshot / RLS の基本設計を定義する。

GUGUMOではSUUMO CSVを単なるアップロードファイルではなく、法人・店舗ごとの「日次スナップショット」として扱う。

---

## 1. 基本方針

- すべての業務データは `company_id` を持つ
- 店舗・拠点単位で管理する業務データは `workspace_id` を持つ
- ユーザーは必ず1つ以上のCompanyに所属する
- 初期フェーズでは1ユーザー1Company / 1Workspaceを基本とする
- CSVは蓄積保存する
- CSVは `csv_uploads` ではなく、将来的に `snapshots` 概念へ発展させる
- `created_at` ではなく `snapshot_date` を分析軸にする
- RLSにより他社データ・他Workspaceデータは参照・更新できない

---

## 2. Workspace概念

Workspaceは、Company配下の運用単位である。

例:

```text
Company: 株式会社〇〇不動産
Workspace: 梅田店 / 難波店 / 天王寺店
```

Companyは契約・請求・最上位データ境界を表す。

WorkspaceはCSVアップロード、Settings、Snapshot、Analysis、Advice、Reportを実際に運用する店舗・拠点単位を表す。

---

## 3. 推奨ドメインモデル

```text
Company
↓
Workspace
↓
Profile / User
↓
Snapshot
↓
Snapshot Rows
↓
Analysis
↓
Advice
↓
Reports
```

---

## 4. 推奨テーブル

### companies

- id uuid primary key
- name text not null
- status text not null
- plan text
- created_at timestamptz default now()

### workspaces

- id uuid primary key
- company_id uuid references companies(id)
- name text not null
- status text not null
- created_at timestamptz default now()

### profiles

- id uuid primary key
- company_id uuid references companies(id)
- workspace_id uuid references workspaces(id)
- email text
- name text
- role text
- created_at timestamptz default now()

`profiles.id` は `auth.users.id` と一致させる。

初期は1ユーザー1Workspaceで運用する。

将来、複数Workspace所属が必要になった場合は `workspace_memberships` を追加する。

### snapshots

- id uuid primary key
- company_id uuid references companies(id)
- workspace_id uuid references workspaces(id)
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
- workspace_id uuid references workspaces(id)
- snapshot_id uuid references snapshots(id)
- row_data jsonb not null
- property_key text
- created_at timestamptz default now()

### workspace_settings

- id uuid primary key
- company_id uuid references companies(id)
- workspace_id uuid references workspaces(id)
- slots integer
- smapic_limit integer
- ward text
- prices jsonb
- updated_by uuid references auth.users(id)
- updated_at timestamptz default now()

### reports

- id uuid primary key
- company_id uuid references companies(id)
- workspace_id uuid references workspaces(id)
- snapshot_id uuid references snapshots(id)
- report_type text
- report_data jsonb
- created_at timestamptz default now()

`company_id` は最上位境界として残し、`workspace_id` は店舗・拠点ごとの運用データ分離に使う。

---

## 5. 既存csv_uploadsとの関係

現状は `csv_uploads` に `file_name`, `file_data` を保存している。

現在のCSV保存payload:

```ts
{
  file_name: string;
  file_data: Record<string, string>[];
}
```

短期的には `csv_uploads` に以下を追加してもよい。

- company_id
- workspace_id
- uploaded_by
- snapshot_date
- source
- row_count
- checksum

β版まで暫定的に `csv_uploads` を使う場合のpayload:

```ts
type CsvUploadRecord = {
  company_id: string;
  workspace_id: string;
  uploaded_by: string;
  snapshot_date: string;
  source: "suumo_csv";
  file_name: string;
  row_count: number;
  checksum: string | null;
  file_data: Record<string, string>[];
};
```

ただし中長期では、`snapshots` / `snapshot_rows` へ移行する。

判断:

- β版までは `csv_uploads + company_id + workspace_id` でも可
- 本格運用前に `snapshots` へ移行するのが望ましい
- DB変更前にRepository / Payload設計を固定する

---

## 6. Snapshot保存payload設計

本格運用では `snapshots` / `snapshot_rows` を本命にする。

`snapshots`:

```ts
type SnapshotRecord = {
  company_id: string;
  workspace_id: string;
  uploaded_by: string;
  snapshot_date: string;
  source: "suumo_csv";
  file_name: string;
  row_count: number;
  checksum: string | null;
};
```

`snapshot_rows`:

```ts
type SnapshotRowRecord = {
  company_id: string;
  workspace_id: string;
  snapshot_id: string;
  row_data: Record<string, string>;
  property_key: string | null;
};
```

### ID・日付付与方針

- `company_id`: CurrentWorkspaceContextから取得
- `workspace_id`: CurrentWorkspaceContextから取得
- `uploaded_by`: Current User IDから取得
- `snapshot_date`: CsvSnapshot.dateKeyを使用
- `row_count`: snapshot.rows.length
- `source`: 初期は `"suumo_csv"`
- `checksum`: 初期はnull許容、本格運用前にhash生成

### 判断

- 本格運用では `snapshots / snapshot_rows` を本命にする
- `csv_uploads` 暫定拡張はβ版までの選択肢
- DB変更前にRepository / Payload設計を固定する

---

## 7. 認証方式

初期は Supabase Auth email/password を採用する。

理由:

- 法人ごとにID/PWを発行しやすい
- `auth.uid()` をRLSに利用できる
- profiles と company_id / workspace_id を紐付けやすい

---

## 8. Role設計

初期Role:

- owner
- admin
- member
- viewer

最小運用では admin / member から開始してよい。

権限方針:

- owner: 契約・会社設定・ユーザー管理・複数Workspace閲覧
- admin: CSVアップロード、Workspace設定変更、閲覧
- member: CSVアップロード、閲覧
- viewer: 閲覧のみ

---

## 9. Header Context方針

ログイン後の画面には、所属Company / Workspace / Roleを表示する。

表示例:

```text
株式会社〇〇不動産　梅田店
管理者
```

必要Context:

- companyName
- workspaceName
- role
- profileName
- email

---

## 10. RLS方針

基本方針:

ユーザーは自社の `company_id` を持つデータのみ参照・更新できる。

店舗・拠点ごとの業務データは `workspace_id` でも分離する。

例:

```sql
company_id in (
  select company_id
  from profiles
  where id = auth.uid()
)
```

Workspace単位の分離例:

```sql
workspace_id in (
  select workspace_id
  from profiles
  where id = auth.uid()
)
```

将来、owner / admin が複数Workspaceを閲覧できるようにする余地を残す。

複数Workspace所属が必要になった場合は `workspace_memberships` を使ったPolicyへ移行する。

対象:

- companies
- workspaces
- profiles
- snapshots
- snapshot_rows
- workspace_settings
- reports

---

## 11. Server構成方針

必要になる構成:

```text
src/server/core/supabaseServerClient.ts
src/server/core/workspaceContext.ts
src/server/repositories/companyRepository.ts
src/server/repositories/workspaceRepository.ts
src/server/repositories/profileRepository.ts
src/server/repositories/snapshotRepository.ts
src/server/repositories/settingsRepository.ts
src/server/actions/authActions.ts
src/server/actions/workspaceActions.ts
src/server/actions/snapshotActions.ts
```

---

## 12. 実装順

### Sprint 6-5

Workspace Design Docs Update

- Company / Workspace / Profile方針をdocsへ反映
- Header Context方針を定義
- RLS方針をCompany / Workspace二層へ更新

### Sprint 6-6

Profile / Workspace Repository基盤

- current profile取得
- current company / workspace取得
- role取得

### Sprint 6-7

Current Workspace Context Action

- current profile / company / workspaceをまとめる
- Header表示に必要なContextを返す

### Sprint 6-8

Header Tenant Display

- ログイン中のCompany / Workspace / Roleを表示
- UI表示のみを追加

### Sprint 6-9

Product Shell / Legal Navigation Foundation

- Legal導線を追加
- バージョン表示を追加
- Product Shell情報を定数化

### Sprint 6-10

Snapshot Save Payload Design

- 現在のCSV保存payloadを調査
- `csv_uploads` 暫定拡張案を整理
- `snapshots / snapshot_rows` 本命案を整理

### Sprint 6-11

Snapshot Payload Design Docs

- Snapshot保存payload設計をdocsへ固定
- ID・日付付与方針を明文化

### Sprint 6-12

Snapshot Repository Foundation

- `snapshotRepository.ts` を追加
- `saveSnapshot`
- `saveSnapshotRows`
- `saveSnapshotWithRows`

### Sprint 6-13

Snapshot DB Migration Plan

- DB migration内容を確定
- `snapshots` / `snapshot_rows` を作成するか最終判断

### Sprint 6-14

Snapshot Save Integration

- Upload保存処理をSnapshot Repositoryへ接続
- `company_id` / `workspace_id` / `uploaded_by` / `snapshot_date` をpayloadへ付与

### Sprint 6-15

RLS Policy Foundation

- company_id分離
- workspace_id分離
- role別権限
- RLS policy確認

---

## 13. 現時点の判断

今すぐ実装する:

- Workspace設計のドキュメント化
- Company / Workspace / Profile方針の確定
- Header Context方針の確定
- Snapshot Payload設計のドキュメント化
- `snapshot_date = CsvSnapshot.dateKey` 方針の確定

まだ実装しない:

- DBスキーマ変更
- RLS有効化
- app/page.tsxへの認証組み込み
- csv_uploads変更
- workspace_settings DB化
- Snapshot Repository実装
- checksum本実装

---

## 14. 今後の不足・検討事項

Billing用Companyカラムは今後追加予定。

候補:

- stripe_customer_id
- stripe_subscription_id
- billing_status
- trial_ends_at
- current_period_end
- seat_limit
- workspace_limit

Legal / Security観点では以下を別途整理する。

- データ保存期間
- 退会時削除
- 監査ログ
- `row_data` 保存項目棚卸し
- 専門家レビュー
