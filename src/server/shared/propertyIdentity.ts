import { normalizeId } from "@/src/server/services/csv";
import type { CsvRow } from "@/src/server/types/csv";

export function buildPropertyNameRoomKey(name: string | undefined | null, room: string | undefined | null) {
  return `${normalizeId(name)}-${normalizeId(room)}`;
}

export function buildPropertyRowKey(row: CsvRow) {
  return row["物件コード"] || buildPropertyNameRoomKey(row["物件名"], row["部屋番号"]);
}
