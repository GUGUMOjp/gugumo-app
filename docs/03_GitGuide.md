# GUGUMO Git Guide

Version: 1.0

Status: Active

---

# GG-001 目的

本ドキュメントは、GUGUMOプロジェクトにおけるGit運用ルールを定義する。

目的は以下の4点である。

- バグ発生時に即座に戻せること
- 変更履歴を誰でも理解できること
- 複数人開発に耐えられること
- 事業売却時にも変更履歴を資産として残すこと

---

# GG-002 基本方針

Gitはバックアップではない。

Gitはプロジェクトの履歴管理システムである。

コミット履歴だけで

- 何を変更したか
- なぜ変更したか
- いつ変更したか

が分かる状態を維持する。

---

# GG-003 ブランチ戦略

現在（個人開発）

```text
main

```

のみ使用する。

正式版以降は以下へ移行する。

```text
main
develop
feature/*
hotfix/*
release/*

```

---

# GG-004 コミット単位

必ず

**1チケット = 1コミット**

とする。

一つのコミットには

一つの目的だけを含める。

例

○

・型分離

・フォルダ整理

・CSVアップロード追加

×

・型分離

・UI変更

・新機能追加

を一緒にする。

---

# GG-005 コミット前チェック

コミット前に必ず実施する。

- npm run dev
- [localhost](http://localhost)表示確認
- Console Error 0件
- TypeScript Error 0件
- ESLint Error 0件
- 動作確認

これを満たさないコミットは禁止する。

---

# GG-006 コミットメッセージ

以下を使用する。

## feat

新機能

例

```text
feat: add csv history

```

---

## fix

バグ修正

例

```text
fix: resolve csv parsing error

```

---

## refactor

リファクタリング

例

```text
refactor: extract page title constants

```

---

## docs

ドキュメント更新

例

```text
docs: add development guide

```

---

## chore

環境整備

例

```text
chore: organize project folders

```

---

## style

見た目のみ

例

```text
style: adjust spacing

```

---

## test

テスト追加

例

```text
test: add csv parser tests

```

---

# GG-007 Push

Commitしたら

必ずPushする。

ローカルだけで終了しない。

---

# GG-008 Pull

複数人開発時のみ。

作業開始前に

Pull

を行う。

---

# GG-009 バージョニング

正式版から

Semantic Versioning

を採用する。

形式

```text
v1.0.0

```

意味

Major

機能追加・互換性変更

Minor

新機能

Patch

バグ修正

例

```text
v1.0.0
v1.1.0
v1.1.1
v2.0.0

```

---

# GG-010 タグ

正式版のみタグを付ける。

例

```text
v1.0.0
v1.1.0
v2.0.0

```

---

# GG-011 リリース

正式リリース時。

以下を書く。

- 概要
- 新機能
- 修正
- Breaking Change
- Migration

---

# GG-012 リリースノート

テンプレート

```text
Version

概要

追加機能

修正

改善

既知の問題

次回予定

```

---

# GG-013 コミット禁止

以下は禁止。

・動作未確認

・Console Errorあり

・TypeScript Errorあり

・ESLint Errorあり

・TODOだけ追加

・コメントアウト大量追加

・デバッグコード残し

---

# GG-014 レビュー

レビューでは

以下を確認する。

・仕様通りか

・責務分離されているか

・保守性

・重複コード

・不要import

・命名

・UI崩れ

---

# GG-015 緊急修正

本番障害のみ。

hotfix

を使用する。

通常開発では使用しない。

---

# GG-016 Commit禁止例

悪い例

```text
update

```

```text
fix

```

```text
test

```

```text
aaa

```

```text
変更

```

内容が分からないコミットは禁止。

---

# GG-017 良いコミット例

```text
feat: add option health score

fix: correct upload validation

refactor: split home component

docs: create architecture guide

chore: setup project structure

```

---

# GG-018 GitHub Issues

将来的に

Issue番号

と

GGM番号

を対応させる。

例

```text
Issue #21

↓

GGM-021

```

---

# GG-019 GitHub Projects

正式版以降

Projectsを利用する。

状態

Backlog

↓

Ready

↓

In Progress

↓

Review

↓

Done

---

# GG-020 GitHub Milestones

Milestoneを設定する。

例

- β版
- 正式版
- 近畿対応
- 全国対応
- Enterprise版

---

# GG-021 ロールバック

バグ発生時。

Gitで戻す。

コードを手作業で戻さない。

---

# GG-022 バックアップ

GitHubを正とする。

ローカルはバックアップではない。

---

# GG-023 Codex

Codex実装後。

以下を必ず報告する。

実施内容

変更ファイル

動作確認

懸念点

提案

---

# GG-024 ChatGPT

ChatGPTは

Commitを書かない。

設計とレビューを担当する。

---

# GG-025 Product Owner

Product Ownerのみ

Merge可。

仕様変更可。

最終判断可。

---

# GG-026 Git運用原則

Git履歴は

プロジェクトの歴史である。

履歴を読めば

GUGUMOがどのように成長したか

分かる状態を維持する。

---

# GG-027 完了条件

Git運用完了とは

Commitした状態ではない。

以下を満たすこと。

・Commit

・Push

・GitHub反映

・動作確認

・docs更新（必要時）

以上をもって

開発完了

とする。