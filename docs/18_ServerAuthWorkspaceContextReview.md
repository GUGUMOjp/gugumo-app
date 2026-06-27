# Server Auth / CurrentWorkspaceContext Review v1.0

## 0. 目的

RLS有効化へ進む前に、Server Auth、CurrentWorkspaceContext、Tenant Repositoryの現在実装を確認し、RLS前に必要な作業を整理する。

このドキュメントは調査結果のみを記録する。

このSprintでは、SQL実行、Supabase変更、RLS有効化、実装変更は行わない。

---

## 1. Server Authの現状

現在のAuth関連コード:

- `lib/supabase.ts`
- `src/server/core/auth.ts`
- `src/server/actions/authActions.ts`

現状:

- `lib/supabase.ts` で `@supabase/supabase-js` のclientを作成している
- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を利用している
- `src/server/core/auth.ts` の `getCurrentUser()` が `supabase.auth.getUser()` を呼ぶ
- `signOutCurrentUser()` が `supabase.auth.signOut()` を呼ぶ
- `src/server/actions/authActions.ts` はCore関数を呼ぶだけの薄いActionになっている

確認結果:

- Auth取得処理はCoreに分離されている
- ActionはCoreを呼ぶだけで、責務は軽い
- ただし、Server専用Supabase clientはまだ分離されていない
- 現状はBrowser側と同じ `lib/supabase.ts` のclientをServer側でも共有している

RLS前の注意:

- RLS有効化後は、`auth.uid()` に紐づく認証状態が正しくSupabaseへ渡る必要がある
- Server Action / Server側処理でCookieベースのSessionを扱う方針を確定する必要がある
- Next.js 16環境でのSupabase SSR / Server client方針を別Sprintで確認する

---

## 2. CurrentWorkspaceContextの現状

現在のContext関連コード:

- `src/server/core/workspaceContext.ts`
- `src/server/actions/workspaceActions.ts`
- `app/page.tsx`

現状:

- `getCurrentWorkspaceContext()` が現在ユーザーを取得する
- user idからProfileを取得する
- Profileの `company_id` からCompanyを取得する
- Profileの `workspace_id` からWorkspaceを取得する
- Roleを `owner / admin / member / viewer` に正規化する
- Workspaceの `company_id` とCompanyの `id` が一致することを確認する
- `CurrentWorkspaceContext` を返す

返却されるContext:

```ts
type CurrentWorkspaceContext = {
  userId: string;
  email: string | null;
  profileName: string | null;
  companyId: string;
  companyName: string;
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member" | "viewer";
};
```

確認結果:

- Company / Workspace / Profileを組み合わせるFacadeとして整理されている
- ProfileにCompanyまたはWorkspaceがない場合はエラーになる
- Roleが想定外の場合はエラーになる
- WorkspaceとCompanyの不一致を検出している
- `getCurrentWorkspaceContextAction()` はCoreを呼ぶだけの薄いActionになっている

RLS前の注意:

- RLS有効化後、profiles / companies / workspaces のselect policyが不足するとContext取得が失敗する
- 未ログイン時は `ok(null)` を返せるが、RLS下のRepository errorと未ログインを区別して扱う必要がある

---

## 3. Tenant Repository取得経路

現在のRepository:

- `src/server/repositories/profileRepository.ts`
- `src/server/repositories/companyRepository.ts`
- `src/server/repositories/workspaceRepository.ts`

取得経路:

```text
getCurrentWorkspaceContext()
↓
getCurrentUser()
↓
getProfileByUserId(userId)
↓
getCompanyById(profile.company_id)
↓
getWorkspaceById(profile.workspace_id)
↓
CurrentWorkspaceContext
```

Repository API:

- `getProfileByUserId(userId)`
- `getCompanyById(companyId)`
- `getWorkspaceById(workspaceId)`
- `getWorkspacesByCompanyId(companyId)`

確認結果:

- profiles / companies / workspaces へのDBアクセスはRepository経由になっている
- Repositoryは `ServerResult`, `ok`, `err` を利用している
- Supabase errorをそのままUIに渡さず、Repository内でmessageに変換している
- `src/server/repositories/index.ts` からTenant Repository APIがexportされている

RLS前の注意:

- Repositoryは現在 `lib/supabase.ts` の共有clientを直接importしている
- RLS有効化後は、RepositoryがServer Auth contextを持つclientを使える構成にする必要がある
- Service Role keyは通常のユーザー操作Repositoryでは使わない

---

## 4. Repository Patternレビュー

守れている点:

- DB tableごとにRepositoryが分かれている
- CoreはRepositoryを組み合わせてContextを作る
- ActionはCoreを呼ぶだけで、DB詳細を持っていない
- app/page.tsxはWorkspace Context Actionを呼び、DB table詳細を直接扱っていない

改善候補:

- Server専用Supabase clientを `src/server/core/` に追加する
- Repositoryが `lib/supabase.ts` へ直接依存しない構成を検討する
- `src/server/actions/index.ts` が存在しないため、Action export整理は必要になったタイミングで検討する

---

## 5. RLS有効化前に必要な修正点

High:

- Server Action / Server側Repositoryで認証済みSessionを扱うSupabase Server client方針を確定する
- profiles / companies / workspaces のRLS select policyを先に確定する
- 開発ユーザーのprofile seedが `auth.users.id` と一致していることを確認する
- CurrentWorkspaceContextがRLS有効化後も取得できることを確認する

Medium:

- RepositoryがServer clientを受け取る、またはServer clientを内部で取得する構成を検討する
- 未ログイン、Profileなし、RLS拒否、データ不整合のエラー分類を整理する
- `getWorkspacesByCompanyId` のrole別利用範囲を定義する

Low:

- Action export整理は、Action数が増えたタイミングで行う
- Header Tenant Displayのフォールバック文言は、ログイン画面実装時に再確認する

---

## 6. RLSへ進む前の推奨順序

### Sprint 7-12

Server Supabase Client方針確認。

対象:

- Next.js 16でのServer Action / Cookie / Supabase Auth sessionの扱い
- `lib/supabase.ts` とServer専用clientの責務分離

### Sprint 7-13

Tenant RLS Policy Draft。

対象:

- companies
- workspaces
- profiles
- select policy
- owner / admin拡張余地

### Sprint 7-14

CurrentWorkspaceContext疎通確認手順。

対象:

- RLS OFFでのContext確認
- RLS ON後のContext確認
- 失敗時の切り戻し手順

### Sprint 7-15

Tenant RLS Migration Draft。

対象:

- RLS有効化SQL
- policy作成SQL
- rollback方針

---

## 7. 今回の判断

Server Auth / CurrentWorkspaceContextの基礎構造は存在する。

Repository Patternも概ね守られている。

ただし、RLS有効化前にServer専用Supabase client方針を確定する必要がある。

現時点では、RLS有効化はまだ不可。

このSprintでは実装変更・SQL実行・Supabase変更は行っていない。
