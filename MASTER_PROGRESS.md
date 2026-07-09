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
