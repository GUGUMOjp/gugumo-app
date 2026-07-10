"use server";

import {
  getRecentCsvUploadRecords,
  saveCsvUploadRecords,
  updateCsvUploadRecordStatus,
  type CsvUploadRecord,
} from "@/src/server/repositories/csvUploadRepository";
import {
  getCurrentWorkspaceContext,
} from "@/src/server/core";
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
  companyId: string | null;
  workspaceId: string | null;
  uploadedBy: string | null;
  snapshotDate: string | null;
  checksum: string | null;
  status: "active" | "excluded" | null;
  excludedAt: string | null;
  excludedBy: string | null;
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

type CsvUploadStatusActionResult = {
  ok: true;
  data: {
    id: number;
    status: "active" | "excluded" | null;
    excludedAt: string | null;
    excludedBy: string | null;
  };
  error: null;
} | {
  ok: false;
  data: null;
  error: {
    message: string;
  };
};

async function getWorkspaceContextForCsvUploads(accessToken?: string) {
  const contextResult = await getCurrentWorkspaceContext(accessToken);

  if (!contextResult.ok) {
    return contextResult;
  }

  if (!contextResult.data) {
    return {
      ok: false as const,
      error: {
        message: "ログイン状態を確認できませんでした。",
      },
    };
  }

  return contextResult;
}

export async function loadRecentCsvUploadSnapshotsAction(accessToken?: string) {
  const contextResult = await getWorkspaceContextForCsvUploads(accessToken);

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "保存済みデータの読み込みに失敗しました。",
      },
    } satisfies CsvUploadLoadActionResult;
  }

  const context = contextResult.data;

  if (!context) {
    return {
      ok: false,
      data: null,
      error: {
        message: "保存済みデータの読み込みに失敗しました。",
      },
    } satisfies CsvUploadLoadActionResult;
  }

  const result = await getRecentCsvUploadRecords({
    workspaceId: context.workspaceId,
  });

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

export async function loadRecentCsvUploadHistoryAction(accessToken?: string) {
  const contextResult = await getWorkspaceContextForCsvUploads(accessToken);

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の読み込みに失敗しました。",
      },
    } satisfies CsvUploadHistoryActionResult;
  }

  const context = contextResult.data;

  if (!context) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の読み込みに失敗しました。",
      },
    } satisfies CsvUploadHistoryActionResult;
  }

  const result = await getRecentCsvUploadRecords({
    workspaceId: context.workspaceId,
  });

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
      companyId: record.company_id,
      workspaceId: record.workspace_id,
      uploadedBy: record.uploaded_by,
      snapshotDate: record.snapshot_date,
      checksum: record.checksum,
      status: record.status,
      excludedAt: record.excluded_at,
      excludedBy: record.excluded_by,
    })),
    error: null,
  } satisfies CsvUploadHistoryActionResult;
}

export async function saveCsvUploadRecordsAction(records: CsvUploadRecord[], accessToken?: string) {
  const contextResult = await getWorkspaceContextForCsvUploads(accessToken);

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        failedFileName: records[0]?.file_name ?? "CSV",
        message: "CSVの保存に失敗しました。",
      },
    } satisfies CsvUploadSaveActionResult;
  }

  const context = contextResult.data;

  if (!context) {
    return {
      ok: false,
      data: null,
      error: {
        failedFileName: records[0]?.file_name ?? "CSV",
        message: "CSVの保存に失敗しました。",
      },
    } satisfies CsvUploadSaveActionResult;
  }
  const recordsWithTenant = records.map((record) => ({
    ...record,
    company_id: context.companyId,
    workspace_id: context.workspaceId,
    uploaded_by: context.profileId,
    status: "active" as const,
    excluded_at: null,
    excluded_by: null,
  }));
  const result = await saveCsvUploadRecords(recordsWithTenant);

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

export async function updateCsvUploadStatusAction({
  uploadId,
  status,
  accessToken,
}: {
  uploadId: number;
  status: "active" | "excluded";
  accessToken?: string;
}) {
  const contextResult = await getWorkspaceContextForCsvUploads(accessToken);

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の更新に失敗しました。",
      },
    } satisfies CsvUploadStatusActionResult;
  }

  const context = contextResult.data;

  if (!context) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の更新に失敗しました。",
      },
    } satisfies CsvUploadStatusActionResult;
  }

  if (context.role !== "owner" && context.role !== "admin") {
    return {
      ok: false,
      data: null,
      error: {
        message: "この操作を行う権限がありません。",
      },
    } satisfies CsvUploadStatusActionResult;
  }

  const result = await updateCsvUploadRecordStatus({
    uploadId,
    workspaceId: context.workspaceId,
    record: status === "excluded"
      ? {
          status,
          excluded_at: new Date().toISOString(),
          excluded_by: context.profileId,
        }
      : {
          status,
          excluded_at: null,
          excluded_by: null,
        },
  });

  if (!result.ok || !result.data) {
    if (!result.ok) {
      console.error(result.error.cause);
    }

    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の更新に失敗しました。",
      },
    } satisfies CsvUploadStatusActionResult;
  }

  return {
    ok: true,
    data: {
      id: result.data.id,
      status: result.data.status,
      excludedAt: result.data.excluded_at,
      excludedBy: result.data.excluded_by,
    },
    error: null,
  } satisfies CsvUploadStatusActionResult;
}
