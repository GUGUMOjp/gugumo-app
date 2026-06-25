import type { CsvRow } from "@/src/server/types/csv";

export function toNumber(value: string | number | undefined | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = String(value).replace(/,/g, "").replace(/%/g, "").replace(/円/g, "").replace(/[^0-9.\-]/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeId(value: string | undefined | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[-‐ー−―]/g, "-")
    .replace(/[（）()「」【】]/g, "")
    .replace(/[\s　]+/g, "")
    .trim();
}

export function isOn(value: string | undefined | null) {
  return String(value ?? "").trim() !== "";
}

export const C = {
  listed: (row: CsvRow) => isOn(row["物件掲載"]),
  score: (row: CsvRow) => toNumber(row["住戸名寄せ点数"]),
  belong: (row: CsvRow) => Math.trunc(toNumber(row["所属基準値"])),
  total: (row: CsvRow) => toNumber(row["競合物件数(合計)"]),
  c3: (row: CsvRow) => toNumber(row["【第3基準値】競合物件数"]),
  c2: (row: CsvRow) => toNumber(row["【第2基準値】競合物件数"]),
  c1: (row: CsvRow) => toNumber(row["【第1基準値】競合物件数"]),
  inquiry: (row: CsvRow) => toNumber(row["問い合わせ(合計)"]),
  listPV: (row: CsvRow) => toNumber(row["合計一覧PV(合計)"]),
  detailPV: (row: CsvRow) => toNumber(row["合計詳細PV(合計)"]),
  detailPvPerDay: (row: CsvRow) => toNumber(row["物件詳細PV(一日当たり)"]),
  days: (row: CsvRow) => toNumber(row["掲載日数(日)(合計)"]),
  smapic: (row: CsvRow) => isOn(row["スマピク掲載"]),
  panorama: (row: CsvRow) => isOn(row["パノラマ掲載"]),
  movie: (row: CsvRow) => isOn(row["動画掲載"]),
  area: (row: CsvRow) => isOn(row["得意なエリア枠掲載"]),
  misepic: (row: CsvRow) => isOn(row["店舗案内ピックアップ掲載"]),
  address: (row: CsvRow) => row["物件所在地"] || "",
  name: (row: CsvRow) => row["物件名"] || "",
  room: (row: CsvRow) => row["部屋番号"] || "",
  station: (row: CsvRow) => row["駅"] || "",
  madori: (row: CsvRow) => row["間取"] || "",
  rent: (row: CsvRow) => row["賃料＋管理費"] || "",
};
