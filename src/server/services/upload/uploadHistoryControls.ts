import type {
  WorkspaceRole,
} from "@/src/server/core";

type UploadControlStatus = "active" | "excluded" | null | undefined;
type UploadHistoryStatus = "active" | "excluded";

export type CsvUploadDuplicateMetadata = {
  identicalContentCount: number;
  sameFileNameCount: number;
  hasSameNameDifferentContent: boolean;
};

type CsvUploadDuplicateSource = {
  id: number;
  file_name: string;
  checksum: string | null;
};

export type CsvUploadHistorySnapshotSource = {
  id: string;
  fileName: string;
  dateKey: string;
  rowCount: number;
  uploadedAt: string | null;
};

export type CsvUploadHistoryMetadataSource = {
  id: number;
  fileName: string;
  rowCount: number;
  uploadedAt: string | null;
  snapshotDate: string | null;
  checksum: string | null;
  status: UploadHistoryStatus | null;
  duplicateMetadata: CsvUploadDuplicateMetadata;
};

export type CsvUploadHistoryEntry = {
  id: string;
  databaseId?: number;
  fileName: string;
  dateKey: string;
  rowCount: number;
  uploadedAt: string | null;
  status: UploadHistoryStatus;
  contentHash?: string;
  duplicateMetadata: CsvUploadDuplicateMetadata;
};

export function canManageCsvUploadLifecycle(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canShowCsvUploadExcludeAction({
  role,
  status,
  hasDatabaseId,
}: {
  role: WorkspaceRole | null | undefined;
  status: UploadControlStatus;
  hasDatabaseId: boolean;
}) {
  return canManageCsvUploadLifecycle(role) && hasDatabaseId && status === "active";
}

export function canShowCsvUploadActivateAction({
  role,
  status,
  hasDatabaseId,
}: {
  role: WorkspaceRole | null | undefined;
  status: UploadControlStatus;
  hasDatabaseId: boolean;
}) {
  return canManageCsvUploadLifecycle(role) && hasDatabaseId && status === "excluded";
}

export function canShowCsvUploadPermanentDeleteAction({
  role,
  status,
  hasDatabaseId,
}: {
  role: WorkspaceRole | null | undefined;
  status: UploadControlStatus;
  hasDatabaseId: boolean;
}) {
  return canManageCsvUploadLifecycle(role) && hasDatabaseId && status === "excluded";
}

export function isValidCsvUploadId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function normalizedChecksum(value: string | null | undefined) {
  const checksum = typeof value === "string" ? value.trim() : "";
  return checksum || null;
}

export function buildCsvUploadDuplicateMetadata(
  records: CsvUploadDuplicateSource[],
) {
  const checksumCounts = new Map<string, number>();
  const fileNameGroups = new Map<string, CsvUploadDuplicateSource[]>();

  for (const record of records) {
    const checksum = normalizedChecksum(record.checksum);

    if (checksum) {
      checksumCounts.set(checksum, (checksumCounts.get(checksum) ?? 0) + 1);
    }

    const group = fileNameGroups.get(record.file_name) ?? [];
    group.push(record);
    fileNameGroups.set(record.file_name, group);
  }

  const metadata = new Map<number, CsvUploadDuplicateMetadata>();

  for (const record of records) {
    const checksum = normalizedChecksum(record.checksum);
    const identicalContentCount = checksum ? checksumCounts.get(checksum) ?? 0 : 0;
    const sameFileNameGroup = fileNameGroups.get(record.file_name) ?? [];
    const sameFileNameCount = sameFileNameGroup.length;
    const hasSameNameDifferentContent = sameFileNameGroup.some((candidate) => {
      if (candidate.id === record.id) return false;

      const candidateChecksum = normalizedChecksum(candidate.checksum);
      if (!checksum || !candidateChecksum) return true;

      return candidateChecksum !== checksum;
    });

    metadata.set(record.id, {
      identicalContentCount,
      sameFileNameCount,
      hasSameNameDifferentContent,
    });
  }

  return metadata;
}

export function getCsvUploadDuplicateDisplayKind(metadata: CsvUploadDuplicateMetadata) {
  if (metadata.identicalContentCount > 1) return "identical" as const;
  if (metadata.hasSameNameDifferentContent && metadata.sameFileNameCount > 1) return "same-name" as const;

  return null;
}

function dateKeyFromMetadata(metadata: CsvUploadHistoryMetadataSource) {
  if (metadata.snapshotDate) return metadata.snapshotDate;
  if (metadata.uploadedAt) return metadata.uploadedAt.slice(0, 10);

  return "";
}

export function mergeCsvUploadHistoryEntries({
  snapshots,
  metadata,
  emptyDuplicateMetadata,
}: {
  snapshots: CsvUploadHistorySnapshotSource[];
  metadata: CsvUploadHistoryMetadataSource[];
  emptyDuplicateMetadata: CsvUploadDuplicateMetadata;
}) {
  const metadataById = new Map(metadata.map((item) => [`stored-${item.id}`, item]));
  const metadataByFileName = new Map(metadata.map((item) => [item.fileName, item]));
  const consumedMetadataIds = new Set<number>();

  const entries = snapshots.map((snapshot): CsvUploadHistoryEntry => {
    const stored = metadataById.get(snapshot.id) ?? metadataByFileName.get(snapshot.fileName);

    if (stored) {
      consumedMetadataIds.add(stored.id);
    }

    return {
      id: snapshot.id,
      databaseId: stored?.id,
      fileName: snapshot.fileName,
      dateKey: snapshot.dateKey,
      rowCount: stored?.rowCount ?? snapshot.rowCount,
      uploadedAt: stored?.uploadedAt ?? snapshot.uploadedAt,
      status: stored?.status ?? "active",
      contentHash: stored?.checksum ?? undefined,
      duplicateMetadata: stored?.duplicateMetadata ?? emptyDuplicateMetadata,
    };
  });

  for (const item of metadata) {
    if (consumedMetadataIds.has(item.id)) continue;

    entries.push({
      id: `stored-${item.id}`,
      databaseId: item.id,
      fileName: item.fileName,
      dateKey: dateKeyFromMetadata(item),
      rowCount: item.rowCount,
      uploadedAt: item.uploadedAt,
      status: item.status ?? "active",
      contentHash: item.checksum ?? undefined,
      duplicateMetadata: item.duplicateMetadata,
    });
  }

  return entries;
}
