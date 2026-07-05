# Release Epic 9 UI Polish

## 0. 目的

GUGUMOを営業デモ・初期リリースに近づけるため、既存分析ロジックを変更せずに画面品質と説明しやすさを改善する。

## 1. 対象画面

- Dashboard
- CSV Upload
- Weekly Report
- Monthly Report
- Replace Analysis
- Option Analysis
- Settings

## 2. 実施方針

- 新しいRule、Recommendation、Validationは追加しない
- 点数計算、37点判定、CSV解析、Repository、Supabase保存処理は変更しない
- UIコンポーネント、余白、空状態、ローディング、エラー表示の見た目を統一する
- 営業デモで次に見る画面が分かる導線を追加する
- 英語表記は業務用語を除き自然な日本語へ寄せる

## 3. UI統一項目

- KPIカードの高さ、余白、見出し、数値サイズ
- 空状態メッセージ
- 注意・警告・成功・情報表示
- セクション導入文
- 画面間導線
- Tablet / Mobile向けレスポンシブ表示

## 4. 変更しないもの

- Business Logic
- CSV解析
- Repository
- Supabase設定
- SQL / Migration
- Package
- Service Role
