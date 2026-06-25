# GUGUMO Coding Convention

Version: 1.0

Status: Active

---

# CC-001 目的

本ドキュメントはGUGUMOプロジェクトにおけるコーディング規約を定義する。

目的は以下のとおりである。

- コード品質を統一する
- 保守性を高める
- 可読性を高める
- Codexが同じ品質でコードを生成できるようにする

---

# CC-002 基本原則

すべてのコードは以下を満たすこと。

- 読みやすい
- 再利用できる
- 責務が一つ
- 拡張しやすい
- テストしやすい

---

# CC-003 命名規則

## Component

PascalCase

例

```text
Home.tsx

WeeklyReport.tsx

OptionManager.tsx

```

---

## Hook

必ず

use

から始める。

例

```text
useCsv.ts

useSettings.ts

useSnapshots.ts

```

---

## 型

typesフォルダへ置く。

例

```text
page.ts

csv.ts

settings.ts

analysis.ts

```

---

## Service

役割単位。

例

```text
csvService.ts

uploadService.ts

analysisService.ts

historyService.ts

```

---

## Repository

DB単位。

例

```text
csvRepository.ts

settingsRepository.ts

historyRepository.ts

```

---

## Validation

対象単位。

例

```text
csvValidator.ts

settingsValidator.ts

```

---

# CC-004 import順

必ず以下。

① React

② Next

③ 外部ライブラリ

④ @/

⑤ 相対パス

例

```ts
import { useMemo } from "react";

import Link from "next/link";

import Papa from "papaparse";

import { PAGE_TITLES } from "@/data/constants/pageTitles";

import "./style.css";

```

---

# CC-005 any禁止

原則

any

禁止。

共通型を作る。

型推論できる場合は推論を優先する。

---

# CC-006 Component

Componentは

表示のみ。

やってよいこと。

- JSX
- UI
- イベント

禁止。

- DB
- CSV解析
- 判定
- API
- SQL

---

# CC-007 Hook

Hookは

状態管理のみ。

HookへUIを書かない。

---

# CC-008 Service

Serviceは

処理を書く。

例

CSV解析

API

Supabase

Storage

---

# CC-009 Repository

Repositoryは

DBアクセスのみ。

判定を書いてはいけない。

---

# CC-010 Server

serverには

Business Logicのみ。

例

- Rule Engine
- Health Engine
- Advice Engine
- Recommendation Engine

---

# CC-011 定数

表示用

↓

data/constants

UI設定

↓

config

判定値

↓

server/config

---

# CC-012 型

型は

types

へ。

同じ型を複数ファイルへ書かない。

---

# CC-013 コメント

コメントは

なぜ

を書く。

何を

はコードで分かるようにする。

悪い例

```ts
// CSVを読む

```

良い例

```ts
// Shift-JISとUTF-8の両方に対応するため独自処理を行う

```

---

# CC-014 関数

一つの関数は

一つの責務。

長すぎる関数は禁止。

目安

100行以内。

---

# CC-015 ネスト

ネストは

3段以内。

深くなる場合。

関数へ分割する。

---

# CC-016 if

否定より

早期return

を優先する。

例

```ts
if (!csv.length) return;

```

---

# CC-017 マジックナンバー

禁止。

悪い例

```ts
if (pv < 0.15)

```

良い例

```ts
DETAIL_PV_REMOVE_THRESHOLD

```

※ 本番ではserver/configから取得する。

---

# CC-018 重複

同じコードを2回書かない。

3回目で共通化する。

---

# CC-019 Console

本番コードへ

console.log

禁止。

デバッグ後は削除。

---

# CC-020 TODO

TODOだけ残して終了しない。

IssueまたはGGM番号を書く。

例

```ts
// TODO(GGM-042): CSV履歴をSupabaseへ保存

```

---

# CC-021 CSS

インラインstyleを避ける。

共通化できるものは再利用する。

---

# CC-022 State

必要最小限。

重複stateは禁止。

---

# CC-023 Props

大量に渡さない。

7個以上になったら

オブジェクト化

または

Context

を検討する。

---

# CC-024 Context

本当に必要になるまで作らない。

乱用禁止。

---

# CC-025 useEffect

必要最小限。

依存配列をごまかさない。

eslint-disable禁止。

---

# CC-026 非同期

必ず

try

catch

を書く。

エラーを握りつぶさない。

---

# CC-027 Promise

Promise.all

を使える場合は利用する。

---

# CC-028 フォルダ

責務で分ける。

機能で分けない。

---

# CC-029 UI

画面は

薄く。

判定は

server。

---

# CC-030 パフォーマンス

必要以上にuseMemoを書かない。

必要になってから最適化する。

---

# CC-031 テスト

変更後

必ず。

- npm run dev
- [localhost](http://localhost)
- Console
- TypeScript

確認する。

---

# CC-032 禁止事項

以下は禁止。

- any
- 巨大Component
- 巨大page.tsx
- Business LogicをUIへ書く
- SQLをComponentへ書く
- import循環
- コメントアウト大量放置
- 未使用コード放置

---

# CC-033 コードレビュー基準

レビューでは以下を確認する。

- 読みやすいか
- 責務が一つか
- 型が適切か
- 命名が適切か
- 重複がないか
- 保守しやすいか
- 将来全国展開できるか

---

# CC-034 GUGUMO品質基準

コードは

「動く」

だけでは不十分。

以下を満たす。

- 保守可能
- 拡張可能
- 説明可能
- 再利用可能
- 競争優位を守れる

これをGUGUMOのコーディング品質とする。