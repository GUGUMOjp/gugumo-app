import { C, normalizeId } from "@/src/server/services/csv";
import type { OptionBalance, SmartItem } from "@/src/server/types";
import type { CsvRow } from "@/src/server/types/csv";

type OptionKey = "smapic" | "misepic" | "panorama" | "area" | "movie";

type OptionBalanceSettings = {
  prices: Record<OptionKey, number>;
};

export function buildOptionBalance(rows: CsvRow[], settings: OptionBalanceSettings, removeAllRows: CsvRow[], smapicRemoveList: SmartItem[]): OptionBalance {
  const current: Record<OptionKey, number> = {
    smapic: rows.filter(C.smapic).length,
    misepic: rows.filter(C.misepic).length,
    panorama: rows.filter(C.panorama).length,
    area: rows.filter(C.area).length,
    movie: rows.filter(C.movie).length,
  };

  const removeAllSet = new Set(removeAllRows.map((row) => `${normalizeId(C.name(row))}-${normalizeId(C.room(row))}`));
  let wasteMisepic = 0;
  let wastePanorama = 0;
  let wasteArea = 0;
  let wasteMovie = 0;

  rows.forEach((row) => {
    const key = `${normalizeId(C.name(row))}-${normalizeId(C.room(row))}`;
    if (!removeAllSet.has(key)) return;
    if (C.misepic(row)) wasteMisepic += 1;
    if (C.panorama(row)) wastePanorama += 1;
    if (C.area(row)) wasteArea += 1;
    if (C.movie(row)) wasteMovie += 1;
  });

  const wasteSmapicLow = rows.filter((row) => C.smapic(row) && C.detailPvPerDay(row) > 0 && C.detailPvPerDay(row) < 0.5).length;

  const waste: Record<OptionKey, number> = {
    smapic: Math.max(smapicRemoveList.length, wasteSmapicLow),
    misepic: wasteMisepic,
    panorama: wastePanorama,
    area: wasteArea,
    movie: wasteMovie,
  };

  const cards = [
    { key: "smapic" as const, name: "スマピク", icon: "ti-star", price: settings.prices.smapic },
    { key: "misepic" as const, name: "店ピク", icon: "ti-building-store", price: settings.prices.misepic },
    { key: "panorama" as const, name: "パノラマ", icon: "ti-360", price: settings.prices.panorama },
    { key: "area" as const, name: "得意なエリア", icon: "ti-map-pin", price: settings.prices.area },
    { key: "movie" as const, name: "動画", icon: "ti-video", price: settings.prices.movie },
  ].map((item) => ({ ...item, current: current[item.key], waste: waste[item.key], saving: waste[item.key] * item.price }));

  return {
    totalSaving: cards.reduce((sum, card) => sum + card.saving, 0),
    totalWaste: cards.reduce((sum, card) => sum + card.waste, 0),
    waste,
    current,
    cards,
  };
}
