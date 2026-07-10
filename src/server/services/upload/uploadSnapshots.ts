import { buildSummary } from "@/src/server/services/analysis";
import {
  extractDataDate,
  readCsvFile,
} from "@/src/server/services/csv";
import type { CsvSnapshot } from "@/src/server/types/csv";

type CsvUploadRecord = {
  file_name: string;
  file_data: CsvSnapshot["rows"];
  snapshot_date?: string | null;
};

type StoredCsvUploadRecord = CsvUploadRecord & {
  id: number;
  created_at: string | null;
  uploaded_at?: string | null;
  company_id?: string | null;
  workspace_id?: string | null;
  uploaded_by?: string | null;
  checksum?: string | null;
  status?: "active" | "excluded" | null;
  excluded_at?: string | null;
  excluded_by?: string | null;
};

function formatDate(date: Date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function hasCsvUploadFiles(fileList: FileList | File[]) {
  return Array.from(fileList).some((file) => file.name.toLowerCase().endsWith(".csv"));
}

export async function buildUploadSnapshots(fileList: FileList | File[]) {
  const files = Array.from(fileList).filter((file) => file.name.toLowerCase().endsWith(".csv"));
  if (!files.length) return [];

  const snapshots = await Promise.all(files.sort((a, b) => a.name.localeCompare(b.name)).map((file) => readCsvFile(file, {
    buildSummary,
    dateKey,
    formatDate,
  })));
  snapshots.sort((a, b) => a.date.getTime() - b.date.getTime());

  return snapshots;
}

export function buildCsvUploadRecords(snapshots: CsvSnapshot[]): CsvUploadRecord[] {
  return snapshots.map((snapshot) => ({
    file_name: snapshot.fileName,
    file_data: snapshot.rows,
    snapshot_date: snapshot.dateKey,
  }));
}

export function buildStoredUploadSnapshots(records: StoredCsvUploadRecord[]) {
  const snapshots = records.map((record) => {
    const createdAt = record.created_at ? new Date(record.created_at) : new Date();
    const storedDate = record.snapshot_date ? new Date(`${record.snapshot_date}T00:00:00`) : null;
    const date = storedDate ?? extractDataDate(record.file_name) ?? createdAt;

    return {
      uploadHistoryId: `stored-${record.id}`,
      uploadedAt: record.uploaded_at ?? record.created_at,
      fileName: record.file_name,
      date,
      dateKey: dateKey(date),
      dateLabel: formatDate(date),
      rows: record.file_data,
      summary: buildSummary(record.file_data),
    };
  });

  snapshots.sort((a, b) => a.date.getTime() - b.date.getTime());

  return snapshots;
}

export function getLatestSnapshot(snapshots: CsvSnapshot[]) {
  return snapshots[snapshots.length - 1];
}
