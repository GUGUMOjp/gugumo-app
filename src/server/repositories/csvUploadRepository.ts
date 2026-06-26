import { supabase } from "@/lib/supabase";

export type CsvUploadRecord = {
  file_name: string;
  file_data: Record<string, string>[];
};

type CsvUploadSaveResult = {
  ok: true;
  error: null;
  failedRecord: null;
} | {
  ok: false;
  error: unknown;
  failedRecord: CsvUploadRecord;
};

export async function saveCsvUploadRecord(record: CsvUploadRecord) {
  const { error } = await supabase.from("csv_uploads").insert(record);

  if (error) {
    return {
      ok: false,
      error,
      failedRecord: record,
    } satisfies CsvUploadSaveResult;
  }

  return {
    ok: true,
    error: null,
    failedRecord: null,
  } satisfies CsvUploadSaveResult;
}

export async function saveCsvUploadRecords(records: CsvUploadRecord[]) {
  for (const record of records) {
    const result = await saveCsvUploadRecord(record);

    if (!result.ok) {
      return result;
    }
  }

  return {
    ok: true,
    error: null,
    failedRecord: null,
  } satisfies CsvUploadSaveResult;
}
