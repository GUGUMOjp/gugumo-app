# GUGUMO Master Implementation Roadmap v1.0

## 0. 目的

このドキュメントは、GUGUMOの実装順序、依存関係、GGMチケット管理の基準を定義する。

GUGUMOは単なる分析ツールではなく、賃貸仲介会社が毎日5分で今日やるべき掲載運用を判断できる運用OSである。

そのため、実装は画面単位ではなく、Server First、Rule Based、Business Logic分離を前提に進める。

---

## 1. 基本方針

* 1チケット = 1コミット
* 新チケット開始前に `git status --short` が原則クリーンであること
* Frontendは表示のみ
* Business LogicはServer配下へ集約
* 判定ロジック、閾値、計算式、Advice選択ロジックはFrontendへ置かない
* OpenAI APIへ依存しない
* Adviceはまずルールベースで生成する
* 全国展開を前提に駅分析を基本単位とする
* 行政区は補助情報として扱う

---

## 2. 実装フェーズ全体像

### Phase 0: 開発基盤

目的: 安全に開発を進めるための基盤整備。

* GGM-000: 開発ベースライン復旧
* GGM-001: Server Firstアーキテクチャ基盤整備
* GGM-002: Development Bible Git管理
* GGM-003: Master Implementation Roadmap追加
* GGM-004: Codex運用ルールv2追加
* GGM-005: Git運用ルールv2追加
* GGM-006: FolderStructure更新
* GGM-007: Decision Log運用整理

---

### Phase 1: 型・定数・データ構造整理

目的: 今後のServer分離前に、型・定数・画面ID・ページタイトルを整理する。

* GGM-010: PageId型の正式定義
* GGM-011: PAGE_TITLES定数分離
* GGM-012: Navigation定義分離
* GGM-013: UI表示用定数とBusiness定数の分離
* GGM-014: 共通型の配置整理
* GGM-015: data配下の責務整理

---

### Phase 2: CSV基盤

目的: CSV取込から正規化までをServer側の責務として整備する。

* GGM-020: CSV型定義
* GGM-021: CSV Parser基盤
* GGM-022: CSV Validation基盤
* GGM-023: CSV Normalizer基盤
* GGM-024: CSV Repository Interface作成
* GGM-025: CSV Upload処理の責務整理
* GGM-026: CSV履歴管理方針整理
* GGM-027: Shift-JIS / UTF-8処理方針整理

---

### Phase 3: Rule Engine

目的: SUUMO掲載最適化の判定ロジックをServer側へ集約する。

* GGM-030: Rule Engine Interface作成
* GGM-031: 掲載可否ルール基盤
* GGM-032: SUUMO採点37点ルール実装
* GGM-033: 重複掲載判定ルール実装
* GGM-034: 最安値判定ルール実装
* GGM-035: 金額範囲ルール実装
* GGM-036: 間取り重複ルール実装
* GGM-037: Rule結果型定義
* GGM-038: Rule Engine統合テスト方針整理

---

### Phase 4: Health Engine

目的: 掲載健全性を定量的に評価する基盤を作る。

* GGM-040: Health Engine Interface作成
* GGM-041: 掲載健全性スコア設計
* GGM-042: 物件単位Health算出
* GGM-043: 店舗単位Health算出
* GGM-044: オプション過不足Health算出
* GGM-045: 重複・低品質掲載Health算出
* GGM-046: Health結果型定義

---

### Phase 5: Advice Engine

目的: 14日比較を基本に、AI風アドバイスをルールベースで生成する。

* GGM-050: Advice Engine Interface作成
* GGM-051: Advice Template構造設計
* GGM-052: 14日比較ロジック基盤
* GGM-053: 掲載改善Advice生成
* GGM-054: オプション削減Advice生成
* GGM-055: エリア偏りAdvice生成
* GGM-056: 重複掲載Advice生成
* GGM-057: Advice優先順位付け
* GGM-058: Advice結果型定義

---

### Phase 6: Recommendation Engine

目的: 今日やるべきことを提示する運用OSの中核を作る。

* GGM-060: Recommendation Engine Interface作成
* GGM-061: 今日やること生成ロジック
* GGM-062: 入替対象推薦
* GGM-063: 掲載継続推薦
* GGM-064: オプション停止推薦
* GGM-065: オプション追加推薦
* GGM-066: 優先度スコア設計
* GGM-067: Recommendation結果型定義

---

### Phase 7: Dashboard統合

目的: Server側の結果をFrontendへ渡し、Frontendは表示に徹する。

* GGM-070: Dashboard ViewModel設計
* GGM-071: Home画面の責務整理
* GGM-072: 今日やること表示
* GGM-073: Health表示
* GGM-074: Advice表示
* GGM-075: Recommendation表示
* GGM-076: 表示コンポーネント分離

---

### Phase 8: 週次・月次分析

目的: 日次運用から週次・月次改善へ拡張する。

* GGM-080: Weekly Report型定義
* GGM-081: Weekly集計ロジック
* GGM-082: Monthly Report型定義
* GGM-083: Monthly集計ロジック
* GGM-084: 物件別推移分析
* GGM-085: エリア配分分析
* GGM-086: オプション収支分析

---

### Phase 9: Supabase / 永続化

目的: CSV履歴、顧客設定、分析結果を保存できる構造へ拡張する。

* GGM-090: Supabase Repository方針整理
* GGM-091: Company Model設計
* GGM-092: User Model設計
* GGM-093: CSV History Model設計
* GGM-094: Analysis Result Model設計
* GGM-095: Settings Model設計
* GGM-096: RLS方針整理
* GGM-097: Repository実装

---

### Phase 10: 全国展開

目的: 近畿から全国対応へ拡張できる駅・エリア基盤を作る。

* GGM-100: Station Master設計
* GGM-101: Railway Master設計
* GGM-102: Area補助情報設計
* GGM-103: 近畿駅データ整備
* GGM-104: 駅別分析基盤
* GGM-105: 駅別競争度分析
* GGM-106: 全国展開データ方針整理

---

### Phase 11: 商用化

目的: SaaSとして販売・運用できる状態にする。

* GGM-110: 契約状態Model設計
* GGM-111: プラン管理設計
* GGM-112: Stripe連携方針整理
* GGM-113: 利用制限設計
* GGM-114: 顧客管理画面設計
* GGM-115: 権限管理設計
* GGM-116: 解約・停止フロー設計

---

### Phase 12: Production運用

目的: 本番運用に耐える監視・保守・品質管理を行う。

* GGM-120: Error Logging方針
* GGM-121: Monitoring方針
* GGM-122: Backup方針
* GGM-123: Performance計測
* GGM-124: Security Review
* GGM-125: Release Checklist
* GGM-126: Incident Response方針

---

## 3. 依存関係

基本依存関係は以下。

```text
型・定数整理
  ↓
CSV基盤
  ↓
Rule Engine
  ↓
Health Engine
  ↓
Advice Engine
  ↓
Recommendation Engine
  ↓
Dashboard統合
  ↓
週次・月次分析
  ↓
Supabase永続化
  ↓
全国展開
  ↓
商用化
  ↓
Production運用
```

---

## 4. MVP定義

MVPでは以下を満たす。

* CSVを読み込める
* 掲載可否の最低限ルールが動く
* SUUMO採点37点未満を検出できる
* 重複掲載を検出できる
* 今日やることが表示される
* Adviceがルールベースで表示される
* FrontendへBusiness Logicを置かない

---

## 5. β版定義

β版では以下を満たす。

* CSV履歴を扱える
* 14日比較ができる
* Health Scoreが表示される
* Advice Engineが複数カテゴリに対応する
* Recommendation Engineが今日の優先タスクを出せる
* 週次レポートが表示される
* オプション削減提案が表示される

---

## 6. 正式版定義

正式版では以下を満たす。

* 顧客ごとのデータ管理
* Supabase永続化
* 契約管理
* 権限管理
* 駅別分析
* 近畿エリア対応
* 本番監視
* バックアップ
* 障害対応方針

---

## 7. 実装優先順位

最優先は以下。

1. 開発基盤の安定
2. 型・定数整理
3. CSV基盤
4. Rule Engine
5. Health Engine
6. Advice Engine
7. Recommendation Engine
8. Dashboard統合
9. Supabase永続化
10. 全国展開

画面追加よりも、Business Logicの責務分離を優先する。

---

## 8. 運用ルール

* 新チケット開始前に作業ツリーを確認する
* 未追跡ファイルがある場合は先に整理する
* 変更許可ファイルを明記する
* 変更禁止ファイルを明記する
* lint/buildを確認する
* commit前に `git diff --cached --name-only` を確認する
* push前にCTOレビューを行う

---

## 9. このRoadmapの位置づけ

`docs/07_Roadmap.md` は中長期の事業・開発ロードマップ。

`docs/10_MasterImplementationRoadmap.md` は実装順序とGGMチケット管理の基準。

今後の実装はこのMaster Implementation Roadmapを優先して進める。
