import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";

export type CompanyRecord = {
  id: string;
  name: string;
  status: string;
  plan: string | null;
  created_at: string | null;
};

type TenantRepositoryError = {
  message: string;
  cause: unknown;
};

type CompanyResult = ServerResult<CompanyRecord | null, TenantRepositoryError>;

export async function getCompanyById(companyId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, status, plan, created_at")
    .eq("id", companyId)
    .maybeSingle<CompanyRecord>();

  if (error) {
    return err({
      message: "Companyの取得に失敗しました。",
      cause: error,
    }) satisfies CompanyResult;
  }

  return ok(data) satisfies CompanyResult;
}
