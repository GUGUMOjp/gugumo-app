import { C } from "@/src/server/services/csv";
import type { PropertyHistory } from "@/src/server/services/analysis/summary";
import type { CsvRow } from "@/src/server/types/csv";
import { buildPropertyRowKey } from "@/src/server/shared";

export type PropertyViewModel = PropertyHistory & {
  totalList: number;
  totalInquiry: number;
  changes: number;
};

export type OptionPropertyRowViewModel = {
  key: string;
  name: string;
  room: string;
  score: number;
  total: number;
  c1: number;
  c2: number;
  c3: number;
};

export type LowPvPropertyRowViewModel = {
  key: string;
  name: string;
  room: string;
  station: string;
  madori: string;
  rent: string;
  days: number;
  inquiry: number;
  total: number;
};

export function buildPropertyViewModels(propertyHistories: PropertyHistory[], propertySearch: string): PropertyViewModel[] {
  return propertyHistories
    .filter((property) => {
      const q = propertySearch.trim().toLowerCase();
      if (!q) return true;
      return [property.name, property.room, property.station, property.madori].some((value) => value.toLowerCase().includes(q));
    })
    .slice(0, 80)
    .map((property) => ({
      ...property,
      totalList: property.entries.reduce((sum, entry) => sum + entry.dListPV, 0),
      totalInquiry: property.entries.reduce((sum, entry) => sum + entry.dInquiry, 0),
      changes: property.entries.filter((entry) => entry.smapicChanged || Math.abs(entry.competitionDelta) >= 3).length,
    }));
}

export function buildOptionPropertyRowViewModels(rows: CsvRow[]): OptionPropertyRowViewModel[] {
  return rows.map((row) => ({
    key: buildPropertyRowKey(row),
    name: C.name(row),
    room: C.room(row),
    score: C.score(row),
    total: C.total(row),
    c1: C.c1(row),
    c2: C.c2(row),
    c3: C.c3(row),
  }));
}

export function buildLowPvPropertyRowViewModels(rows: CsvRow[]): LowPvPropertyRowViewModel[] {
  return rows.map((row) => ({
    key: buildPropertyRowKey(row),
    name: C.name(row),
    room: C.room(row),
    station: C.station(row),
    madori: C.madori(row),
    rent: C.rent(row),
    days: C.days(row),
    inquiry: C.inquiry(row),
    total: C.total(row),
  }));
}
