# Server Supabase Client Design v1.0

## 0. 目的

RLS有効化前に、GUGUMOで利用するSupabase clientの責務を分離し、Server Authで利用するclient方針を確定する。

このドキュメントは設計結果のみを記録する。

このSprintでは、SQL実行、Supabase変更、RLS有効化、実装変更、package変更、env変更は行わない。

---

## 1. 現在のSupabase client実装

現在のSupabase client:

- `lib/supabase.ts`

現在の実装:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
```

利用状況:

- Browser / Client Component側
- Server Coreの `getCurrentUser()`
- Tenant Repository
- CSV Upload Repository
- Snapshot Repository

確認結果:

- 現在はBrowser用anon clientとServer側DBアクセスclientが分離されていない
- `NEXT_PUBLIC_` envだけを使っているため、client bundleから参照されてもよいanon key前提になっている
- Server Action / Repositoryが、Server requestのCookie sessionを明示的に扱う構成になっていない
- packageには `@supabase/supabase-js` はあるが、Server SSR向けhelper packageは未導入

RLS前の注意:

- RLS有効化後、Supabase側で `auth.uid()` を成立させるには、RepositoryからのDBアクセスがログイン中ユーザーのAuth sessionを持つ必要がある
- 現状の共有clientのままRLSをONにすると、profiles / companies / workspaces のselectが拒否され、CurrentWorkspaceContextが失敗するリスクがある

---

## 2. Supabase client責務分離

GUGUMOでは、以下の3種類のclientを分ける。

### Browser Client

用途:

- Client Componentでのログイン状態確認
- 将来のログイン / ログアウトUI
- ユーザー操作起点の軽いAuth処理

想定配置:

```text
lib/supabase.ts
```

利用key:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

禁止:

- Service Role keyを使わない
- RLSを迂回する処理を置かない
- Business Logicを置かない

### Server User Client

用途:

- Server Actionから呼ぶRepository
- CurrentWorkspaceContext取得
- RLSを適用した通常のDB read / write
- Snapshot保存など、ログインユーザー権限で行う業務処理

想定配置:

```text
src/server/core/supabaseServerClient.ts
```

利用key:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Session:

- Next.jsのServer Action / Route Handler上でCookieからSupabase Auth sessionを取得する
- Supabase requestへログイン中ユーザーのsessionを渡す
- RLSの `auth.uid()` がログイン中ユーザーになることを必須条件にする

方針:

- RLS対象の通常Repositoryはこのclientを使う
- Repositoryは原則としてServer User Clientを受け取る、またはRepository内部でServer User Clientを取得する
- Server Actionは認証・認可確認を必ず行う

### Service Role Client

用途:

- 管理者用batch
- migration補助
- seed補助
- RLS外の保守作業
- 将来の管理画面で、厳密なadmin権限確認後に必要な場合のみ使う処理

想定配置:

```text
src/server/core/supabaseServiceRoleClient.ts
```

利用key:

- `SUPABASE_SERVICE_ROLE_KEY`

禁止:

- Browser / Client Componentから絶対にimportしない
- 通常ユーザー操作のRepositoryでは使わない
- CSV Upload / Snapshot保存 / Settings更新など、ユーザー権限で成立すべき処理では使わない
- Header Tenant DisplayやCurrentWorkspaceContextでは使わない

注意:

- Service RoleはRLSを迂回できるため、利用箇所を最小化する
- Service Roleを使う関数は別名・別ファイルに分け、通常Repositoryと混ぜない
- 本格導入前に監査ログ方針を決める

---

## 3. Server Authで使用するclient方針

採用方針:

```text
Server Auth / RLS対象Repositoryでは Server User Client を使う。
```

理由:

- RLSを有効化した状態で `auth.uid()` によるtenant分離を成立させるため
- ユーザーごとのCompany / Workspace / Roleに応じた権限確認をDB側でも担保するため
- Service RoleによるRLS迂回を通常処理に混ぜないため

対象:

- `getCurrentUser()`
- `getCurrentWorkspaceContext()`
- `getProfileByUserId()`
- `getCompanyById()`
- `getWorkspaceById()`
- `saveCsvUploadRecords()`
- 将来の `saveSnapshotWithRows()`
- Settings / Reports / Advice保存系Repository

現時点の判断:

- 現在の `lib/supabase.ts` はBrowser Clientとして残す
- Server側には別途Server User Clientを追加する
- RepositoryのRLS対応はServer User Client導入後に行う

---

## 4. Repositoryが受け取るclient設計

推奨設計:

```text
Server Action
↓
Server Auth / CurrentWorkspaceContext
↓
Server User Client
↓
Repository
↓
Supabase
```

候補A: Repository内部でServer User Clientを取得する

メリット:

- 呼び出し側が簡単
- 既存Repository APIを大きく変えずに移行しやすい

デメリット:

- テスト時にclient差し替えがしづらい
- Repository内でAuth依存が見えにくくなる

候補B: Repositoryにclientを引数で渡す

メリット:

- RLS対象client / Service Role clientを明示できる
- テストしやすい
- Repositoryの依存が明確になる

デメリット:

- 呼び出し側の変更が増える
- 既存Repository APIの変更範囲が広がる

採用方針:

```text
短期: Repository内部でServer User Clientを取得する。
中期: 必要に応じてclient注入へ移行する。
```

理由:

- まずRLS対応の安全性を優先する
- 既存実装への影響を抑える
- GUGUMOのRepository数が増えた段階でclient注入へ進む方が安全

ただし、Service Role系Repositoryは通常Repositoryと分離し、内部取得でも明確に別ファイル化する。

---

## 5. RLS有効化後に必要なAuth Session取得経路

RLS後に必要な経路:

```text
Browser
↓
Supabase Auth session cookie
↓
Server Action
↓
Server User Client
↓
supabase.auth.getUser()
↓
profiles
↓
companies / workspaces
↓
CurrentWorkspaceContext
```

必要条件:

- ログイン後のSupabase Auth sessionがCookieでServer Actionへ届くこと
- Server User ClientがCookie sessionをSupabase requestへ反映すること
- `supabase.auth.getUser()` がServer側でログイン中ユーザーを返すこと
- RLS policy内の `auth.uid()` が `profiles.id` と一致すること
- profiles / companies / workspaces のselect policyがCurrentWorkspaceContext取得を許可すること

Next.js 16での注意:

- Server Actionsは直接POSTされ得るため、Action内で認証・認可を毎回確認する
- pageやHeader側の表示制御だけを認可として扱わない
- Server側のData Access Layerに認証・認可を集約する

---

## 6. Service Roleを使ってよい場面・禁止場面

使ってよい場面:

- migration確認用の管理script
- 開発seed補助
- 管理者限定の保守batch
- RLS policy検証用の管理処理
- 将来の監査済みadmin operation

禁止場面:

- 通常ユーザーのCSV Upload
- 通常ユーザーのSnapshot保存
- CurrentWorkspaceContext取得
- Header Tenant Display
- Settings更新
- Reports生成
- Advice / Recommendation / Health結果の通常保存
- Client Componentから呼ばれる可能性がある処理

判断基準:

- ユーザーの操作として成立すべき処理はServer User Clientを使う
- 会社・店舗をまたぐ管理処理だけService Role候補にする
- Service Role利用時も、アプリ側でowner / admin権限確認を必須にする

---

## 7. RLS前に必要な実装Sprint

### Sprint 7-13

Server Supabase User Client Foundation。

対象:

- `src/server/core/supabaseServerClient.ts`
- Server側Cookie session対応
- `getCurrentUser()` のServer User Client利用
- 実装後もUI変更なし

### Sprint 7-14

Repository Server Client Migration。

対象:

- Tenant Repository
- CSV Upload Repository
- Snapshot Repository
- RLS対象RepositoryをServer User Clientへ寄せる

### Sprint 7-15

Tenant RLS Policy Draft。

対象:

- companies
- workspaces
- profiles
- select policy
- insert / update policyの初期方針

### Sprint 7-16

CurrentWorkspaceContext RLS Readiness Check。

対象:

- RLS OFFでContext疎通
- RLS ON想定のpolicy整合性
- rollback手順

---

## 8. 今回の判断

Browser Client / Server User Client / Service Role Clientを分離する。

RLS対象の通常DB処理はServer User Clientを使う。

Service Role Clientは通常ユーザー操作では使わない。

Repositoryは短期的には内部でServer User Clientを取得する方針とし、必要に応じて中期的にclient注入へ移行する。

RLS有効化前に、Server Supabase User Client Foundationを実装する必要がある。

現時点では、RLS有効化はまだ不可。

このSprintでは実装変更・SQL実行・Supabase変更・package変更・env変更は行っていない。
