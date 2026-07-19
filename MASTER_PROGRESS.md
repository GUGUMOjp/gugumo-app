# GUGUMO Master Progress

## Project

GUGUMO

## Current Sprint

Beta Release Gate: CSV guardrails, sidebar UX, onboarding and authorization verification

## Legal / Support Public Preview Alignment (2026-07-14)

- Updated the six public legal/support pages: `/terms`, `/privacy`, `/data-policy`, `/support`, `/legal`, and `/security`.
- Added page-specific metadata, the common last-updated date `2026年7月14日`, and accessible navigation between all six pages, `https://gugumo.jp`, and `https://app.gugumo.jp`.
- Separated inquiry channels: `info@gugumo.jp` for introduction/general/legal/privacy/pre-contract inquiries and `support@gugumo.jp` for contracted/current-user operation, defect, account, login, CSV, data/history, and security-incident inquiries.
- Replaced the outdated staged-security wording with repository-backed facts about authentication, company/workspace boundaries, owner/admin/member/viewer roles, viewer write restrictions, owner/admin upload lifecycle controls, tenant access control, and no Service Role in normal application processing.
- Added neutral public-preview wording for SUUMO non-affiliation, no automatic listing/option changes, CSV-content dependency, and no guarantee of inquiries, contracts, sales, profit, or cost reduction. Option cost-effectiveness amounts are described as decision-support information.
- Kept four items deferred: minimum term/renewal, early cancellation/refunds/prorating, data retention/post-contract deletion, and the publication method for address/telephone details.
- Formal pricing, payment, support hours, response deadlines, backup retention, deletion timing, cross-border handling, and final legal applicability remain unconfirmed and are not asserted in public copy.
- This is a provisional public-preview alignment before counsel review, not final legal acceptance for paid or broad release.
- No Supabase, SQL, migration, environment-variable, deployment, DNS, or production-data operation is part of this change.

## Monthly Forecast Regression Coverage (2026-07-19)

- Monthly forecasts are the month-end landing projection: cumulative period results divided by elapsed calendar days from month start through the latest data date, multiplied by the target month calendar days.
- Added regression tests for 28, 29, 30, and 31 day months, month-end completion behavior, zero cumulative values, and the shared weekly seven-day projection design.
- No analysis logic, DB, SQL, RLS, Auth, CSV storage, or production code changes were made for this coverage update.

## Latest Completed Commit

a50a82c Finalize CAPTCHA decision for technical beta

## Current Uncommitted Changes

Sprint開始時点はclean。Technical Beta Readiness Final Closeoutとして、2026-07-13 Production実メール確認結果をCurrent docsへ反映中。

## Build Status

- Pre-sprint baseline: success (`npm run lint`, `npm run build`)
- Current sprint: option balance/permanent delete/history merge tests, `git diff --check`, `npm run lint`, and `npm run build` passed after DELETE Gate completion documentation update.
- CSV guardrails code has passed static lint/build in this sprint; real customer CSV broad QA remains a Release Gate item.

## DB Status

- Formal Supabase Project: GUGUMOjp's Project `annvqxnupddnozyghqdw`
- Forbidden/old project: `ivtaxvuysqqnzpnwndqt`
- 4-table RLS applied: `companies`, `workspaces`, `profiles`, `csv_uploads`
- anonymous REST blocked on 5 paths: `companies`, `workspaces`, `profiles`, `csv_uploads`, `csv_uploads?select=file_data`
- authenticated JWT propagation repaired with user-scoped client injection
- Owner read/write E2E passed: bootstrap, saved CSV read, duplicate warning + insert, logical exclusion update
- Role/Tenant Manual E2E passed on 2026-07-12 with one dedicated test Auth user whose `profiles.role` was switched through owner/admin/member/viewer.
- owner/admin/member/viewer Home role display after logout/login: PASS.
- csv_uploads role E2E: owner SELECT/INSERT/UPDATE allowed and DELETE denied; admin SELECT/INSERT/UPDATE allowed and DELETE denied; member SELECT/INSERT allowed, UPDATE produced HTTP 200 `[]` with unchanged row, DELETE denied; viewer SELECT allowed, INSERT denied, UPDATE produced HTTP 200 `[]` with unchanged row, DELETE denied.
- tenant boundary E2E passed: tenant A SELECT returned HTTP 200 `[]`; fake company_id INSERT, fake workspace_id INSERT, uploaded_by spoof, company_id cross-tenant UPDATE, and workspace_id cross-tenant UPDATE were denied.
- Test tenant cleanup completed with 0 residual rows in `companies`, `workspaces`, `profiles`, and `csv_uploads`; the dedicated test Auth user was manually deleted in Supabase Dashboard.
- Existing tenant A and existing formal accounts were not changed. Service Role was not used. Repository SQL templates remain placeholders and contain no real test UUIDs, email addresses, JWTs, API keys, or Service Role keys.
- Permanent delete authorization is applied in formal DB and post-apply verification passed. Owner/admin excluded own-tenant DELETE passed; active row, member, viewer, cross-tenant, and anonymous DELETE were denied with row persistence confirmed. Browser permanent-delete flows passed: active rows hide `完全削除`, excluded rows show `有効に戻す` / `完全削除`, confirmation/cancel works, deleted rows do not return after reload, excluded rows remain in history but stay out of analysis, duplicate metadata recalculates, and analysis screens have no stale deleted data.
- DELETE Gate dedicated Tenant B/C cleanup completed with no marker/test data residue, and the dedicated DELETE Gate test Auth user was manually deleted from Supabase Dashboard. Existing formal accounts, existing tenant data, and Service Role were not used or changed.
- CSV upload history now distinguishes exact duplicate content from same-name files before permanent-delete review: exact duplicate uses workspace + non-empty checksum, same-name uses file_name with different/unknown content, checksum NULL is not treated as exact content match, and no DB schema/RLS change is introduced.
- Customer Onboarding Rehearsal passed on 2026-07-13 in Production. Signup OFF plus Send invitation worked; missing profile state stopped safely; linked owner profile bootstrapped the rehearsal tenant; existing Demo CSV history was not visible; SUUMO CSV upload/save/Home reflection/exclude/restore/duplicate warning/cancel passed; rehearsal tenant rows and Auth user were manually cleaned up by human Dashboard operation.
- Customer-facing pending provisioning UX now uses `GUGUMOアカウントを準備しています` for profile-not-yet-created state. Unexpected profile/company/workspace configuration errors remain a separate safe error path.
- Invite user template localization and Supabase Dashboard save are complete. 2026-07-13 Production human verification passed for Japanese HTML Invite actual delivery, Gmail inbox receipt, Japanese subject/body, HTML rendering, GUGUMO logo rendering, and CTA rendering. Historical English-template Invite ConfirmationURL/link flow E2E passed; the latest Japanese HTML Invite CTA click-through E2E was not re-executed in this closeout.
- Password Reset Japanese HTML email passed 2026-07-13 Production human verification: actual delivery, email receipt, Japanese copy, HTML rendering, and GUGUMO logo rendering. Existing Password Reset Production E2E remains the flow evidence.
- Legal / Support final acceptance for limited Technical Beta completed at repository level: customer-facing pages no longer show visible RC/provisional labels, support points to the individually provided onboarding/contact channel, and paid/broad beta formal legal review remains a later gate.

## Migration Status

- `20260627_001_initial_tenant_schema.sql` exists
- rollback file exists
- no migration execution in this sprint
- no new migration in this sprint

## Auth Status

- Production URL: `https://app.gugumo.jp`.
- Password Reset code path implemented and redirects to `/?reset-password=1`.
- Password Reset Production E2E passed on 2026-07-13: Custom SMTP/Resend email delivery, production callback, password update, Home bootstrap, company/workspace/owner role display, and existing analysis display.
- Supabase Site URL and Redirect URLs are configured for `https://app.gugumo.jp`, `https://app.gugumo.jp/?reset-password=1`, `http://localhost:3000`, and `http://localhost:3000/?reset-password=1`.
- Production Auth manual settings confirmed: Signup OFF, anonymous sign-in OFF, email/password only, password minimum length 8, Reset Password email localized, Resend Custom SMTP active.
- Vercel Production must keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a matched pair from GUGUMOjp's Project `annvqxnupddnozyghqdw`; a 2026-07-13 preflight failure was caused by an old, incorrect Supabase project connection.
- Authenticated app data access must use user JWT. Service Role remains prohibited for app/E2E.

## Current Blocker

- Technical Beta GO for limited, manually supported first customer.
- Technical Beta前P0: 0.
- Technical Beta前P1: 0.
- CAPTCHA final decision completed: `CAPTCHA_DEFER_WITH_GATES`. Public signup and anonymous sign-in remain OFF, Technical Beta is limited/manual, and no CAPTCHA provider or env change is required before the first customer. Invite email post-localization delivery check is CLOSED by 2026-07-13 Production human verification. Paid/broad beta remains blocked until formal legal review, monitoring/backup posture, and formal customer terms are resolved.

## Current Next Action

- Review and commit Technical Beta Readiness Final Closeout docs if approved.
- Before first real customer invite: create company/workspace first, send Invite, create profile as soon as the Auth UID is available, verify tenant relationships, then contact the customer that GUGUMO is ready to use. Keep one-owner manual onboarding flow and monitor invite/reset delivery. If desired, use the first customer invite as a smoke check for latest Japanese HTML CTA click-through; do not treat it as a pre-beta P1 blocker.

## Latest Implementation Note

- Authenticated help centerを追加し、認証後ヘッダーから「ご利用ガイド」へ到達できる導線を用意。role別権限（owner/admin/member/viewer）、月次予測の当月日数方式、CSVの利用者向け6MB/8MB制限、Option ROI（枠削減額・入替最適化額・合計月額）の説明を追加した。
- Help content回帰テストを追加し、section/FAQ ID重複、FAQ件数、`37点` / `CSV` / `viewer` 検索対象、月次当月日数方式、問い合わせ先、必須CSV header、6MB/8MB表記を保護する。`/` から `/help` への導線と `/help` からアプリへ戻る導線を4 viewportで確認済み。表示・案内の追加であり、DB、SQL、Auth、RLS、CSV解析、Rule Engine、Recommendation Engine、Option計算ロジックは変更しない。
- アプリ画面の価値訴求改善として、Homeに分析フローと優先アクション、Upload画面に取込後の処理フロー、空状態と候補0の区別、Option ROIの表示ラベル統一を追加する。表示専用改善であり、分析ロジック、DB、Auth、CSV解析、Rule Engine、Recommendation Engineは変更しない。
- 認証後の実ブラウザ確認は未実施。未追跡ファイルがworking treeに残っている状態で、`git diff --check`、`npm run lint`、`npx tsc --noEmit`、`npm test`、`node --test scripts/run-option-balance-tests.cjs`、`npm run build` はPASS。

- Beta Upload UX Integrityとして、DB Schema変更なしでUpload履歴表示、ブラウザ上の一時除外、CSV内容hashによる重複警告を追加。
- Upload履歴状態は「有効 / 除外」のみ。重複はCSV状態ではなくUpload時の警告イベントとして扱う。
- 今回の除外はブラウザstate上の一時除外であり、永続化されない。リロード後は保存済みCSV復元により元へ戻る。
- 除外はファイル名やhashではなくUpload履歴の一意な行ID単位で扱う。同一ファイル名の他行には影響しない。
- 除外済みCSVはowner/adminが「有効に戻す」で分析対象候補へ戻せる。
- Upload履歴にはアップロード日時とデータ日付を表示。βではファイル名由来の日付を使い、将来は `snapshot_date` カラムへ移行する。
- 履歴状態は「有効（分析対象） / 有効 / 除外」。有効CSVのうち最新データ日付の1行のみを最新分析対象として示す。
- 完全一致検知はブラウザ保存済みのCSV hashに依存する暫定仕様。
- 恒久対応には `csv_uploads` への `checksum / workspace_id / status / deleted_at / deleted_by` 等の追加が必要。
- 将来的には `csv_uploads` の暫定運用から `snapshots / snapshot_rows` への移行が望ましい。
- Beta Data Integrity Migration Draftとして、`csv_uploads` 拡張SQL案を `supabase/sql_editor/20260710_001_csv_uploads_integrity_draft/` に作成。
- Draftは `01_add_columns` / `02_backfill_existing_rows` / `03_add_constraints_indexes` / `04_enable_rls_later` に分割。Supabaseには未適用。
- RLS有効化は次フェーズ。`csv_uploads` の `company_id / workspace_id / uploaded_by / snapshot_date / checksum / status / excluded_at / excluded_by` backfill方針確定後に実施する。
- `checksum` backfillは既存 `file_data` からSQLだけで安全に再現しにくいため、正規化ルールとアプリ側backfill script方針の確定が必要。
- `snapshots / snapshot_rows` 移行は正式運用前の検討事項として継続。
- Supabase手動SQL適用対象は GUGUMOjp's Project `annvqxnupddnozyghqdw` とする。`.env.local` の `NEXT_PUBLIC_SUPABASE_URL`、`csv_uploads` 22件、Demo Company / Demo Workspace / owner profile の一致を確認済み。
- `ivtaxvuysqqnzpnwndqt` は誤って一部SQLを適用した別DBとして扱い、今回は触らず放置する。
- Data Integrity Phase1 Ready。対象Project `annvqxnupddnozyghqdw` 向けに `supabase/sql_editor/20260711_001_csv_uploads_phase1/` の Add Columns / Backfill / Verify SQL Editor用パッケージを作成。
- Phase1ではConstraint / Index / RLS / Repository変更 / UI変更は行わない。既存 `csv_uploads` 全件を対象に、件数固定ではなく日付抽出・異常データチェックを通したうえでbackfillをSQL Editorで手動適用し、verify後に次フェーズへ進む。
- Data Integrity Phase1 SQLは正DB `annvqxnupddnozyghqdw` へ手動適用済み。Verify結果は `total_csv_uploads=22`、tenant/snapshot/status NULL 0件、`checksum_null_count=22`、除外情報NULL 0件で正常。
- Repository/Server Actionの読み取り型を `company_id / workspace_id / uploaded_by / snapshot_date / checksum / status / excluded_at / excluded_by` 対応へ拡張。既存22件のchecksum NULLは正常扱い。DB status/snapshot_dateベースの分析対象選定・除外永続化は次Sprintで実施する。
- Upload除外/有効化は `csv_uploads.id + workspace_id` 単位のDB更新へ移行。owner/adminのみ実行し、除外時は `status='excluded' / excluded_at / excluded_by`、有効化時は `status='active' / excluded_at=null / excluded_by=null` に更新する。
- 分析対象候補はDB `status` を反映した履歴状態で絞り込み、同一データ日付ではアップロード日時が新しいCSVを採用する。古い `snapshot_date` の後追いUploadは最新分析対象にならない。
- 既存checksum NULL行は重複判定対象外。DB保存済み行の `contentHash` はDB `checksum` のみを使い、localStorage hash fallbackはDB保存済み行へ適用しない。
- `getRecentCsvUploadRecords` は暫定で `limit=100`。Upload履歴が増えた場合に分析対象候補が漏れる可能性があるため、将来的には「履歴表示」と「現在分析対象取得」をRepositoryで分ける。
- Data Integrity Phase2として、重複CSV検知をDB `workspace_id + checksum` 基準へ移行。既存checksum NULL行は対象外のまま維持し、初回はwarning表示のみで保存は継続可能とする。
- 分析用CSV取得を履歴表示用取得から分離。履歴表示はrecent limitを維持し、分析用snapshot取得はactive行を対象にする。
- β版Release Readiness台帳を `docs/release-readiness.md` に追加。Password Reset、RLS、招待フロー、Runbook、バックアップ、監査ログ、Go/No-Go基準を継続管理する。
- 分析カテゴリ名、基準名、判定名、推奨アクション名、SUUMO由来項目名はUI文言ではなく業務仕様として扱う。UX改善、自然な日本語化、抽象化、短文化を理由に、ユーザー明示承認なしで変更しない。
- オプション管理の正式4分類は「全オプションを外す（スマピク以外）」「第2基準まで落とす」「第2基準に上げる」「第3基準に上げる」。`removeAllRows / lowerToSecondRows / raiseToSecondRows / raiseToThirdRows` の対応を変更しない。「第1基準に上げる」は存在しない。
- 週次・月次レポートの途中期間は平均予測方式を使う。週次は `1日平均 × 7日`、月次は `1日平均 × 当月日数` とし、途中期間では「予測前週比 / 予測前月比」、完了期間では「前週比 / 前月比」と表示する。実績累計と予測値を混同しない。
- 週次・月次の途中予測は `実績累計 ÷ 経過暦日数 × 期間日数` で算出する。ただし現在のデータ構造ではCSV未取得日と実績が本当に0だった日を完全には区別できない可能性があるため、CSV未取得日を経過暦日数へ含めるケースでは1日平均および週次・月次予測が実態より低く算出される可能性がある。暦日ベース予測の既知制約として、リリース前総合QAで日付欠損がある期間、CSV未取得日の扱い、実績0日との区別、欠損時の予測表示、顧客向け補足表示の必要性を確認する。
- Release Readiness Critical Phaseとして、Password Reset正式フロー、tenant未紐付けユーザー向け安全画面、現在分析対象1件取得用Repository/Action境界、RLS/DB Integrity SQL Editor draft、権限表、Upload部分失敗設計、法務Inventory、β運用Runbook類を追加。SQL実行・Migration適用・DB変更・Service Role使用は行っていない。
- Release Readiness Critical RLS修復として、正DB `annvqxnupddnozyghqdw` の `companies / workspaces / profiles / csv_uploads` 4テーブルRLS適用、Policy 6件、anon/PUBLIC table/column privilegeなし、`csv_uploads_id_seq` は authenticated `USAGE` only を手動確認済み。anonymous RESTは `companies / workspaces / profiles / csv_uploads / csv_uploads?select=file_data` の5経路で遮断確認済み。
- RLS適用直後に authenticated JWT がRepository DB queryへ伝播せず共有anon clientで実行されるdefectが判明。SQL/RLS/GRANTを弱めず、request-scoped authenticated Supabase clientとRepository client injectionで修復。Server Action引数へSupabase access tokenを渡す暫定transportは廃止し、chunked cookie-backed browser sessionからserver側でuser-scoped clientを作成する。Service Role、global mutable session、singleton `setSession()` は使用していない。
- 修復後Owner E2Eは、Home、company/workspace/role表示、CSV履歴、Dashboard、Weekly、Monthly、Replace、OptionがPASS。最新既存SUUMO CSV再アップロードでchecksum duplicate warning後に保存継続し、csv_uploads INSERT、tenant条件、uploaded_by条件、identity sequence採番、authenticated sequence USAGE、保存後画面反映を確認済み。
- CSV logical exclusion UPDATE E2Eは、owner/adminで更新可能、member/viewerで更新0件または拒否となることをRole/Tenant Manual E2Eで確認済み。
- Post-RLS/JWT修復後の未完了だったadmin/member/viewer実JWT E2Eとtenant越境実データE2Eは、2026-07-12のRole/Tenant Manual E2EでPASS。今後snapshot系を使用する場合の authenticated client propagation は継続確認事項。
- ログイン後画面にログアウト導線を追加し、モックログイン状態をログイン前へ戻す操作を整理。
- ログイン画面のパスワード再設定導線を、正式版のメール再設定フロー前提の「準備中」案内へ変更。
- `/data-policy`、`/support`、`/legal`を追加し、ログイン画面とサイドバー下部の法務リンクを更新。
- サポートページは問い合わせ、サポート内容、営業時間、問い合わせ先の独立ページとして整理。
- 左下NアイコンはNext.js開発環境由来の表示。`npm run build`後の`next start`相当では表示されないことを確認。
- オプション収支の正式仕様として、掲載枠数は `settings.slots` を正本にし、`掲載枠数 × 35%` を50件単位で切り上げた基準件数を使う。スマピクは独立維持、その他は `店ピク > パノラマ > 動画 > 得意なエリア` の優先順位で現在付与がある最大2カテゴリのみ維持対象。枠削減額は `削減対象件数 × 単価`、入れ替え最適化額は既存判定の「全て外す / 第2基準まで落とす / 第2基準に上げる / 第3基準に上げる / スマピク最適化」をCSVの `○` 現在付与状態と突合し、外す金額と付ける金額を合算する。HomeとOption画面は同一 `analysis.optionBalance` の `capacitySavingsAmount / replacementOptimizationAmount / totalImprovementAmount` を表示する。

## Next Sprint

CTO review of Release Candidate Launch Readiness

## Strict Prohibitions

- no SQL
- no Supabase changes
- no package changes
- no RLS
- no `.next` commit
