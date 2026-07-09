import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";

export type CsvUploadRecord = {
  file_name: string;
  file_data: Record<string, string>[];
};

export type StoredCsvUploadRecord = CsvUploadRecord & {
  created_at: string | null;
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

export async function getRecentCsvUploadRecords(limit = 10) {
  const { data, error } = await supabase
    .from("csv_uploads")
    .select("file_name, file_data, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
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
