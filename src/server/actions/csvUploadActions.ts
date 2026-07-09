"use server";

import {
  saveCsvUploadRecords,
  type CsvUploadRecord,
} from "@/src/server/repositories/csvUploadRepository";

type CsvUploadSaveActionResult = {
  ok: true;
  data: null;
  error: null;
} | {
  ok: false;
  data: null;
  error: {
    failedFileName: string;
    message: string;
  };
};

export async function saveCsvUploadRecordsAction(records: CsvUploadRecord[]) {
  const result = await saveCsvUploadRecords(records);

  if (!result.ok) {
    console.error(result.error.cause);

    return {
      ok: false,
      data: null,
      error: {
        failedFileName: result.error.failedRecord.file_name,
        message: "CSVの保存に失敗しました。",
      },
    } satisfies CsvUploadSaveActionResult;
  }

  return {
    ok: true,
    data: null,
    error: null,
  } satisfies CsvUploadSaveActionResult;
}
