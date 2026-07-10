# GUGUMO Master Progress

## Project

GUGUMO

## Current Sprint

Release Candidate Launch Readiness ready for review

## Latest Completed Commit

b02198f RC: restore persisted dashboard state

## Current Uncommitted Changes

- app/page.tsx
- app/gugumo.css
- app/legal-content.tsx
- app/data-policy/page.tsx
- app/support/page.tsx
- app/legal/page.tsx
- data/product/productMeta.ts
- MASTER_PROGRESS.md

## Build Status

- lint: success (`npm run lint`)
- build: success (`npm run build`)

## DB Status

- companies table created
- workspaces table created
- profiles table created
- tenant seed executed
- RLS disabled

## Migration Status

- `20260627_001_initial_tenant_schema.sql` exists
- rollback file exists
- no migration execution in this sprint

## Auth Status

- dev user created
- profile seeded as owner

## Current Blocker

- none

## Latest Implementation Note

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
- Supabase環境ズレを確認。ローカル `.env.local` と実CSV 22件の保存先は `annvqxnupddnozyghqdw`。今後の正DB・手動SQL適用対象は `annvqxnupddnozyghqdw` とする。
- `ivtaxvuysqqnzpnwndqt` はSQL Editorで誤って `01_add_columns.sql` が適用された別Projectとして扱い、現時点では追加操作せず放置する。必要になった場合のみ別途rollback/cleanup方針をレビューする。
- ログイン後画面にログアウト導線を追加し、モックログイン状態をログイン前へ戻す操作を整理。
- ログイン画面のパスワード再設定導線を、正式版のメール再設定フロー前提の「準備中」案内へ変更。
- `/data-policy`、`/support`、`/legal`を追加し、ログイン画面とサイドバー下部の法務リンクを更新。
- サポートページは問い合わせ、サポート内容、営業時間、問い合わせ先の独立ページとして整理。
- 左下NアイコンはNext.js開発環境由来の表示。`npm run build`後の`next start`相当では表示されないことを確認。

## Next Sprint

CTO review of Release Candidate Launch Readiness

## Strict Prohibitions

- no SQL
- no Supabase changes
- no package changes
- no RLS
- no `.next` commit
