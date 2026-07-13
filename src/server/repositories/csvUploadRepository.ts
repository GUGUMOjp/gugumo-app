import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";
import type {
  SupabaseUserClient,
} from "@/src/server/core/supabaseUserClient";

export type CsvUploadRecord = {
  file_name: string;
  file_data: Record<string, string>[];
  company_id?: string | null;
  workspace_id?: string | null;
  uploaded_by?: string | null;
  snapshot_date?: string | null;
  checksum?: string | null;
  status?: CsvUploadStatus | null;
  excluded_at?: string | null;
  excluded_by?: string | null;
};

export type CsvUploadStatus = "active" | "excluded";

export type StoredCsvUploadRecord = CsvUploadRecord & {
  id: number;
  created_at: string | null;
  uploaded_at: string | null;
  company_id: string | null;
  workspace_id: string | null;
  uploaded_by: string | null;
  snapshot_date: string | null;
  checksum: string | null;
  status: CsvUploadStatus | null;
  excluded_at: string | null;
  excluded_by: string | null;
};

export type CsvUploadMetadataRecord = Omit<StoredCsvUploadRecord, "file_data">;

export type CsvUploadDuplicateSourceRecord = Pick<
  StoredCsvUploadRecord,
  "id" | "file_name" | "workspace_id" | "checksum" | "status"
>;

type CsvUploadUpdateRecord = {
  status: CsvUploadStatus;
  excluded_at: string | null;
  excluded_by: string | null;
};

type CsvUploadSaveError = {
  cause: unknown;
  failedRecord: CsvUploadRecord;
};

type CsvUploadReadError = {
  cause: unknown;
};

type CsvUploadDeleteError = {
  cause: unknown;
};

type CsvUploadSaveResult = ServerResult<void, CsvUploadSaveError>;
type CsvUploadReadResult = ServerResult<StoredCsvUploadRecord[], CsvUploadReadError>;
type CsvUploadSingleReadResult = ServerResult<StoredCsvUploadRecord | null, CsvUploadReadError>;
type CsvUploadMetadataReadResult = ServerResult<CsvUploadMetadataRecord | null, CsvUploadReadError>;
type CsvUploadDuplicateSourceReadResult = ServerResult<CsvUploadDuplicateSourceRecord[], CsvUploadReadError>;
type CsvUploadUpdateResult = ServerResult<StoredCsvUploadRecord | null, CsvUploadReadError>;
type CsvUploadDeleteResult = ServerResult<{ id: number } | null, CsvUploadDeleteError>;

const CSV_UPLOAD_SELECT = "id, file_name, file_data, created_at, uploaded_at, company_id, workspace_id, uploaded_by, snapshot_date, checksum, status, excluded_at, excluded_by";
const CSV_UPLOAD_METADATA_SELECT = "id, file_name, created_at, uploaded_at, company_id, workspace_id, uploaded_by, snapshot_date, checksum, status, excluded_at, excluded_by";
const CSV_UPLOAD_DUPLICATE_SOURCE_SELECT = "id, file_name, workspace_id, checksum, status";

export async function getRecentCsvUploadRecords({
  limit = 100,
  workspaceId,
  client = supabase,
}: {
  limit?: number;
  workspaceId?: string;
  client?: SupabaseUserClient;
} = {}) {
  let query = client
    .from("csv_uploads")
    .select(CSV_UPLOAD_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data, error } = await query.returns<StoredCsvUploadRecord[]>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadReadResult;
  }

  return ok(data) satisfies CsvUploadReadResult;
}

export async function getAnalysisCsvUploadRecords({
  workspaceId,
  client = supabase,
}: {
  workspaceId: string;
  client?: SupabaseUserClient;
}) {
  const { data, error } = await client
    .from("csv_uploads")
    .select(CSV_UPLOAD_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("snapshot_date", { ascending: true })
    .order("uploaded_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .returns<StoredCsvUploadRecord[]>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadReadResult;
  }

  return ok(data) satisfies CsvUploadReadResult;
}

export async function getCurrentAnalysisCsvUploadRecord({
  workspaceId,
  client = supabase,
}: {
  workspaceId: string;
  client?: SupabaseUserClient;
}) {
  const { data, error } = await client
    .from("csv_uploads")
    .select(CSV_UPLOAD_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("snapshot_date", { ascending: false })
    .order("uploaded_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<StoredCsvUploadRecord>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadSingleReadResult;
  }

  return ok(data) satisfies CsvUploadSingleReadResult;
}

export async function getCurrentAnalysisCsvUploadMetadata({
  workspaceId,
  client = supabase,
}: {
  workspaceId: string;
  client?: SupabaseUserClient;
}) {
  const { data, error } = await client
    .from("csv_uploads")
    .select(CSV_UPLOAD_METADATA_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("snapshot_date", { ascending: false })
    .order("uploaded_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CsvUploadMetadataRecord>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadMetadataReadResult;
  }

  return ok(data) satisfies CsvUploadMetadataReadResult;
}

export async function getCsvUploadFileDataById({
  uploadId,
  workspaceId,
  client = supabase,
}: {
  uploadId: number;
  workspaceId: string;
  client?: SupabaseUserClient;
}) {
  const { data, error } = await client
    .from("csv_uploads")
    .select(CSV_UPLOAD_SELECT)
    .eq("id", uploadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<StoredCsvUploadRecord>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadSingleReadResult;
  }

  return ok(data) satisfies CsvUploadSingleReadResult;
}

export async function getCsvUploadRecordsByChecksum({
  workspaceId,
  checksums,
  client = supabase,
}: {
  workspaceId: string;
  checksums: string[];
  client?: SupabaseUserClient;
}) {
  const uniqueChecksums = Array.from(new Set(checksums.filter(Boolean)));

  if (!uniqueChecksums.length) {
    return ok([]) satisfies CsvUploadReadResult;
  }

  const { data, error } = await client
    .from("csv_uploads")
    .select(CSV_UPLOAD_SELECT)
    .eq("workspace_id", workspaceId)
    .in("checksum", uniqueChecksums)
    .order("created_at", { ascending: false })
    .returns<StoredCsvUploadRecord[]>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadReadResult;
  }

  return ok(data) satisfies CsvUploadReadResult;
}

export async function getCsvUploadDuplicateSourceRecords({
  workspaceId,
  client = supabase,
}: {
  workspaceId: string;
  client?: SupabaseUserClient;
}) {
  const { data, error } = await client
    .from("csv_uploads")
    .select(CSV_UPLOAD_DUPLICATE_SOURCE_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .returns<CsvUploadDuplicateSourceRecord[]>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadDuplicateSourceReadResult;
  }

  return ok(data) satisfies CsvUploadDuplicateSourceReadResult;
}

export async function saveCsvUploadRecord(record: CsvUploadRecord, client: SupabaseUserClient = supabase) {
  const { error } = await client.from("csv_uploads").insert(record);

  if (error) {
    return err({
      cause: error,
      failedRecord: record,
    }) satisfies CsvUploadSaveResult;
  }

  return ok(undefined) satisfies CsvUploadSaveResult;
}

export async function saveCsvUploadRecords(records: CsvUploadRecord[], client: SupabaseUserClient = supabase) {
  for (const record of records) {
    const result = await saveCsvUploadRecord(record, client);

    if (!result.ok) {
      return result;
    }
  }

  return ok(undefined) satisfies CsvUploadSaveResult;
}

export async function updateCsvUploadRecordStatus({
  uploadId,
  workspaceId,
  record,
  client = supabase,
}: {
  uploadId: number;
  workspaceId: string;
  record: CsvUploadUpdateRecord;
  client?: SupabaseUserClient;
}) {
  const { data, error } = await client
    .from("csv_uploads")
    .update(record)
    .eq("id", uploadId)
    .eq("workspace_id", workspaceId)
    .select(CSV_UPLOAD_SELECT)
    .maybeSingle<StoredCsvUploadRecord>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadUpdateResult;
  }

  return ok(data) satisfies CsvUploadUpdateResult;
}

export async function deleteExcludedCsvUploadRecord({
  uploadId,
  companyId,
  workspaceId,
  client = supabase,
}: {
  uploadId: number;
  companyId: string;
  workspaceId: string;
  client?: SupabaseUserClient;
}) {
  const { data, error } = await client
    .from("csv_uploads")
    .delete()
    .eq("id", uploadId)
    .eq("company_id", companyId)
    .eq("workspace_id", workspaceId)
    .eq("status", "excluded")
    .select("id")
    .maybeSingle<{ id: number }>();

  if (error) {
    return err({
      cause: error,
    }) satisfies CsvUploadDeleteResult;
  }

  return ok(data) satisfies CsvUploadDeleteResult;
}
