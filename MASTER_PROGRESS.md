# GUGUMO Master Progress

## Project

GUGUMO

## Current Sprint

Release Candidate UI Cleanup deletion pass ready for review

## Latest Completed Commit

d3901a2 Release Epic 9: polish MVP UI and navigation

## Current Uncommitted Changes

- next.config.ts
- app/page.tsx
- app/gugumo.css
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

- RC実CSV10件の保存payloadがJSON時点で約11.36MBとなり、`10mb`制限を超えることを確認したため、`serverActions.bodySizeLimit` を `20mb` に変更。
- 実データ表示確認で、週次グラフの期間省略と月途中データに対する「月末締め」表記を修正。
- 390px幅で1列になっていたナビゲーションを2列のまま表示し、本文までのスクロール量を削減。

## Next Sprint

CTO review of Release Candidate UI deletion pass

## Strict Prohibitions

- no SQL
- no Supabase changes
- no package changes
- no RLS
- no `.next` commit
