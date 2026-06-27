import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";

export type WorkspaceRecord = {
  id: string;
  company_id: string;
  name: string;
  status: string;
  created_at: string | null;
};

type TenantRepositoryError = {
  message: string;
  cause: unknown;
};

type WorkspaceResult = ServerResult<WorkspaceRecord | null, TenantRepositoryError>;
type WorkspacesResult = ServerResult<WorkspaceRecord[], TenantRepositoryError>;

export async function getWorkspaceById(workspaceId: string) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, company_id, name, status, created_at")
    .eq("id", workspaceId)
    .maybeSingle<WorkspaceRecord>();

  if (error) {
    return err({
      message: "Workspaceの取得に失敗しました。",
      cause: error,
    }) satisfies WorkspaceResult;
  }

  return ok(data) satisfies WorkspaceResult;
}

export async function getWorkspacesByCompanyId(companyId: string) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, company_id, name, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })
    .returns<WorkspaceRecord[]>();

  if (error) {
    return err({
      message: "Workspace一覧の取得に失敗しました。",
      cause: error,
    }) satisfies WorkspacesResult;
  }

  return ok(data) satisfies WorkspacesResult;
}
