import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";
import type {
  SupabaseUserClient,
} from "@/src/server/core/supabaseUserClient";

export type ProfileRecord = {
  id: string;
  company_id: string | null;
  workspace_id: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  created_at: string | null;
};

type TenantRepositoryError = {
  message: string;
  cause: unknown;
};

type ProfileResult = ServerResult<ProfileRecord | null, TenantRepositoryError>;

export async function getProfileByUserId(userId: string, client: SupabaseUserClient = supabase) {
  const { data, error } = await client
    .from("profiles")
    .select("id, company_id, workspace_id, email, name, role, created_at")
    .eq("id", userId)
    .maybeSingle<ProfileRecord>();

  if (error) {
    return err({
      message: "Profileの取得に失敗しました。",
      cause: error,
    }) satisfies ProfileResult;
  }

  return ok(data) satisfies ProfileResult;
}
