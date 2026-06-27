import { supabase } from "@/lib/supabase";
import {
  err,
  ok,
  type ServerResult,
} from "@/src/server/shared";

export type SnapshotRecord = {
  company_id: string;
  workspace_id: string;
  uploaded_by: string;
  snapshot_date: string;
  source: "suumo_csv";
  file_name: string;
  row_count: number;
  checksum: string | null;
};

export type SnapshotRowRecord = {
  company_id: string;
  workspace_id: string;
  snapshot_id: string;
  row_data: Record<string, string>;
  property_key: string | null;
};

export type SnapshotRowInputRecord = Omit<SnapshotRowRecord, "snapshot_id">;

type SnapshotInsertResult = {
  id: string;
};

type SnapshotSaveError = {
  message: string;
  cause: unknown;
};

type SnapshotSaveResult = ServerResult<SnapshotInsertResult, SnapshotSaveError>;
type SnapshotRowsSaveResult = ServerResult<void, SnapshotSaveError>;
type SnapshotWithRowsSaveResult = ServerResult<SnapshotInsertResult, SnapshotSaveError>;

export async function saveSnapshot(record: SnapshotRecord) {
  const { data, error } = await supabase
    .from("snapshots")
    .insert(record)
    .select("id")
    .single<SnapshotInsertResult>();

  if (error) {
    return err({
      message: "Snapshotの保存に失敗しました。",
      cause: error,
    }) satisfies SnapshotSaveResult;
  }

  return ok(data) satisfies SnapshotSaveResult;
}

export async function saveSnapshotRows(records: SnapshotRowRecord[]) {
  if (!records.length) {
    return ok(undefined) satisfies SnapshotRowsSaveResult;
  }

  const { error } = await supabase
    .from("snapshot_rows")
    .insert(records);

  if (error) {
    return err({
      message: "Snapshot Rowsの保存に失敗しました。",
      cause: error,
    }) satisfies SnapshotRowsSaveResult;
  }

  return ok(undefined) satisfies SnapshotRowsSaveResult;
}

export async function saveSnapshotWithRows(snapshot: SnapshotRecord, rows: SnapshotRowInputRecord[]) {
  const snapshotResult = await saveSnapshot(snapshot);

  if (!snapshotResult.ok) {
    return snapshotResult satisfies SnapshotWithRowsSaveResult;
  }

  const snapshotRows = rows.map((row) => ({
    ...row,
    snapshot_id: snapshotResult.data.id,
  }));
  const rowsResult = await saveSnapshotRows(snapshotRows);

  if (!rowsResult.ok) {
    return err(rowsResult.error) satisfies SnapshotWithRowsSaveResult;
  }

  return ok(snapshotResult.data) satisfies SnapshotWithRowsSaveResult;
}
