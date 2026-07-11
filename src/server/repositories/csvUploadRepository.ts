import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";

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

type CsvUploadSaveResult = ServerResult<void, CsvUploadSaveError>;
type CsvUploadReadResult = ServerResult<StoredCsvUploadRecord[], CsvUploadReadError>;
type CsvUploadSingleReadResult = ServerResult<StoredCsvUploadRecord | null, CsvUploadReadError>;
type CsvUploadUpdateResult = ServerResult<StoredCsvUploadRecord | null, CsvUploadReadError>;

const CSV_UPLOAD_SELECT = "id, file_name, file_data, created_at, uploaded_at, company_id, workspace_id, uploaded_by, snapshot_date, checksum, status, excluded_at, excluded_by";

export async function getRecentCsvUploadRecords({
  limit = 100,
  workspaceId,
}: {
  limit?: number;
  workspaceId?: string;
} = {}) {
  let query = supabase
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
}: {
  workspaceId: string;
}) {
  const { data, error } = await supabase
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
}: {
  workspaceId: string;
}) {
  const { data, error } = await supabase
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

export async function getCsvUploadRecordsByChecksum({
  workspaceId,
  checksums,
}: {
  workspaceId: string;
  checksums: string[];
}) {
  const uniqueChecksums = Array.from(new Set(checksums.filter(Boolean)));

  if (!uniqueChecksums.length) {
    return ok([]) satisfies CsvUploadReadResult;
  }

  const { data, error } = await supabase
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

export async function saveCsvUploadRecord(record: CsvUploadRecord) {
  const { error } = await supabase.from("csv_uploads").insert(record);

  if (error) {
    return err({
      cause: error,
      failedRecord: record,
    }) satisfies CsvUploadSaveResult;
  }

  return ok(undefined) satisfies CsvUploadSaveResult;
}

export async function saveCsvUploadRecords(records: CsvUploadRecord[]) {
  for (const record of records) {
    const result = await saveCsvUploadRecord(record);

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
}: {
  uploadId: number;
  workspaceId: string;
  record: CsvUploadUpdateRecord;
}) {
  const { data, error } = await supabase
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
