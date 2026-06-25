# GUGUMO Folder Structure

Version: 1.0

Status: Active

---

# FS-001 目的

本ドキュメントはGUGUMOのフォルダ構成および各フォルダの責務を定義する。

フォルダ構成は保守性・拡張性・責務分離を目的として設計する。

新しいフォルダを追加する場合は、本ドキュメントを更新対象とする。

---

# FS-002 全体構成

```text
app/
components/
config/
data/
docs/
hooks/
lib/
public/
repositories/
server/
services/
types/
validation/

```

将来的には以下を追加する。

```text
tests/
scripts/
assets/

```

---

# FS-003 app

役割

Next.js App Router

責務

・ルーティング

・画面表示

・レイアウト

・ページ切替

置いてよいもの

・page.tsx

・layout.tsx

・loading.tsx

・error.tsx

禁止

・Business Logic

・CSV解析

・判定

・SQL

・分析処理

---

# FS-004 components

役割

UI表示

責務

・見た目

・ボタン

・テーブル

・チャート

・入力フォーム

置いてよいもの

・React Component

禁止

・CSV解析

・Rule Engine

・Repository

・Supabase

・Business Logic

---

# FS-005 hooks

役割

状態管理

責務

・State

・useEffect

・useMemo

・画面状態

例

```text
useCsv.ts

useSettings.ts

useSnapshots.ts

useHistory.ts

```

禁止

・UI

・SQL

・Business Logic

---

# FS-006 services

役割

外部サービスとのやり取り

例

CSV

Supabase

Storage

API

責務

・通信

・取得

・保存

・変換

例

```text
csvService.ts

uploadService.ts

historyService.ts

storageService.ts

supabaseService.ts

```

禁止

・UI

・Business Logic

---

# FS-007 repositories

役割

DBアクセス

責務

SQL

CRUD

例

```text
csvRepository.ts

settingsRepository.ts

historyRepository.ts

```

禁止

・判定

・分析

・コメント生成

・CSV解析

---

# FS-008 server

役割

GUGUMO最大の知的資産

ここに競争優位を書く。

例

```text
server

config

rules

analysis

engines

advice

utils

```

責務

・Rule Engine

・Health Engine

・Advice Engine

・Recommendation Engine

・CSV Analysis

・判定

・健全性

・削減額

・推奨件数

・コメント選択

Frontendへ公開しない。

---

# FS-009 config

役割

UI設定

例

色

表示順

画面設定

禁止

判定値

閾値

Business Logic

例

```text
uiConfig.ts

theme.ts

menu.ts

```

---

# FS-010 data

役割

公開可能データ

例

駅

行政区

表示文

ラベル

テンプレート

例

```text
areas/

stations/

constants/

comments/

```

禁止

Rule

Health

Analysis

---

# FS-011 types

役割

型定義

例

```text
csv.ts

settings.ts

analysis.ts

page.ts

history.ts

```

禁止

関数

UI

---

# FS-012 validation

役割

入力チェック

CSVチェック

例

```text
csvValidator.ts

settingsValidator.ts

uploadValidator.ts

```

---

# FS-013 lib

役割

ライブラリ初期化

例

Supabase

Stripe

Chart

PapaParse

置いてよいもの

初期化のみ。

---

# FS-014 docs

役割

開発資産

仕様

設計

ロードマップ

Decision

ルール

コードを書かない。

---

# FS-015 public

役割

画像

favicon

robots

manifest

静的ファイル

---

# FS-016 将来追加

正式版以降

```text
tests/

```

Unit Test

Integration Test

---

```text
scripts/

```

Migration

Import

Batch

---

```text
assets/

```

Design

Logo

Icons

---

# FS-017 Areas

地域データ

例

```text
areas/

kinki/

kanto/

tokai/

kyushu/

```

都道府県単位で管理。

駅情報を基本とする。

---

# FS-018 Stations

駅マスタ

例

```text
stations/

osaka.ts

kyoto.ts

hyogo.ts

nara.ts

wakayama.ts

shiga.ts

```

全国対応時も同じ構成とする。

---

# FS-019 Components構成

```text
components/

Home/

Weekly/

Monthly/

Option/

Area/

Upload/

Settings/

Common/

```

画面単位で分割。

---

# FS-020 Common

共通Component

例

```text
Button

Card

Table

Modal

Badge

Empty

Loading

```

---

# FS-021 Engine

server配下

```text
RuleEngine

HealthEngine

AdviceEngine

RecommendationEngine

```

それぞれ独立させる。

---

# FS-022 Importルール

依存方向

```text
UI

↓

Hook

↓

Service

↓

Repository

↓

Supabase

```

逆方向は禁止。

---

# FS-023 将来API

```text
/api

upload

history

analyze

settings

contract

billing

```

画面はAPIのみ呼び出す。

---

# FS-024 禁止事項

以下は禁止。

・巨大フォルダ

・責務が複数あるファイル

・Business LogicをComponentへ置く

・RepositoryからUI参照

・ServerからReact参照

・循環参照

---

# FS-025 GUGUMO最終構成

```text
app
components
config
data
docs
hooks
lib
public
repositories
server
services
types
validation

tests
scripts
assets

```

Version2以降も

この構成を基本とする。

---

# FS-026 フォルダ追加ルール

新規フォルダ作成時は

以下を満たすこと。

- 明確な責務がある
- 既存フォルダと重複しない
- [FolderStructure.md](http://FolderStructure.md)を更新対象とする
- ChatGPT（CTO）が承認する

安易にフォルダを増やさず、責務が十分に分離できない場合は既存フォルダを利用する。

---

# FS-027 保守方針

フォルダ構成は「現在」ではなく「3年後」を基準に設計する。

多少空のフォルダがあっても問題ない。

将来の機能追加で構成を大きく変更しないことを優先する。
