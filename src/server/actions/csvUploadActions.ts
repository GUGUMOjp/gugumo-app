"use server";

import {
  saveCsvUploadRecords,
  type CsvUploadRecord,
} from "@/src/server/repositories/csvUploadRepository";

export async function saveCsvUploadRecordsAction(records: CsvUploadRecord[]) {
  return saveCsvUploadRecords(records);
}
