import {
  getCompanyById,
  getProfileByUserId,
  getWorkspaceById,
} from "@/src/server/repositories";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";
import {
  getCurrentUser,
} from "./auth";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type CurrentWorkspaceContext = {
  userId: string;
  email: string | null;
  profileName: string | null;
  companyId: string;
  companyName: string;
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
};

type WorkspaceContextError = {
  message: string;
};

type WorkspaceContextResult = ServerResult<CurrentWorkspaceContext | null, WorkspaceContextError>;

const workspaceRoles = new Set<WorkspaceRole>(["owner", "admin", "member", "viewer"]);

function toWorkspaceRole(role: string | null): WorkspaceRole | null {
  if (!role || !workspaceRoles.has(role as WorkspaceRole)) {
    return null;
  }

  return role as WorkspaceRole;
}

export async function getCurrentWorkspaceContext(): Promise<WorkspaceContextResult> {
  const userResult = await getCurrentUser();

  if (!userResult.ok) {
    return err({
      message: "ログイン中ユーザーの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  if (!userResult.data) {
    return ok(null) satisfies WorkspaceContextResult;
  }

  const profileResult = await getProfileByUserId(userResult.data.id);

  if (!profileResult.ok) {
    return err({
      message: "Profileの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  const profile = profileResult.data;

  if (!profile?.company_id || !profile.workspace_id) {
    return err({
      message: "ProfileにCompanyまたはWorkspaceが紐付いていません。",
    }) satisfies WorkspaceContextResult;
  }

  const role = toWorkspaceRole(profile.role);

  if (!role) {
    return err({
      message: "ProfileのRoleが不正です。",
    }) satisfies WorkspaceContextResult;
  }

  const companyResult = await getCompanyById(profile.company_id);

  if (!companyResult.ok) {
    return err({
      message: "Companyの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  if (!companyResult.data) {
    return err({
      message: "Companyが見つかりません。",
    }) satisfies WorkspaceContextResult;
  }

  const workspaceResult = await getWorkspaceById(profile.workspace_id);

  if (!workspaceResult.ok) {
    return err({
      message: "Workspaceの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  if (!workspaceResult.data) {
    return err({
      message: "Workspaceが見つかりません。",
    }) satisfies WorkspaceContextResult;
  }

  if (workspaceResult.data.company_id !== companyResult.data.id) {
    return err({
      message: "WorkspaceとCompanyの紐付けが一致しません。",
    }) satisfies WorkspaceContextResult;
  }

  return ok({
    userId: userResult.data.id,
    email: userResult.data.email,
    profileName: profile.name,
    companyId: companyResult.data.id,
    companyName: companyResult.data.name,
    workspaceId: workspaceResult.data.id,
    workspaceName: workspaceResult.data.name,
    role,
  }) satisfies WorkspaceContextResult;
}
