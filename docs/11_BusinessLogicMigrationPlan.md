# Business Logic Migration Plan v1.0

## 0. 目的

このドキュメントは、`app/page.tsx` に残っているBusiness LogicをServer側へ段階的に移行するための計画を定義する。

GUGUMOの競争優位は、CSV解析、掲載判定、Health算出、Advice生成、Recommendation生成にある。

そのため、これらの判定・計算・集計ロジックはFrontendへ置かず、Server配下へ集約する。

---

## 1. 移行対象の基本方針

以下はServer側へ移行する。

* CSV解析
* CSV正規化
* CSV Validation
* 数値正規化
* ID正規化
* 掲載判定
* スコア計算
* 集計
* Rule判定
* Health算出
* Advice生成
* Recommendation生成

以下はFrontendに残してよい。

* UI状態
* 表示切替
* クリック処理
* CSS class生成
* Presentation専用の表示制御

---

## 2. 現在の主なBusiness Logic

### CSV関連

* `CsvRow`, `CsvSnapshot`, `CsvSummary`
* `splitCsvLine`
* `parseCsv`
* `extractDataDate`
* `readCsvFile`
* `loadFiles`

### 正規化・アクセサ

* `toNumber`
* `normalizeId`
* `isOn`
* `C`

### 集計

* `buildSummary`
* `buildDayDiffs`
* `buildWeekly`
* `buildMonthly`
* `buildPropertyHistories`
* `analyzeRows`
* `computeOptionBalance`
* `computeAreaAllocation`
* `currentWardCounts`

### Recommendation候補

* `lowPvRows`
* `removeAllRows`
* `lowerToSecondRows`
* `raiseToSecondRows`
* `raiseToThirdRows`
* `topBySmartScore`
* `topByPriority`
* `finalRecommended`
* `smapicAdd`
* `smapicRemove`

### Health候補

* 低PV判定
* 低反響判定
* オプション無駄判定
* 節約額計算
* エリア過不足判定

### Rule候補

* SUUMO採点37点判定
* 掲載中判定
* 重複判定
* 最安値判定
* 金額範囲判定
* オプション調整ルール

---

## 3. 移行優先順位

| 優先度 | 対象 | 移行先候補 |
| --- | --- | --- |
| H | CSV解析・正規化 | `src/server/services/csv` |
| H | CSV型定義 | `src/server/types` |
| H | 数値・ID正規化 | `src/server/shared` / `src/server/utils` |
| H | CSV列アクセサ | `src/server/services/csv` |
| H | `analyzeRows` | `src/server/services/analysis` |
| H | 低PV・入替判定 | `src/server/rules` / `src/server/engines/recommendation` |
| H | オプション判定 | `src/server/rules` / `src/server/engines/recommendation` |
| H | スマピク推奨スコア | `src/server/engines/recommendation` |
| H | オプション収支 | `src/server/engines/health` |
| M | 週次・月次集計 | `src/server/services/reports` |
| M | エリア配分 | `src/server/services/area` |
| M | アラート件数生成 | `src/server/engines/advice` |

---

## 4. 推奨移行順

### Step 1: CSV基盤

* CSV型定義
* CSV行分割
* CSV Parser
* CSV日付抽出
* CSVファイル読込補助

### Step 2: 正規化・アクセサ

* `toNumber`
* `normalizeId`
* `isOn`
* `C`

### Step 3: 基本集計

* `buildSummary`
* `buildDayDiffs`
* `buildWeekly`
* `buildMonthly`
* `buildPropertyHistories`

### Step 4: 分析中核

* `analyzeRows`
* `computeOptionBalance`
* `computeAreaAllocation`

### Step 5: Engine化

* Rule Engine
* Health Engine
* Advice Engine
* Recommendation Engine

---

## 5. 移行時のルール

* 1チケットで移す対象は1責務のみ
* UI表示は変更しない
* 既存の計算結果を変えない
* まず関数移動のみを行う
* 移動後にEngine設計へ進む
* 判定ロジックをFrontendへ戻さない
* app/page.tsxからimportして使う形に一時的にしてよい
* 最終的にはServer側でViewModel生成まで行う

---

## 6. 次に実施するチケット

次は以下を実施する。

```text
GGM-008 CSV Types分離
```

対象:

* `CsvRow`
* `CsvSnapshot`
* `CsvSummary`

移行先候補:

```text
src/server/types/csv.ts
```

目的:

CSV関連型をServer側へ移し、CSV Parser / Analyzerの土台を作る。
