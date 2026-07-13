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
import {
  createRequestSupabaseClient,
} from "./supabaseServerClient";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type CurrentWorkspaceContext = {
  userId: string;
  email: string | null;
  profileId: string;
  profileName: string | null;
  companyId: string;
  companyName: string;
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
};

export type WorkspaceContextErrorCode =
  | "AUTH_ERROR"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_CONFIGURATION_ERROR"
  | "PROFILE_QUERY_ERROR"
  | "COMPANY_NOT_FOUND"
  | "COMPANY_QUERY_ERROR"
  | "WORKSPACE_NOT_FOUND"
  | "WORKSPACE_CONFIGURATION_ERROR"
  | "WORKSPACE_QUERY_ERROR";

type WorkspaceContextError = {
  code: WorkspaceContextErrorCode;
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
      code: "AUTH_ERROR",
      message: "ログイン中ユーザーの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  if (!userResult.data) {
    return ok(null) satisfies WorkspaceContextResult;
  }

  const supabase = await createRequestSupabaseClient();
  const profileResult = await getProfileByUserId(userResult.data.id, supabase);

  if (!profileResult.ok) {
    return err({
      code: "PROFILE_QUERY_ERROR",
      message: "Profileの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  const profile = profileResult.data;

  if (!profile) {
    return err({
      code: "PROFILE_NOT_FOUND",
      message: "Profileが見つかりません。",
    }) satisfies WorkspaceContextResult;
  }

  if (!profile?.company_id || !profile.workspace_id) {
    return err({
      code: "PROFILE_CONFIGURATION_ERROR",
      message: "ProfileにCompanyまたはWorkspaceが紐付いていません。",
    }) satisfies WorkspaceContextResult;
  }

  const role = toWorkspaceRole(profile.role);

  if (!role) {
    return err({
      code: "PROFILE_CONFIGURATION_ERROR",
      message: "ProfileのRoleが不正です。",
    }) satisfies WorkspaceContextResult;
  }

  const companyResult = await getCompanyById(profile.company_id, supabase);

  if (!companyResult.ok) {
    return err({
      code: "COMPANY_QUERY_ERROR",
      message: "Companyの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  if (!companyResult.data) {
    return err({
      code: "COMPANY_NOT_FOUND",
      message: "Companyが見つかりません。",
    }) satisfies WorkspaceContextResult;
  }

  const workspaceResult = await getWorkspaceById(profile.workspace_id, supabase);

  if (!workspaceResult.ok) {
    return err({
      code: "WORKSPACE_QUERY_ERROR",
      message: "Workspaceの取得に失敗しました。",
    }) satisfies WorkspaceContextResult;
  }

  if (!workspaceResult.data) {
    return err({
      code: "WORKSPACE_NOT_FOUND",
      message: "Workspaceが見つかりません。",
    }) satisfies WorkspaceContextResult;
  }

  if (workspaceResult.data.company_id !== companyResult.data.id) {
    return err({
      code: "WORKSPACE_CONFIGURATION_ERROR",
      message: "WorkspaceとCompanyの紐付けが一致しません。",
    }) satisfies WorkspaceContextResult;
  }

  return ok({
    userId: userResult.data.id,
    email: userResult.data.email,
    profileId: profile.id,
    profileName: profile.name,
    companyId: companyResult.data.id,
    companyName: companyResult.data.name,
    workspaceId: workspaceResult.data.id,
    workspaceName: workspaceResult.data.name,
    role,
  }) satisfies WorkspaceContextResult;
}
