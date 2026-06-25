import {
  extractDataDate,
  parseCsv,
} from "./parser";
import type {
  CsvRow,
  CsvSnapshot,
  CsvSummary,
} from "@/src/server/types/csv";

type CsvReaderOptions = {
  buildSummary: (rows: CsvRow[]) => CsvSummary;
  dateKey: (date: Date) => string;
  formatDate: (date: Date) => string;
};

export async function readCsvFile(file: File, options: CsvReaderOptions): Promise<CsvSnapshot> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text = "";

  try {
    text = new TextDecoder("shift-jis").decode(bytes);
    if (!text.includes("物件名")) text = new TextDecoder("utf-8").decode(bytes);
  } catch {
    text = new TextDecoder("utf-8").decode(bytes);
  }

  const rows = parseCsv(text);
  const date = extractDataDate(file.name) ?? new Date(file.lastModified);
  const summary = options.buildSummary(rows);

  return {
    fileName: file.name,
    date,
    dateKey: options.dateKey(date),
    dateLabel: options.formatDate(date),
    rows,
    summary,
  };
}
