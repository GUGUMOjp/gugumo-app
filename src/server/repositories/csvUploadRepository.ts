import { supabase } from "@/lib/supabase";

export type CsvUploadRecord = {
  file_name: string;
  file_data: Record<string, string>[];
};

export async function saveCsvUploadRecord(record: CsvUploadRecord) {
  return supabase.from("csv_uploads").insert(record);
}

export async function saveCsvUploadRecords(records: CsvUploadRecord[]) {
  for (const record of records) {
    const { error } = await saveCsvUploadRecord(record);

    if (error) {
      return {
        error,
        failedRecord: record,
      };
    }
  }

  return {
    error: null,
    failedRecord: null,
  };
}
