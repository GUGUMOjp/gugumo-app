# GUGUMO β版 Release Readiness チェックリスト

Status: CURRENT checklist. See `docs/technical-beta-readiness.md` for the 2026-07-13 final Technical Beta readiness decision.

初期顧客β版を開始する前に、最低限確認する運用品質チェックリスト。

## UI・復旧状態

- [ ] エラー画面: 想定外の実行時エラーで、顧客向けの安全な案内を表示できる。
- [ ] 空状態表示: 主要画面で、CSV読み込み後に何が分かるかを説明できている。
- [ ] ローディング表示: ログイン、保存済みCSV復元、CSVアップロード、レポート表示で日本語の読み込み表示がある。
- [ ] CSVアップロード失敗時の表示: 顧客には再試行できる文言を出し、内部詳細は `console.error` に留める。
- [ ] 保存済みCSV復元失敗時の表示: 壊れたDashboardを見せず、安全な再試行メッセージを表示する。
- [ ] 除外/有効化失敗時の表示: DB lifecycle更新失敗時に顧客向け文言を表示する。
- [ ] 重複CSV検知時の表示: `workspace_id + checksum` 一致で警告し、checksum NULL行とは比較しない。
- [ ] 週次・月次の途中期間表示: 実績累計と平均予測を分けて表示し、途中期間は「予測前週比 / 予測前月比」、完了期間は「前週比 / 前月比」と表示する。
- [x] 暦日ベース予測の既知制約: 制約は既知事項として記録済み。Technical Betaでは運用説明で扱い、正式版までに補足表示要否を検討する。
- [ ] 業務仕様ラベル: 分析カテゴリ名、基準名、判定名、推奨アクション名、SUUMO由来項目名が承認済み表現から変わっていない。
- [ ] オプション管理4分類: 「全オプションを外す（スマピク以外）」「第2基準まで落とす」「第2基準に上げる」「第3基準に上げる」が正しい内部配列に対応している。

## 認証・Tenant

- [x] Password Reset正式実装: Supabase Authのメール再設定フローへ接続し、2026-07-13にProduction E2E PASS。
- [x] RLS最終確認: companies/workspaces/profiles/csv_uploads RLS、Role/Tenant E2E、DELETE Gate、Onboarding rehearsalでown-tenant behaviorを確認済み。future snapshot tablesは正式版課題。
- [x] 初期顧客招待フロー: Invite user primary / Create user fallbackとして整理し、Company/Workspace作成、Invite、Auth UID確認、Profile作成、整合確認、利用開始連絡の順序へ整理済み。Production rehearsal PASS。
- [x] 初回オンボーディング手順: 初回ログインから初回CSVアップロード、exclude/restore、duplicate warningまでProduction rehearsal PASS。

## 運用

- [x] 障害時Runbook: beta-runbook / incident-response / production-auth-checklistに一次対応を記録済み。
- [ ] バックアップ/復元方針: バックアップ頻度、復元担当、復元リハーサル時期を正式版までに確定する。
- [ ] 監査ログ方針: 永続監査ログに残すUpload lifecycleイベントを正式版までに決める。

## β版 Go/No-Go

- [x] 招待、ログイン、Session復元、Password Reset、ログアウトが通る。Password ResetとInvite onboardingはProduction E2E PASS。
- [x] β用workspaceでtenant分離が確認できている。
- [x] 実SUUMO CSVで、アップロード、復元、重複警告、除外、有効化、現在分析対象選定が通る。
- [ ] 主要画面に顧客向けではない内部用語が残っていない。
- [ ] UX改善や自然な日本語化を理由に、業務仕様ラベルを無断変更していない。
- [x] Release Candidateで `npm run lint` と `npm run build` が成功する。
- [x] 既知の制限事項が文書化され、β顧客に提示して問題ない状態になっている。Invite email英語/迷惑メール1回、法務文面、backup/monitoringはP1-P3で継続。
