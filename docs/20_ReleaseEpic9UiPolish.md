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

## 5. Release Candidate UI Cleanup

顧客向け画面では、以下のような内部実装情報を常時表示しない。

- Supabase / Supabase Auth などの実装サービス名
- Repository / DTO / ViewModel / Rule Engine などの開発者向け名称
- Build番号、beta表記、デモ環境、未ログインなど不安を与える状態表示
- 内部スコア、住戸名寄せ点数、内部ランキング番号、内部基準名
- Rule ID、Recommendation ID、Priority番号、technical metadata

必要になった場合は、顧客向け画面ではなく、将来の管理者向け「開発・診断」画面へ分離する。

顧客向け画面では、以下を優先して表示する。

- 掲載物件数
- 問い合わせ
- 入替対象
- オプション見直し候補
- 月額削減見込み
- 週次 / 月次サマリー
- 会社、店舗、権限など利用者に必要な所属情報
