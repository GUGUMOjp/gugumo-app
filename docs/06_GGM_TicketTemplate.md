# GUGUMO GGM Ticket Template

Version: 1.0

Status: Active

---

# GT-001 目的

本ドキュメントは、GUGUMOにおける開発チケット（GGMチケット）の標準フォーマットを定義する。

すべての実装はGGMチケットを起点として行う。

Codexは原則としてGGMチケットに基づいてのみ実装を行う。

---

# GT-002 基本ルール

1チケット = 1目的

1チケット = 1コミット

1チケット = 1レビュー

仕様変更・リファクタリング・新機能追加を同一チケットに含めてはならない。

---

# GT-003 チケット番号

採番

```text
GGM-001
GGM-002
GGM-003

```

欠番は作らない。

削除もしない。

キャンセルになった場合も履歴として残す。

---

# GT-004 チケットテンプレート

```text
# GGM-XXX

## タイトル

## 種別
feat
fix
refactor
docs
chore

## 背景

なぜ必要なのか

## 目的

今回達成したいこと

## 対象

変更対象ファイル

## 作業内容

①

②

③

## 非対象

今回触らないもの

## 完了条件

## 動作確認

## コミットメッセージ

## 備考

```

---

# GT-005 種別

## feat

新機能

---

## fix

バグ修正

---

## refactor

整理

---

## docs

ドキュメント

---

## chore

環境整備

---

# GT-006 背景

必ず書く。

例

```text
page.tsxが肥大化して保守性が低下している

```

---

# GT-007 目的

今回達成することだけを書く。

悪い例

```text
画面改善

```

良い例

```text
PageIdをtypesへ分離する

```

---

# GT-008 対象

例

```text
app/page.tsx

types/page.ts

data/constants/pageTitles.ts

```

---

# GT-009 作業内容

具体的に書く。

例

```text
① PageIdを移動

② PAGE_TITLESを移動

③ import修正

```

---

# GT-010 非対象

今回変更しないものを書く。

例

```text
Settings型

CSV解析

Rule Engine

UI

デザイン

```

これにより仕様変更を防ぐ。

---

# GT-011 完了条件

例

```text
npm run dev成功

localhost表示成功

TypeScript Errorなし

Console Errorなし

UI変更なし

```

---

# GT-012 動作確認

最低限。

- npm run dev
- [localhost](http://localhost)
- Console
- TypeScript
- ESLint

---

# GT-013 コミット

必ず書く。

例

```text
refactor: extract page title constants

```

---

# GT-014 備考

必要なら

改善案

懸念点

を書く。

---

# GT-015 Codexへの依頼テンプレート

```text
Development Bibleを遵守してください。

対象ドキュメント

- README.md
- DevelopmentGuide.md
- Architecture.md
- CodexGuide.md
- CodingConvention.md
- FolderStructure.md

以下のGGMチケットを実装してください。

（ここにGGMチケットを貼る）

```

---

# GT-016 Codex完了報告

Codexは以下の形式で報告する。

```text
実施内容

変更ファイル

動作確認

懸念点

改善提案

```

---

# GT-017 レビュー

レビューでは以下を確認する。

仕様通りか

責務分離できているか

保守性

可読性

重複コード

命名

不要import

動作

---

# GT-018 チケットの粒度

適切

```text
PageId分離

```

不適切

```text
page.tsx整理

```

目的が大きすぎる。

---

# GT-019 チケットサイズ

目安

30〜300行

それ以上なら分割する。

---

# GT-020 リファクタリングチケット

必ず

「動作変更なし」

を記載する。

---

# GT-021 新機能チケット

必ず

背景

目的

完了条件

を書く。

---

# GT-022 バグ修正チケット

必ず

再現条件を書く。

---

# GT-023 docs更新

仕様変更時。

DecisionLog更新。

必要ならArchitecture更新。

必要ならDevelopmentGuide更新。

---

# GT-024 禁止事項

以下は禁止。

・仕様が曖昧なまま実装

・背景なし

・目的なし

・完了条件なし

・コミットなし

・動作確認なし

---

# GT-025 チケットライフサイクル

```text
Backlog

↓

Ready

↓

In Progress

↓

Review

↓

Done

↓

Released

```

---

# GT-026 優先順位

P0

本番障害

P1

重要機能

P2

改善

P3

将来対応

---

# GT-027 チケット例

```text
GGM-021

タイトル
Extract Settings Type

種別
refactor

背景
Settings型がpage.tsxに存在し再利用できない

目的
types/settings.tsへ移動

対象

app/page.tsx

types/settings.ts

作業

Settings型移動

import修正

動作確認

非対象

UI

CSV

Rule Engine

完了条件

npm run dev成功

localhost正常

TypeScript Errorなし

コミット

refactor: extract settings type

```

---

# GT-028 GUGUMOチケット原則

チケットは

「Codexへ依頼する文章」

ではない。

チケットは

「将来の履歴」

である。

1年後に読んでも

何をしたか

なぜしたか

分かる品質で記録すること。