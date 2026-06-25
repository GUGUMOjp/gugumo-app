import {
  C,
  isOn,
  normalizeId,
} from "@/src/server/services/csv";
import type {
  CsvRow,
  CsvSnapshot,
  CsvSummary,
} from "@/src/server/types/csv";

export type DayDiff = {
  date: Date;
  dateKey: string;
  dateLabel: string;
  listPV: number;
  detailPV: number;
  inquiry: number;
  avgCompetition: number;
  listedCount: number;
  propertyDiffs: PropertyDiff[];
};

type PropertyDiff = {
  key: string;
  name: string;
  room: string;
  station: string;
  madori: string;
  dListPV: number;
  dDetailPV: number;
  dInquiry: number;
  competition: number;
  competitionDelta: number;
  smapicChanged: boolean;
  smapicNow: boolean;
};

export type PeriodSummary = {
  key: string;
  label: string;
  subLabel?: string;
  listPV: number;
  detailPV: number;
  inquiry: number;
  avgCompetition: number;
  count: number;
};

export type PropertyHistory = {
  key: string;
  name: string;
  room: string;
  station: string;
  madori: string;
  entries: Array<{
    dateLabel: string;
    dListPV: number;
    dDetailPV: number;
    dInquiry: number;
    competition: number;
    competitionDelta: number;
    smapicChanged: boolean;
    smapicNow: boolean;
  }>;
};

function formatDate(date: Date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatYearMonth(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function weekStartKey(date: Date) {
  const day = date.getDay();
  const diff = day >= 4 ? day - 4 : day + 3;
  const target = new Date(date);
  target.setDate(date.getDate() - diff);
  return dateKey(target);
}

function weekEndFromKey(key: string) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + 6);
  return d;
}

function rowKey(row: CsvRow) {
  return row["物件コード"] || `${normalizeId(row["物件名"])}-${normalizeId(row["部屋番号"])}`;
}

export function buildSummary(rows: CsvRow[]): CsvSummary {
  const listedRows = rows.filter(C.listed);
  const competitionValues = listedRows.map(C.total);
  const lowPvRows = listedRows.filter((row) => C.days(row) >= 3 && C.detailPvPerDay(row) > 0 && C.detailPvPerDay(row) < 0.3).length;

  return {
    totalRows: rows.length,
    listedRows: listedRows.length,
    vacantRows: rows.filter((row) => isOn(row["空室"])).length,
    totalInquiry: rows.reduce((sum, row) => sum + C.inquiry(row), 0),
    totalListPv: rows.reduce((sum, row) => sum + C.listPV(row), 0),
    totalDetailPv: rows.reduce((sum, row) => sum + C.detailPV(row), 0),
    smapicRows: rows.filter(C.smapic).length,
    lowPvRows,
    averageCompetition: competitionValues.length ? competitionValues.reduce((sum, value) => sum + value, 0) / competitionValues.length : 0,
  };
}

export function buildDayDiffs(snapshots: CsvSnapshot[]): DayDiff[] {
  const days: DayDiff[] = [];

  for (let i = 1; i < snapshots.length; i += 1) {
    const previous = snapshots[i - 1];
    const current = snapshots[i];
    const prevMap = new Map(previous.rows.map((row) => [rowKey(row), row]));
    const propDiffs: PropertyDiff[] = [];
    let listPV = 0;
    let detailPV = 0;
    let inquiry = 0;
    let competitionSum = 0;
    let competitionCount = 0;
    let listedCount = 0;

    current.rows.forEach((currentRow) => {
      const previousRow = prevMap.get(rowKey(currentRow));
      if (!previousRow) return;

      const dListPV = Math.max(0, C.listPV(currentRow) - C.listPV(previousRow));
      const dDetailPV = Math.max(0, C.detailPV(currentRow) - C.detailPV(previousRow));
      const dInquiry = Math.max(0, C.inquiry(currentRow) - C.inquiry(previousRow));
      const competition = C.total(currentRow);
      const competitionDelta = competition - C.total(previousRow);

      listPV += dListPV;
      detailPV += dDetailPV;
      inquiry += dInquiry;

      if (C.listed(currentRow)) {
        listedCount += 1;
        competitionSum += competition;
        competitionCount += 1;
      }

      propDiffs.push({
        key: rowKey(currentRow),
        name: C.name(currentRow),
        room: C.room(currentRow),
        station: C.station(currentRow),
        madori: C.madori(currentRow),
        dListPV,
        dDetailPV,
        dInquiry,
        competition,
        competitionDelta,
        smapicChanged: C.smapic(currentRow) !== C.smapic(previousRow),
        smapicNow: C.smapic(currentRow),
      });
    });

    days.push({
      date: current.date,
      dateKey: current.dateKey,
      dateLabel: current.dateLabel,
      listPV,
      detailPV,
      inquiry,
      avgCompetition: competitionCount ? competitionSum / competitionCount : 0,
      listedCount,
      propertyDiffs: propDiffs,
    });
  }

  return days;
}

export function buildWeekly(days: DayDiff[]): PeriodSummary[] {
  const map = new Map<string, PeriodSummary & { competitionSum: number }>();

  days.forEach((day) => {
    const key = weekStartKey(day.date);
    if (!map.has(key)) {
      const start = new Date(`${key}T00:00:00`);
      map.set(key, {
        key,
        label: `${formatDate(start)}〜${formatDate(weekEndFromKey(key))}`,
        listPV: 0,
        detailPV: 0,
        inquiry: 0,
        avgCompetition: 0,
        count: 0,
        competitionSum: 0,
      });
    }

    const target = map.get(key)!;
    target.listPV += day.listPV;
    target.detailPV += day.detailPV;
    target.inquiry += day.inquiry;
    target.competitionSum += day.avgCompetition;
    target.count += 1;
    target.avgCompetition = target.count ? target.competitionSum / target.count : 0;
  });

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function buildMonthly(days: DayDiff[]): PeriodSummary[] {
  const map = new Map<string, PeriodSummary & { competitionSum: number }>();

  days.forEach((day) => {
    const key = monthKey(day.date);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: formatYearMonth(day.date),
        listPV: 0,
        detailPV: 0,
        inquiry: 0,
        avgCompetition: 0,
        count: 0,
        competitionSum: 0,
      });
    }

    const target = map.get(key)!;
    target.listPV += day.listPV;
    target.detailPV += day.detailPV;
    target.inquiry += day.inquiry;
    target.competitionSum += day.avgCompetition;
    target.count += 1;
    target.avgCompetition = target.count ? target.competitionSum / target.count : 0;
  });

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function buildPropertyHistories(days: DayDiff[]): PropertyHistory[] {
  const map = new Map<string, PropertyHistory>();

  days.forEach((day) => {
    day.propertyDiffs.forEach((diff) => {
      if (!map.has(diff.key)) {
        map.set(diff.key, {
          key: diff.key,
          name: diff.name,
          room: diff.room,
          station: diff.station,
          madori: diff.madori,
          entries: [],
        });
      }

      map.get(diff.key)!.entries.push({
        dateLabel: day.dateLabel,
        dListPV: diff.dListPV,
        dDetailPV: diff.dDetailPV,
        dInquiry: diff.dInquiry,
        competition: diff.competition,
        competitionDelta: diff.competitionDelta,
        smapicChanged: diff.smapicChanged,
        smapicNow: diff.smapicNow,
      });
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    const aPv = a.entries.reduce((sum, entry) => sum + entry.dListPV, 0);
    const bPv = b.entries.reduce((sum, entry) => sum + entry.dListPV, 0);
    return bPv - aPv;
  });
}
