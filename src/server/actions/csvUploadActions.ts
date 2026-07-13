"use server";

import {
  deleteExcludedCsvUploadRecord,
  getAnalysisCsvUploadRecords,
  getCsvUploadDuplicateSourceRecords,
  getCsvUploadFileDataById,
  getCsvUploadRecordsByChecksum,
  getCurrentAnalysisCsvUploadMetadata,
  getRecentCsvUploadRecords,
  saveCsvUploadRecord,
  updateCsvUploadRecordStatus,
  type CsvUploadRecord,
} from "@/src/server/repositories/csvUploadRepository";
import {
  createRequestSupabaseClient,
  getCurrentWorkspaceContext,
} from "@/src/server/core";
import {
  type SupabaseUserClient,
} from "@/src/server/core/supabaseUserClient";
import {
  buildStoredUploadSnapshots,
  buildCsvUploadDuplicateMetadata,
  canManageCsvUploadLifecycle,
  type CsvUploadDuplicateMetadata,
  isValidCsvUploadId,
} from "@/src/server/services/upload";
import type {
  CsvSnapshot,
} from "@/src/server/types/csv";

type CsvUploadSaveActionResult = {
  ok: true;
  data: {
    savedFileNames: string[];
  };
  error: null;
} | {
  ok: false;
  data: {
    savedFileNames: string[];
  };
  error: {
    failedFileName: string;
    failedFileNames: string[];
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
  duplicateMetadata: CsvUploadDuplicateMetadata;
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

type CsvUploadDeleteActionResult = {
  ok: true;
  data: {
    id: number;
  };
  error: null;
} | {
  ok: false;
  data: null;
  error: {
    message: string;
  };
};

type CsvUploadDuplicateItem = {
  checksum: string;
  fileName: string;
  uploadedAt: string | null;
};

type CsvUploadDuplicateCheckActionResult = {
  ok: true;
  data: CsvUploadDuplicateItem[];
  error: null;
} | {
  ok: false;
  data: null;
  error: {
    message: string;
  };
};

type CsvUploadWorkspaceContext = {
  context: NonNullable<Awaited<ReturnType<typeof getCurrentWorkspaceContext>>["data"]>;
  client: SupabaseUserClient;
};

type CsvUploadWorkspaceContextResult = {
  ok: true;
  data: CsvUploadWorkspaceContext;
  error: null;
} | {
  ok: false;
  data: null;
  error: {
    message: string;
  };
};

const MAX_CSV_UPLOAD_RECORDS_PER_ACTION = 20;
const MAX_SERVER_SINGLE_RECORD_PAYLOAD_BYTES = 8 * 1024 * 1024;
const MAX_SERVER_TOTAL_RECORD_PAYLOAD_BYTES = 12 * 1024 * 1024;

type CsvUploadRecordValidationResult = {
  ok: true;
  failedFileNames: string[];
} | {
  ok: false;
  failedFileNames: string[];
};

function utf8ByteSize(value: string) {
  return new TextEncoder().encode(value).length;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCsvDataRow(value: unknown): value is Record<string, string> {
  return isPlainObject(value)
    && Object.keys(value).length > 0
    && Object.values(value).every((fieldValue) => typeof fieldValue === "string");
}

function getInputFileNames(records: unknown) {
  if (!Array.isArray(records)) return ["CSV"];

  const fileNames = records
    .map((record) => {
      if (!isPlainObject(record)) return null;
      return typeof record.file_name === "string" && record.file_name.trim() ? record.file_name.trim() : null;
    })
    .filter((fileName): fileName is string => Boolean(fileName));

  return fileNames.length ? fileNames : ["CSV"];
}

function validateCsvUploadRecordsForSave(records: unknown): CsvUploadRecordValidationResult {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      ok: false,
      failedFileNames: getInputFileNames(records),
    };
  }

  if (records.length > MAX_CSV_UPLOAD_RECORDS_PER_ACTION) {
    return {
      ok: false,
      failedFileNames: getInputFileNames(records),
    };
  }

  let totalPayloadBytes = 0;
  const failedFileNames: string[] = [];

  records.forEach((record) => {
    const fileName = isPlainObject(record) && typeof record.file_name === "string" ? record.file_name.trim() : "";

    if (!isPlainObject(record) || !fileName || !fileName.toLowerCase().endsWith(".csv")) {
      failedFileNames.push(fileName || "CSV");
      return;
    }

    if (!Array.isArray(record.file_data) || record.file_data.length === 0 || !record.file_data.every(isCsvDataRow)) {
      failedFileNames.push(fileName);
      return;
    }

    let recordPayloadBytes = 0;
    try {
      recordPayloadBytes = utf8ByteSize(JSON.stringify({
        file_name: record.file_name,
        file_data: record.file_data,
        snapshot_date: record.snapshot_date ?? null,
        checksum: record.checksum ?? null,
      }));
    } catch {
      failedFileNames.push(fileName);
      return;
    }

    if (recordPayloadBytes > MAX_SERVER_SINGLE_RECORD_PAYLOAD_BYTES) {
      failedFileNames.push(fileName);
      return;
    }

    totalPayloadBytes += recordPayloadBytes;
  });

  if (totalPayloadBytes > MAX_SERVER_TOTAL_RECORD_PAYLOAD_BYTES) {
    return {
      ok: false,
      failedFileNames: getInputFileNames(records),
    };
  }

  if (failedFileNames.length) {
    return {
      ok: false,
      failedFileNames,
    };
  }

  return {
    ok: true,
    failedFileNames: [],
  };
}

async function getWorkspaceContextForCsvUploads() {
  const contextResult = await getCurrentWorkspaceContext();

  if (!contextResult.ok) {
    return {
      ok: false as const,
      data: null,
      error: {
        message: contextResult.error.message,
      },
    } satisfies CsvUploadWorkspaceContextResult;
  }

  if (!contextResult.data) {
    return {
      ok: false as const,
      data: null,
      error: {
        message: "ログイン状態を確認できませんでした。",
      },
    } satisfies CsvUploadWorkspaceContextResult;
  }

  return {
    ok: true as const,
    data: {
      context: contextResult.data,
      client: await createRequestSupabaseClient(),
    },
    error: null,
  } satisfies CsvUploadWorkspaceContextResult;
}

export async function loadRecentCsvUploadSnapshotsAction() {
  const contextResult = await getWorkspaceContextForCsvUploads();

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "保存済みデータの読み込みに失敗しました。",
      },
    } satisfies CsvUploadLoadActionResult;
  }

  const { context, client } = contextResult.data;

  const result = await getAnalysisCsvUploadRecords({
    workspaceId: context.workspaceId,
    client,
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

export async function loadCurrentAnalysisCsvUploadSnapshotAction() {
  const contextResult = await getWorkspaceContextForCsvUploads();

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "保存済みデータの読み込みに失敗しました。",
      },
    } satisfies CsvUploadLoadActionResult;
  }

  const { context, client } = contextResult.data;

  const metadataResult = await getCurrentAnalysisCsvUploadMetadata({
    workspaceId: context.workspaceId,
    client,
  });

  if (!metadataResult.ok) {
    console.error(metadataResult.error.cause);

    return {
      ok: false,
      data: null,
      error: {
        message: "保存済みデータの読み込みに失敗しました。",
      },
    } satisfies CsvUploadLoadActionResult;
  }

  if (!metadataResult.data) {
    return {
      ok: true,
      data: [],
      error: null,
    } satisfies CsvUploadLoadActionResult;
  }

  const fileDataResult = await getCsvUploadFileDataById({
    uploadId: metadataResult.data.id,
    workspaceId: context.workspaceId,
    client,
  });

  if (!fileDataResult.ok) {
    console.error(fileDataResult.error.cause);

    return {
      ok: false,
      data: null,
      error: {
        message: "保存済みデータの読み込みに失敗しました。",
      },
    } satisfies CsvUploadLoadActionResult;
  }

  if (!fileDataResult.data) {
    return {
      ok: true,
      data: [],
      error: null,
    } satisfies CsvUploadLoadActionResult;
  }

  return {
    ok: true,
    data: buildStoredUploadSnapshots([fileDataResult.data]),
    error: null,
  } satisfies CsvUploadLoadActionResult;
}

export async function loadRecentCsvUploadHistoryAction() {
  const contextResult = await getWorkspaceContextForCsvUploads();

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の読み込みに失敗しました。",
      },
    } satisfies CsvUploadHistoryActionResult;
  }

  const { context, client } = contextResult.data;

  const [result, duplicateSourceResult] = await Promise.all([
    getRecentCsvUploadRecords({
      workspaceId: context.workspaceId,
      client,
    }),
    getCsvUploadDuplicateSourceRecords({
      workspaceId: context.workspaceId,
      client,
    }),
  ]);

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

  if (!duplicateSourceResult.ok) {
    console.error(duplicateSourceResult.error.cause);

    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の読み込みに失敗しました。",
      },
    } satisfies CsvUploadHistoryActionResult;
  }

  const duplicateMetadataById = buildCsvUploadDuplicateMetadata(duplicateSourceResult.data);

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
      duplicateMetadata: duplicateMetadataById.get(record.id) ?? {
        identicalContentCount: 0,
        sameFileNameCount: 1,
        hasSameNameDifferentContent: false,
      },
    })),
    error: null,
  } satisfies CsvUploadHistoryActionResult;
}

export async function saveCsvUploadRecordsAction(records: CsvUploadRecord[]) {
  const validation = validateCsvUploadRecordsForSave(records);
  if (!validation.ok) {
    const failedFileNames = validation.failedFileNames.length ? validation.failedFileNames : getInputFileNames(records);

    return {
      ok: false,
      data: {
        savedFileNames: [],
      },
      error: {
        failedFileName: failedFileNames[0] ?? "CSV",
        failedFileNames,
        message: "CSVの保存に失敗しました。ファイル内容を確認してください。",
      },
    } satisfies CsvUploadSaveActionResult;
  }

  const contextResult = await getWorkspaceContextForCsvUploads();

  if (!contextResult.ok) {
    const failedFileNames = getInputFileNames(records);

    return {
      ok: false,
      data: {
        savedFileNames: [],
      },
      error: {
        failedFileName: failedFileNames[0] ?? "CSV",
        failedFileNames,
        message: "CSVの保存に失敗しました。",
      },
    } satisfies CsvUploadSaveActionResult;
  }

  const { context, client } = contextResult.data;
  const recordsWithTenant = records.map((record) => ({
    ...record,
    company_id: context.companyId,
    workspace_id: context.workspaceId,
    uploaded_by: context.profileId,
    status: "active" as const,
    excluded_at: null,
    excluded_by: null,
  }));
  const savedFileNames: string[] = [];
  const failedFileNames: string[] = [];

  for (const record of recordsWithTenant) {
    const result = await saveCsvUploadRecord(record, client);

    if (result.ok) {
      savedFileNames.push(record.file_name);
    } else {
      console.error(result.error.cause);
      failedFileNames.push(record.file_name);
    }
  }

  if (failedFileNames.length) {
    const failedFileName = failedFileNames[0] ?? "CSV";

    return {
      ok: false,
      data: {
        savedFileNames,
      },
      error: {
        failedFileName,
        failedFileNames,
        message: "CSVの保存に失敗しました。",
      },
    } satisfies CsvUploadSaveActionResult;
  }

  return {
    ok: true,
    data: {
      savedFileNames,
    },
    error: null,
  } satisfies CsvUploadSaveActionResult;
}

export async function updateCsvUploadStatusAction({
  uploadId,
  status,
}: {
  uploadId: number;
  status: "active" | "excluded";
}) {
  if (!isValidCsvUploadId(uploadId)) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の更新に失敗しました。",
      },
    } satisfies CsvUploadStatusActionResult;
  }

  const contextResult = await getWorkspaceContextForCsvUploads();

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の更新に失敗しました。",
      },
    } satisfies CsvUploadStatusActionResult;
  }

  const { context, client } = contextResult.data;

  if (!canManageCsvUploadLifecycle(context.role)) {
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
    client,
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

export async function deleteExcludedCsvUploadAction({
  uploadId,
}: {
  uploadId: number;
}) {
  if (!isValidCsvUploadId(uploadId)) {
    return {
      ok: false,
      data: null,
      error: {
        message: "CSVの完全削除に失敗しました。",
      },
    } satisfies CsvUploadDeleteActionResult;
  }

  const contextResult = await getWorkspaceContextForCsvUploads();

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "CSVの完全削除に失敗しました。",
      },
    } satisfies CsvUploadDeleteActionResult;
  }

  const { context, client } = contextResult.data;

  if (!canManageCsvUploadLifecycle(context.role)) {
    return {
      ok: false,
      data: null,
      error: {
        message: "この操作を行う権限がありません。",
      },
    } satisfies CsvUploadDeleteActionResult;
  }

  const result = await deleteExcludedCsvUploadRecord({
    uploadId,
    companyId: context.companyId,
    workspaceId: context.workspaceId,
    client,
  });

  if (!result.ok || !result.data) {
    if (!result.ok) {
      console.error(result.error.cause);
    }

    return {
      ok: false,
      data: null,
      error: {
        message: "CSVの完全削除に失敗しました。対象が除外済みであることを確認してください。",
      },
    } satisfies CsvUploadDeleteActionResult;
  }

  return {
    ok: true,
    data: {
      id: result.data.id,
    },
    error: null,
  } satisfies CsvUploadDeleteActionResult;
}

export async function checkDuplicateCsvUploadChecksumsAction({
  checksums,
}: {
  checksums: string[];
}) {
  const contextResult = await getWorkspaceContextForCsvUploads();

  if (!contextResult.ok) {
    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の確認に失敗しました。",
      },
    } satisfies CsvUploadDuplicateCheckActionResult;
  }

  const result = await getCsvUploadRecordsByChecksum({
    workspaceId: contextResult.data.context.workspaceId,
    checksums,
    client: contextResult.data.client,
  });

  if (!result.ok) {
    console.error(result.error.cause);

    return {
      ok: false,
      data: null,
      error: {
        message: "アップロード履歴の確認に失敗しました。",
      },
    } satisfies CsvUploadDuplicateCheckActionResult;
  }

  return {
    ok: true,
    data: result.data
      .filter((record) => Boolean(record.checksum))
      .map((record) => ({
        checksum: record.checksum as string,
        fileName: record.file_name,
        uploadedAt: record.uploaded_at ?? record.created_at,
      })),
    error: null,
  } satisfies CsvUploadDuplicateCheckActionResult;
}
