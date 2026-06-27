# GUGUMO Development Bible

この `docs` ディレクトリは、GUGUMO開発における唯一の正しい仕様書・設計書・運用ルール集である。

GUGUMOは、不動産会社のSUUMO運用を効率化し、掲載判断・オプション運用・反響改善・費用削減を再現可能にするための運用OSである。

---

## 0. このドキュメント群の目的

GUGUMO Development Bible の目的は、以下の4つである。

1. 開発判断をブレさせない
2. Codexに一貫した実装指示を出せるようにする
3. 将来エンジニアが参加しても迷わない状態にする
4. GUGUMOの運用ノウハウを知的資産として残す

GUGUMOでは、ソースコードだけでなく、判定思想・運用ルール・設計判断・開発方針も重要な資産として扱う。

---

## 1. 最重要原則

GUGUMOの開発では、以下を最優先する。

### 1.1 動作している機能を壊さない

既存機能の破壊を避けることを最優先する。

新機能追加よりも、既存機能の安定性を重視する。

### 1.2 仕様変更とリファクタリングを混ぜない

リファクタリングでは、動作・UI・文言・判定ロジックを変更しない。

仕様変更が必要な場合は、別チケットとして扱う。

### 1.3 判定ロジックはフロントに露出させない

GUGUMOの競争優位は、SUUMO運用ノウハウをルール化した判定ロジックにある。

そのため、将来的には以下をサーバー側へ寄せる。

- 判定基準
- 閾値
- 健全性スコア算出
- AI風コメント選定ロジック
- オプション推奨ロジック
- 削減額計算ロジック

フロント側には、表示に必要な結果だけを渡す。

### 1.4 画面より運用成果を優先する

GUGUMOは「分析画面を見せるツール」ではない。

ユーザーが毎日行うべきことを短時間で判断できる状態を作ることを優先する。

---

## 2. 役割分担

### 2.1 Product Owner

担当：田中純一

役割：

- 最終判断
- SUUMO運用ノウハウの提供
- 顧客価値の確認
- ビジネス上の優先順位決定

### 2.2 ChatGPT

役割：CTO / プロダクトマネージャー / 設計責任者

担当：

- 仕様設計
- 技術設計
- アーキテクチャ設計
- Codex向け実装指示作成
- リスク検討
- 長期保守性レビュー
- 全国展開・事業売却を見据えた判断

ChatGPTは、実装前に必ず以下を確認する。

- 本当にユーザー価値があるか
- 運用時間を短縮するか
- 全国展開できるか
- 保守可能か
- 事業価値を高めるか
- 既存機能と重複しないか

### 2.3 Codex

役割：シニアソフトウェアエンジニア / 実装担当

担当：

- フォルダ作成
- ファイル作成
- コード編集
- import修正
- 型分離
- 定数分離
- コンポーネント分割
- TypeScript修正
- ESLint修正
- 動作確認

Codexは仕様を勝手に変更してはいけない。

判断に迷う場合は、実装せず提案で止める。

---

## 3. 開発フロー

GUGUMOでは、原則として以下の順番で開発する。

1. 課題整理
2. 設計レビュー
3. 仕様確定
4. Codex向けチケット作成
5. Codex実装
6. `npm run dev` で確認
7. [localhost](http://localhost)で画面確認
8. Gitコミット
9. GitHubへPush
10. 必要に応じてdocs更新

---

## 4. ドキュメント一覧

### 00_[DevelopmentGuide.md](http://DevelopmentGuide.md)

GUGUMO開発全体の基本ルール。

Codex、ChatGPT、将来の開発者が共通して守るべき開発方針を定義する。

### 01_[Architecture.md](http://Architecture.md)

GUGUMOの技術設計。

CSV、Supabase、サーバー側分析、フロント表示、全国展開、セキュリティ方針を整理する。

### 02_[CodexGuide.md](http://CodexGuide.md)

Codex専用の実装ルール。

Codexができること、禁止事項、完了報告フォーマット、エラー時の対応を定義する。

### 03_[GitGuide.md](http://GitGuide.md)

Git運用ルール。

コミット粒度、コミットメッセージ、Push、タグ、Releaseの考え方を定義する。

### 04_[CodingConvention.md](http://CodingConvention.md)

コーディング規約。

命名規則、import順、型定義、Reactコンポーネント、hooks、services、repositoriesの扱いを定義する。

### 05_[FolderStructure.md](http://FolderStructure.md)

フォルダ構成の説明。

各フォルダに何を置くか、何を置いてはいけないかを定義する。

### 06_GGM_[TicketTemplate.md](http://TicketTemplate.md)

Codexに渡すGGMチケットのテンプレート。

今後の開発依頼はこの形式で作成する。

### 07_[Roadmap.md](http://Roadmap.md)

GUGUMOの開発ロードマップ。

β版、正式版、近畿対応、全国展開、企業版、事業売却準備までの流れを整理する。

### 08_[DecisionLog.md](http://DecisionLog.md)

設計判断の履歴。

なぜその仕様にしたのか、代替案は何か、いつ決定したかを記録する。

### 09_[ProductPrinciples.md](http://ProductPrinciples.md)

GUGUMOのプロダクト思想。

何を重視し、何を作らず、どのような価値を提供するかを定義する。

### 10_[MasterImplementationRoadmap.md](http://MasterImplementationRoadmap.md)

GUGUMOの実装順序、依存関係、GGMチケット計画を定義するマスターロードマップ。

### 11_[BusinessLogicMigrationPlan.md](http://BusinessLogicMigrationPlan.md)

app/page.tsxからServer側へ移行すべきBusiness Logicの棚卸しと移行計画。

### 12_[MultiTenantSnapshotDesign.md](http://MultiTenantSnapshotDesign.md)

法人別利用、Workspace、company_id / workspace_id、Snapshot保存payload、Auth/RLS設計を定義する。

### 13_[LegalComplianceChecklist.md](http://LegalComplianceChecklist.md)

GUGUMOの法務ページ、禁止事項、Cookie / 外部送信、公開前レビュー項目を整理する。

### 14_[SnapshotMigrationPlan.md](http://SnapshotMigrationPlan.md)

Snapshot保存へ移行するためのDB migration / RLS / rollback方針。

### 15_[SnapshotMigrationSqlDraft.md](http://SnapshotMigrationSqlDraft.md)

snapshots / snapshot_rows 作成予定SQL、index、RLS、rollback、実行前確認の下書き。

### 16_[TenantBaseSqlDraft.md](http://TenantBaseSqlDraft.md)

Company / Workspace / Profile のSQL Draft、index、RLS、rollback下書き。

### 17_[TenantSeedPlan.md](http://TenantSeedPlan.md)

開発用Company / Workspace / Profile seed手順、冪等SQL、確認SQL、rollback手順。

---

## 5. GUGUMOの設計思想

GUGUMOは、単なるSaaSではない。

GUGUMOは、SUUMO運用の経験と判断を、誰でも再現できる仕組みにするための運用OSである。

### 5.1 AI APIに依存しない

GUGUMOの中核は、OpenAI APIなどの外部AIではない。

中核は、SUUMO運用ノウハウをルール化した独自の判断エンジンである。

AI風コメントやアドバイスは、当面はルールベースで生成する。

### 5.2 説明可能な判断を重視する

ユーザーには、判定ロジックそのものは開示しない。

ただし、候補になった理由は分かるようにする。

例：

- 競合状況の変化
- 閲覧傾向
- 掲載状況
- オプション配分
- 新着・長期掲載の傾向

具体的な閾値や計算式は表示しない。

### 5.3 毎日開く理由を作る

GUGUMOのホーム画面は、単なるダッシュボードではない。

ユーザーが毎日開いて、今日やることを確認する画面である。

優先すべき表示：

1. 今日やること
2. オプション運用健全性
3. 削減可能額
4. 新着・終了・入替候補
5. AI風運用アドバイス

---

## 6. セキュリティ方針

### 6.1 フロントに出してよいもの

- 画面ラベル
- メニュー名
- 表示用コメント
- 表示用ステータス
- 表示用色設定
- 物件名
- 表示用スコア
- 推奨結果

### 6.2 フロントに出してはいけないもの

- 判定閾値
- スコア算出式
- オプション推奨ロジック
- 健全性スコア計算式
- AIコメント選定ロジック
- 競争優位に関わるルール
- CSV解析上の独自判定ロジック

これらは将来的に `server/` 側へ配置する。

---

## 7. Git運用の基本

開発は原則として以下を守る。

- 1ステップ = 1コミット
- 動作確認後にコミットする
- コミット後にPushする
- 仕様変更とリファクタリングを同じコミットに混ぜない
- コミットメッセージは英語を基本とする

例：

```txt
refactor: extract page title constants
feat: add option health score
fix: correct csv upload error
docs: add development guide
chore: organize project folders

```

---

## 8. Codexに依頼する時の基本形式

Codexには、原則としてGGMチケット形式で依頼する。

例：

```txt
GGM-003: Extract PageId and PAGE_TITLES

Purpose:
Move PageId type and PAGE_TITLES constant out of app/page.tsx.

Scope:
- Create types/page.ts
- Create data/constants/pageTitles.ts
- Update imports in app/page.tsx
- Do not change UI
- Do not change logic

Acceptance Criteria:
- npm run dev succeeds
- localhost works
- page title behavior is unchanged

```

---

## 9. 禁止事項

以下は禁止する。

- Codexが勝手にUIを変更すること
- Codexが勝手に判定ロジックを変更すること
- Codexが勝手に閾値を変更すること
- フロント側に競争優位となるロジックを置くこと
- page.tsxを巨大化させ続けること
- 仕様変更をDecisionLogなしで行うこと
- 動作確認なしでコミットすること

---

## 10. 今後の開発方針

短期的には、既存の `app/page.tsx` を安全に分割する。

中期的には、表示・型・定数・データ・ロジックを分離する。

長期的には、判定ロジックをサーバー側へ移行する。

最終的には、以下の構成を目指す。

```txt
CSV Upload
↓
Supabase Storage
↓
Server-side Analysis
↓
Rule Engine
↓
Recommendation Engine
↓
UI Display

```

---

## 11. Development Bibleの運用ルール

このdocsは、GUGUMOのSingle Source of Truthである。

仕様変更時は、原則として以下の順で進める。

1. DecisionLog更新
2. 関連ドキュメント更新
3. Codexチケット作成
4. 実装
5. 動作確認
6. コミット
7. Push

仕様と実装が異なる場合は、まず仕様を確認する。

仕様が古い場合は、仕様を更新してから実装を修正する。

---

## 12. 最終更新

Version: 1.0  
Status: Active  
Owner: 田中純一  
CTO/Design Reviewer: ChatGPT  
Implementation Agent: Codex
