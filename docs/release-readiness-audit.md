# GUGUMO Release Readiness Audit

作成日: 2026-07-11

対象環境: `/Users/tanakajunichi/Desktop/gugumo-app`

参照禁止環境: `/Users/tanakajunichi/Projects/gugumo-app` は参照・変更していない。

## 2026-07-13 Status Addendum

This document preserves the 2026-07-11 audit findings below as historical context. Current release-readiness state has moved forward:

- Four-table RLS is applied to the formal Supabase project `annvqxnupddnozyghqdw`.
- Server Actions no longer accept raw Supabase access tokens as arguments; authenticated repository queries use request-scoped server clients backed by the user session.
- Role/Tenant Manual E2E passed with one dedicated test Auth user; cleanup completed and the test Auth user was manually deleted.
- Permanent delete authorization is applied and verified. DELETE Gate E2E passed: owner/admin excluded own-tenant DELETE is allowed, while active rows, member, viewer, cross-tenant, and anonymous DELETE remain denied.
- DELETE Gate dedicated Tenant B/C cleanup completed, with no marker residue reported and the test Auth user manually deleted.
- Service Role was not used for the app or E2E gates.

Remaining non-technical-beta release work should be read from current runbooks and checklists, especially production Auth settings, legal/support finalization, and customer onboarding rehearsal.

## 1. Executive Summary

現在のGUGUMOは、営業デモと初期顧客βに近いUI・Auth・Upload lifecycleを備えている。一方で、初期顧客へ実運用として出すには、tenant分離、DB制約、法務文面、Password Reset、運用Runbookの未完了が残る。

監査結果:

- Critical: 3件
- High: 8件
- Medium: 8件
- Low: 5件

Go/No-Go:

- 営業デモ: 条件付きGo。既知リスクを説明できる範囲なら利用可能。
- 初期顧客β: No-Go。RLS、DB制約、Password Reset、法務・運用文書の確定前に実利用開始するのは危険。

良い点:

- オプション管理の正式4分類は、画面表示と内部配列の対応が復元されている。
- Upload除外/有効化は `csv_uploads.id + workspace_id` 単位になっており、file_name/checksum単位更新は見当たらない。
- 新規CSVのchecksum生成はnormalized CSV bodyのSHA-256で実装され、既存checksum NULL行は重複判定対象外になっている。
- CSV生成・CSVコンバーター・住戸名寄せ点数再計算は見当たらない。

## 2. Critical

### C-01 RLSが未有効で、DBレベルのtenant分離が未完了

- 事実: `MASTER_PROGRESS.md` に `RLS disabled` と記録され、`docs/release-readiness.md` でもRLS最終確認は未完了。Repositoryは共有Supabase clientを直接利用している。
- 根拠ファイル・該当箇所: `MASTER_PROGRESS.md:31-37`, `MASTER_PROGRESS.md:98-101`, `docs/release-readiness.md:17-20`, `lib/supabase.ts:1-8`, `src/server/repositories/csvUploadRepository.ts:1`
- 影響: アプリ側でworkspace_idを絞っていても、DBレベルで他tenant参照・更新を防ぐ最終防衛線がない。設定ミスや別経路アクセス時にtenant漏洩リスクが残る。
- 推奨対応: Server User Client方針を確定し、profiles/companies/workspaces/csv_uploadsのRLS policyを実装・検証する。Service Roleは通常操作に使わない。
- 修正規模: L
- リリース阻害かどうか: 初期顧客βでは阻害。営業デモのみなら既知制限として扱える。

### C-02 法務ページがRC暫定文面のままで、契約・個人情報・特商法の正式整合が未完了

- 事実: 利用規約、プライバシーポリシー、データ取扱方針、特商法表記、Cookie、セキュリティが暫定/仮文面として実装されている。専門家確認も未完了。
- 根拠ファイル・該当箇所: `app/legal-content.tsx:24-27`, `app/legal-content.tsx:48-51`, `app/legal-content.tsx:75-78`, `app/legal-content.tsx:140-148`, `app/legal-content.tsx:167-170`, `app/legal-content.tsx:193-201`, `app/legal-content.tsx:225-226`, `docs/13_LegalComplianceChecklist.md:1-8`, `docs/13_LegalComplianceChecklist.md:82-90`
- 影響: 初期費用・月額課金・解約・データ削除・個人情報取扱い・SUUMOや第三者サービスとの関係を契約上説明しきれない。
- 推奨対応: 契約書、利用規約、プライバシーポリシー、データ取扱方針、サポートポリシー、特商法表記要否、免責、第三者サービス非提携表記を次フェーズで正式化する。
- 修正規模: M-L
- リリース阻害かどうか: 有償β・初期顧客実利用では阻害。

### C-03 Data IntegrityのDB制約・FK・Indexが未適用

- 事実: Phase1で追加された `csv_uploads.status` は `text not null default 'active'` だが、`active/excluded` 制約、FK、Indexはdraftのまま。`MASTER_PROGRESS.md` でもConstraint/Index/RLSはPhase1で行わないと記録されている。
- 根拠ファイル・該当箇所: `supabase/sql_editor/20260711_001_csv_uploads_phase1/01_add_columns.sql:11-19`, `supabase/sql_editor/20260710_001_csv_uploads_integrity_draft/03_add_constraints_indexes.sql:12-23`, `supabase/sql_editor/20260710_001_csv_uploads_integrity_draft/03_add_constraints_indexes.sql:82-101`, `MASTER_PROGRESS.md:73-80`
- 影響: DBへ不正statusや存在しないtenant/user idが入る可能性があり、履歴・除外・分析対象選定の前提が崩れる。
- 推奨対応: 03_add_constraints_indexes相当を正DBレビュー後に適用し、status check、FK、workspace/checksum/snapshot_date系Indexを検証する。
- 修正規模: M
- リリース阻害かどうか: 初期顧客βでは阻害。

## 3. High

### H-01 Password Resetが正式実装されていない

- 事実: ログイン画面の「パスワードをお忘れですか？」は準備中メッセージのみ。Release Readinessでも未完了。
- 根拠ファイル・該当箇所: `app/page.tsx:416-424`, `docs/release-readiness.md:17-22`, `docs/release-readiness.md:30-34`
- 影響: 初期顧客がパスワードを忘れた場合、自己復旧できない。
- 推奨対応: Supabase Auth標準のreset password flow、callback route、更新UI、顧客向け成功/失敗文言を実装する。
- 修正規模: M
- リリース阻害かどうか: β公開前必須。

### H-02 tenant未紐付けユーザーの顧客向け状態が未整理

- 事実: ログイン後のworkspace context取得で、tenant未紐付けユーザー専用案内がTODOとして残っている。
- 根拠ファイル・該当箇所: `app/page.tsx:708-724`, `src/server/core/workspaceContext.ts:68-80`
- 影響: 招待済みだがprofile未作成/不整合のユーザーが、何をすべきか分からない状態になる。
- 推奨対応: 未紐付け、role不正、workspace不一致を顧客向けに分けて表示し、サポート導線へつなぐ。
- 修正規模: S-M
- リリース阻害かどうか: 初期顧客招待前に必須。

### H-03 複数CSV保存が非transactionで、途中失敗時に部分保存される

- 事実: `saveCsvUploadRecords` は1件ずつinsertし、途中で失敗するとそれ以前のinsertは残る。
- 根拠ファイル・該当箇所: `src/server/repositories/csvUploadRepository.ts:166-188`, `src/server/actions/csvUploadActions.ts:236-291`
- 影響: 10件まとめてアップロード時、保存済みファイルと未保存ファイルが混在し、分析対象や履歴が利用者の認識とずれる。
- 推奨対応: DB RPCまたはbulk insert + エラーハンドリング方針を決める。最低限、部分保存発生時の顧客向け文言と復旧手順をRunbook化する。
- 修正規模: M
- リリース阻害かどうか: β前に対応推奨。

### H-04 RepositoryがServer User Client化されていない

- 当時の事実: Repositoryは `lib/supabase.ts` の共有clientを直接importしていた。Auth確認にはaccessTokenを使うが、DB query自体にユーザーsession clientを渡していなかった。
- 根拠ファイル・該当箇所: `lib/supabase.ts:1-8`, `src/server/core/auth.ts:27-35`, `src/server/repositories/csvUploadRepository.ts:1`, `docs/19_ServerSupabaseClientDesign.md:48-51`, `docs/19_ServerSupabaseClientDesign.md:156-163`
- 影響: RLS有効化時に `auth.uid()` が成立しない、またはRepository read/writeが拒否されるリスクがある。
- 推奨対応: Server ActionからServer User Clientを生成し、Repositoryに渡すかRepository内部で取得する設計に移行する。
- 修正規模: M-L
- リリース阻害かどうか: RLS導入前の必須作業。

### H-05 現在分析対象取得APIが実装済みだが未使用

- 事実: `getCurrentAnalysisCsvUploadRecord` はactive + 最新snapshot_date + 同日最新created_atで1件を取得するが、画面復元は `getAnalysisCsvUploadRecords` でactive全件を読み込んでUI側で最新を選ぶ。
- 根拠ファイル・該当箇所: `src/server/repositories/csvUploadRepository.ts:87-134`, `src/server/actions/csvUploadActions.ts:127-172`, `app/page.tsx:806-826`
- 影響: 分析対象選定の責務がRepository/UIに分散し、件数増加時にpayloadと責務境界が悪化する。
- 推奨対応: Dashboard用の現在分析対象取得と、推移用の履歴取得を明確に分ける。週次/月次で必要な過去データ範囲も明文化する。
- 修正規模: M
- リリース阻害かどうか: β前に整理推奨。

### H-06 分析用取得がactive全件の`file_data`を読む

- 事実: `getAnalysisCsvUploadRecords` はworkspace内のactive全件を `file_data` 付きで取得する。現行JSON保存のpayload肥大は既に技術的負債として認識されている。
- 根拠ファイル・該当箇所: `src/server/repositories/csvUploadRepository.ts:87-100`, `src/server/actions/csvUploadActions.ts:152-170`, `MASTER_PROGRESS.md:69-70`
- 影響: Upload履歴が増えるほど復元が重くなり、Server Action body/payload問題が再燃する。
- 推奨対応: 原本CSV保存、snapshot_rows、列指向保存、集計済みsnapshotのいずれかへ移行方針を決める。
- 修正規模: L
- リリース阻害かどうか: 初期β少量なら許容可能だが、運用開始前に上限とRunbookが必要。

### H-07 重要操作が`alert`/`confirm`中心で、業務UIとして弱い

- 事実: 重複CSV警告、保存失敗、CSV読込失敗、除外/有効化確認がブラウザ標準alert/confirmで実装されている。
- 根拠ファイル・該当箇所: `app/page.tsx:865`, `app/page.tsx:892-904`, `app/page.tsx:916-956`, `app/page.tsx:967-1008`, `docs/release-readiness.md:5-15`
- 影響: 営業デモ中の見え方が弱く、顧客が判断内容を後から確認できない。
- 推奨対応: GUGUMO UI内の確認ダイアログ、失敗banner、重複warning panelへ移行する。
- 修正規模: M
- リリース阻害かどうか: β前に対応推奨。

### H-08 Release Readinessチェックリストが全て未チェック

- 事実: `docs/release-readiness.md` は存在するが、エラー、空状態、Password Reset、RLS、招待、Runbook、バックアップ、監査ログ、Go/No-Goが未完了のまま。
- 根拠ファイル・該当箇所: `docs/release-readiness.md:5-38`
- 影響: 初期顧客βの開始判断が属人的になる。
- 推奨対応: 各項目にOwner、完了条件、確認日、証跡を付ける。
- 修正規模: S-M
- リリース阻害かどうか: β判定前に必須。

## 4. Medium

### M-01 Recommendation内に独自の内部スコア式が存在する

- 事実: スマピク推薦で `score` と `priorityScore` を計算して並び替えている。画面にスコアは表示されていないが、独自スコア禁止方針との整合確認が必要。
- 根拠ファイル・該当箇所: `src/server/engines/recommendation/recommendationBuilder.ts:12-61`, `src/server/types/analysis.ts:9`, `MASTER_PROGRESS.md:84-85`
- 影響: ユーザー承認済みの業務仕様か不明な場合、仕様逸脱として扱われ得る。
- 推奨対応: Recommendation Engineの現行式を「既存仕様」として承認するか、別Sprintで仕様レビューする。
- 修正規模: M
- リリース阻害かどうか: 営業デモは可。β前に仕様承認推奨。

### M-02 `app/page.tsx` が巨大で責務が集中している

- 事実: `app/page.tsx` は1751行あり、Auth、CSV hash、Upload保存、履歴、分析、UI描画、設定localStorageをまとめて持っている。
- 根拠ファイル・該当箇所: `app/page.tsx:1-1751`, `README.md:3-17`, `docs/README.md:383-389`
- 影響: 仕様ラベルやData Integrity修正時に、UI変更と業務仕様変更が混ざりやすい。
- 推奨対応: 画面コンポーネント、Upload workflow、Auth state、Dashboard view modelを段階分割する。
- 修正規模: L
- リリース阻害かどうか: 直接阻害ではないが、保守リスク大。

### M-03 READMEが初期Next.jsテンプレートのまま

- 事実: READMEはcreate-next-app文言が残り、GUGUMOの起動、環境、Supabase、β運用手順がまとまっていない。
- 根拠ファイル・該当箇所: `README.md:1-51`
- 影響: 正式環境・旧環境・Supabase Project IDの誤認が再発しやすい。
- 推奨対応: READMEをGUGUMO専用に更新し、正式環境パス、正DB、起動、検証、禁止事項を明記する。
- 修正規模: S-M
- リリース阻害かどうか: β前に対応推奨。

### M-04 MASTER_PROGRESSに古いSprint/commit情報が残っている

- 事実: `Latest Completed Commit` が `b02198f` のままで、現在の直近commit `f630ea2` と一致していない。Current Uncommitted Changesも古い内容を含む。
- 根拠ファイル・該当箇所: `MASTER_PROGRESS.md:7-24`, `git log --oneline -20`
- 影響: ChatGPT/Codex引き継ぎ時に、現在地を誤る。
- 推奨対応: 進捗メモをスプリント単位で整理し、最新commit、未コミット差分、正DB、未完了項目を更新する。
- 修正規模: S
- リリース阻害かどうか: 直接阻害ではないが、運用ミス要因。

### M-05 既存22件のchecksum NULLは重複検知対象外

- 事実: 既存22件はchecksum NULLのまま正常扱いで、重複検知対象外。新規Uploadのみchecksum保存される。
- 根拠ファイル・該当箇所: `MASTER_PROGRESS.md:75-81`, `app/page.tsx:224-233`, `src/server/actions/csvUploadActions.ts:414-422`
- 影響: 既存データと同一CSVを再アップロードしても警告されない可能性がある。
- 推奨対応: 既存CSV原本がある場合は再アップロードでchecksum付与するか、canonical JSON checksumを別扱いで導入するか決める。
- 修正規模: M
- リリース阻害かどうか: 初期βでは既知制限として説明が必要。

### M-06 snapshot_date欠落時のfallbackが残っている

- 事実: 保存済みCSV復元で `snapshot_date` がない場合、file_name日付、さらにcreated_atへfallbackする。
- 根拠ファイル・該当箇所: `src/server/services/upload/uploadSnapshots.ts:61-80`
- 影響: backfill漏れや壊れた行があっても、画面が静かに別日付として表示される可能性がある。
- 推奨対応: Phase1適用後はsnapshot_date必須前提に寄せ、欠落行は履歴でエラー状態にする。
- 修正規模: S-M
- リリース阻害かどうか: 直接阻害ではないがData Integrity上のリスク。

### M-07 Cookie/Securityページが存在するが主要法務リンクには含まれていない

- 事実: `/cookie` と `/security` はページとして存在するが、`LEGAL_LINKS` は5ページのみ。
- 根拠ファイル・該当箇所: `app/cookie/page.tsx:1-8`, `app/security/page.tsx:1-8`, `data/product/productMeta.ts:7-28`
- 影響: 外部送信やセキュリティ方針を顧客が発見しづらい。
- 推奨対応: 公開するページ範囲を決め、リンクに含めるか非公開にする。
- 修正規模: S
- リリース阻害かどうか: 法務正式化時に要対応。

### M-08 自動テストが未整備

- 事実: `package.json` にtest scriptがなく、検証はlint/buildと手動E2E中心。
- 根拠ファイル・該当箇所: `package.json:5-10`
- 影響: 業務ラベル、Upload lifecycle、分析対象選定の回帰を自動検知できない。
- 推奨対応: 最小でもCSV parsing、option 4分類、analysis target selection、upload status updateのunit/integration testを追加する。
- 修正規模: M
- リリース阻害かどうか: 初期β前に一部導入推奨。

## 5. Low

### L-01 `.DS_Store` がリポジトリ内に存在する

- 事実: `.DS_Store` が複数箇所に存在する。
- 根拠ファイル・該当箇所: `./.DS_Store`, `app/.DS_Store`, `supabase/.DS_Store`, `supabase/sql_editor/.DS_Store`
- 影響: 動作影響はないが、不要ファイル混入。
- 推奨対応: `.gitignore`確認後、レビュー付きで削除する。
- 修正規模: S
- リリース阻害かどうか: いいえ。

### L-02 product metaのbuild日付が古い

- 事実: `buildLabel` が `Build: 2026-06-27` のまま。
- 根拠ファイル・該当箇所: `data/product/productMeta.ts:1-5`
- 影響: サイドバー等で表示する場合、実ビルドとズレる。
- 推奨対応: 表示要否を決め、表示するならビルド時注入へ移行する。
- 修正規模: S
- リリース阻害かどうか: いいえ。

### L-03 docsが複数世代の設計書を含み、SSOTが曖昧

- 事実: `docs/README.md` はdocsをSingle Source of Truthとするが、Architecture/DecisionLog/Roadmapが番号付き・非番号付きで複数存在する。
- 根拠ファイル・該当箇所: `docs/README.md:1-18`, `docs/README.md:410-420`, `find docs -maxdepth 2 -type f`
- 影響: 古い仕様を読んで実装するリスクがある。
- 推奨対応: docs indexに「現行」「Archive候補」「参照禁止/過去設計」を明記する。
- 修正規模: S-M
- リリース阻害かどうか: いいえ。ただし再発防止として重要。

### L-04 誤DB Project IDの記録が残っている

- 事実: `ivtaxvuysqqnzpnwndqt` は誤適用された別DBとして記録されている。
- 根拠ファイル・該当箇所: `MASTER_PROGRESS.md:71-72`
- 影響: 記録としては正しいが、読む人が対象DBと誤認する可能性がある。
- 推奨対応: READMEまたは環境台帳で「正DB」「誤DB」「触らないDB」を独立して表にする。
- 修正規模: S
- リリース阻害かどうか: いいえ。

### L-05 顧客向け画面に一部英字・内部寄り表現の余地がある

- 事実: 顧客UIは概ね日本語化済みだが、技術ドキュメントやREADMEにはRepository/Rule Engineなどの内部語が残る。画面側の検索では顧客向け禁止語の大きな残存は見当たらない。
- 根拠ファイル・該当箇所: `README.md:3-17`, `docs/20_ReleaseEpic9UiPolish.md:49-56`, `app/page.tsx:1450-1510`
- 影響: 顧客UIへの直接影響は小さいが、デモ資料やREADME共有時には注意が必要。
- 推奨対応: 顧客に見せる文書と開発文書を分離する。
- 修正規模: S
- リリース阻害かどうか: いいえ。

## 6. 未確認事項

- 実ブラウザでの全画面E2E。今回の監査は主にコード・docs・SQL draftの静的確認であり、現在の画面操作は未実施。
- Supabase Dashboard上のAuth設定、Redirect URL、Email template、Password Resetメール送信の実設定。
- 正DB `annvqxnupddnozyghqdw` の現在RLS/権限状態。今回はSQL実行・DB変更禁止のため、現DBへ問い合わせていない。
- Upload除外/有効化/重複warningの最新差分に対する実CSV E2E。
- モバイル実機/狭幅ブラウザでの法務ページ、Upload履歴、長いファイル名、長い物件名の視覚確認。
- 顧客契約書、申込書、請求条件、解約条項、データ削除条項の実文書。
- SUUMOや第三者サービスとの商標・非提携表記の正式確認。
- バックアップ/復元、監査ログ、障害時Runbookの実運用担当者とSLA。

## 7. 推奨実施順序

1. Criticalを先に閉じる: RLS/Server User Client、DB制約/FK/Index、法務正式化。
2. Auth運用を完成させる: Password Reset、tenant未紐付けユーザー案内、招待フロー。
3. Data Integrityを安定化する: partial save対策、payload方針、snapshot_date必須化、既存checksum方針。
4. UI運用品質を上げる: alert/confirmをGUGUMO UIへ置換、エラー/空/読み込み状態のE2E確認。
5. ドキュメント整備: README、MASTER_PROGRESS、release readiness checklist、Runbook、Go/No-Go証跡。
6. 回帰テスト追加: option 4分類、analysis target selection、upload lifecycle、workspace権限。
7. 初期顧客βのGo/No-Goレビューを実施する。

## 8. Go/No-Go判定

現時点の判定: No-Go for 初期顧客実利用β。

理由:

- RLSが未有効で、DBレベルtenant分離が未完成。
- DB制約/FK/Indexが未適用で、Data Integrityの防御がアプリ実装に寄っている。
- Password Reset、Runbook、バックアップ、監査ログ、招待フローが未完了。
- 法務文面がRC暫定で、契約・データ取扱・特商法・サポート条件が正式化されていない。

営業デモは条件付きGo:

- デモ用workspaceとデータで実施する。
- β前未完了事項を営業説明で過度に約束しない。
- 実顧客データを扱う場合は、RLS/法務/削除方針が整うまで範囲を限定する。
