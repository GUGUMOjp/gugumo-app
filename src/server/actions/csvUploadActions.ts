"use server";

import {
  getRecentCsvUploadRecords,
  saveCsvUploadRecords,
  type CsvUploadRecord,
} from "@/src/server/repositories/csvUploadRepository";
import {
  buildStoredUploadSnapshots,
} from "@/src/server/services/upload";
import type {
  CsvSnapshot,
} from "@/src/server/types/csv";

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

type CsvUploadLoadActionResult = {
  ok: true;
  data: CsvSnapshot[];
  error: null;
} | {
  ok: false;
  data: null;
  error: {
    message: string;
  };
};

type CsvUploadHistoryItem = {
  id: number;
  fileName: string;
  rowCount: number;
  uploadedAt: string | null;
};

type CsvUploadHistoryActionResult = {
  ok: true;
  data: CsvUploadHistoryItem[];
  error: null;
} | {
  ok: false;
  data: null;
  error: {
    message: string;
  };
};

export async function loadRecentCsvUploadSnapshotsAction() {
  const result = await getRecentCsvUploadRecords();

  if (!result.ok) {
    console.error(result.error.cause);

    return {
      ok: false,
      data: null,
      error: {
        message: "保存済みデータの読み込みに失敗しました。",
      },
    } satisfies CsvUploadLoadActionResult;
  }

  return {
    ok: true,
    data: buildStoredUploadSnapshots(result.data),
    error: null,
  } satisfies CsvUploadLoadActionResult;
}

export async function loadRecentCsvUploadHistoryAction() {
  const result = await getRecentCsvUploadRecords();

  if (!result.ok) {
    console.error(result.error.cause);

    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の読み込みに失敗しました。",
      },
    } satisfies CsvUploadHistoryActionResult;
  }

  return {
    ok: true,
    data: result.data.map((record) => ({
      id: record.id,
      fileName: record.file_name,
      rowCount: record.file_data.length,
      uploadedAt: record.uploaded_at ?? record.created_at,
    })),
    error: null,
  } satisfies CsvUploadHistoryActionResult;
}

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
