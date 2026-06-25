# GUGUMO Architecture

Version: 1.0

Status: Active

---

# ARC-001 目的

本ドキュメントはGUGUMOのシステム構成、責務分離、データフロー、将来の拡張方針を定義する。

ソースコードを書く前に、本ドキュメントを基準として設計判断を行う。

---

# ARC-002 システム全体構成

```text
                ┌────────────────────┐
                │     CSV Upload      │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ CSV Parser          │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Supabase            │
                │ Upload Storage      │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Analysis Engine     │
                └─────────┬──────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
     Option Engine   Health Engine  Advice Engine
            │             │             │
            └─────────────┼─────────────┘
                          ▼
                ┌────────────────────┐
                │ API Response        │
                └─────────┬──────────┘
                          ▼
                ┌────────────────────┐
                │ React UI           │
                └────────────────────┘

```

---

# ARC-003 基本思想

GUGUMOは

**Server First**

で設計する。

画面は表示のみ。

判定はサーバー側。

分析もサーバー側。

UIは結果を表示するだけとする。

---

# ARC-004 レイヤー構成

```text
Presentation Layer

↓

Application Layer

↓

Domain Layer

↓

Infrastructure Layer

```

---

## Presentation

担当

React

Next.js

Component

責務

画面表示

入力

イベント

---

## Application

担当

Analysis

Recommendation

Workflow

責務

画面ごとの処理

---

## Domain

担当

判定ルール

健全性

分析

コメント

責務

GUGUMO独自ノウハウ

---

## Infrastructure

担当

Supabase

Storage

CSV

API

責務

保存

取得

通信

---

# ARC-005 データフロー

CSVアップロード

↓

CSV解析

↓

Validation

↓

Supabase保存

↓

Analysis Engine

↓

Rule Engine

↓

Recommendation

↓

UI

---

# ARC-006 ディレクトリ責務

```text
app

```

ページのみ。

---

```text
components

```

表示のみ。

---

```text
types

```

型のみ。

---

```text
config

```

UI設定のみ。

---

```text
data

```

公開可能データ。

駅

行政区

ラベル

コメントテンプレート

---

```text
server

```

非公開ロジック。

分析。

判定。

AIコメント。

健全性。

削減額。

推奨件数。

---

```text
repositories

```

DBアクセス。

---

```text
services

```

CSV。

Supabase。

Storage。

---

```text
validation

```

CSVチェック。

設定チェック。

---

```text
hooks

```

React Hookのみ。

---

# ARC-007 Frontend

Frontendは

以下のみ担当する。

・表示

・入力

・イベント

・画面遷移

・状態保持

Frontendで計算してはいけない。

---

# ARC-008 Backend

Backendで行う。

・CSV解析

・物件分析

・健全性

・コメント生成

・推奨件数

・削減額

・判定

・AI比較

---

# ARC-009 Rule Engine

Rule Engineは

GUGUMO最大の知的資産である。

責務

・掲載判断

・スマピク判断

・その他オプション判断

・健全性

・入替候補

・長期掲載

・新着判定

・競合判定

Rule Engineは絶対にFrontendへ置かない。

---

# ARC-010 Advice Engine

Advice Engineは

AI APIを使わない。

ルールベースで実装する。

例

競合減少

↓

コメントA

閲覧増加

↓

コメントB

新着不足

↓

コメントC

など。

---

# ARC-011 Health Engine

健全性スコアは

複数要素を統合して算出する。

画面には

結果のみ表示する。

算出方法は公開しない。

---

# ARC-012 Option Engine

担当

スマピク

店ピク

パノラマ

動画

得意なエリア

責務

推奨件数

使用率

削減額

余剰判定

---

# ARC-013 全国展開

行政区依存は禁止。

駅を中心に分析する。

行政区は

補助情報

として扱う。

---

# ARC-014 エリアデータ

```text
areas/

kinki/

tokai/

kanto/

kyushu/

```

地域ごとに分離する。

---

# ARC-015 保存戦略

CSVは

履歴として保存する。

分析結果も保存する。

画面表示時に

再計算しない。

---

# ARC-016 セキュリティ

ブラウザへ送る。

・結果

・表示用コメント

・スコア

送らない。

・閾値

・判定基準

・算出式

・コメント選定条件

---

# ARC-017 API

今後

```text
/api/analyze

/api/upload

/api/settings

/api/history

```

を作成する。

画面はAPIのみ呼び出す。

---

# ARC-018 拡張性

将来的に追加可能。

・Stripe

・契約プラン

・企業別設定

・営業ダッシュボード

・通知

・メール

・LINE

・AI分析

設計変更なしで追加できること。

---

# ARC-019 依存ルール

UI

↓

Service

↓

Repository

↓

Supabase

逆方向は禁止。

---

# ARC-020 開発方針

新機能追加より

責務分離

を優先する。

巨大ファイルは禁止。

同じコードを書かない。

ロジックを重複させない。

---

# ARC-021 GUGUMOが守るべき設計原則

Single Source of Truth

Server First

Rule Based

Explainable Recommendation

Minimal Frontend

Reusable Components

Loose Coupling

High Cohesion

Specification First

Implementation Second

---

# ARC-022 将来構成

```text
CSV

↓

Upload

↓

Supabase

↓

Analysis

↓

Rule Engine

↓

Advice Engine

↓

Health Engine

↓

Recommendation Engine

↓

API

↓

Frontend

```

この構成をGUGUMOの最終アーキテクチャとする。