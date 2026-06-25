"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { PAGE_TITLES } from "@/data/constants/pageTitles";
import { NAVIGATION_GROUPS, SETTINGS_NAV_ITEM } from "@/data/navigation/navigation";
import { supabase } from "@/lib/supabase";
import {
  readCsvFile,
} from "@/src/server/services/csv";
import type {
  CsvRow,
  CsvSnapshot,
  CsvSummary,
} from "@/src/server/types/csv";

const WARD_GRID = [
  ["西淀川区", "淀川区", "東淀川区", "", ""],
  ["此花区", "福島区", "北区", "都島区", "旭区"],
  ["港区", "西区", "中央区", "東成区", "鶴見区"],
  ["大正区", "浪速区", "天王寺区", "生野区", "城東区"],
  ["住之江区", "西成区", "阿倍野区", "東住吉区", "平野区"],
  ["", "住吉区", "", "", ""],
];

const WARD_INFO: Record<string, string> = {
  北区: "梅田中心。オフィス集積で転勤者・単身若年層の需要が非常に高い大阪随一の中心地。",
  都島区: "京橋エリア。交通利便性が高く単身〜ファミリーまで安定需要。",
  福島区: "梅田隣接で人気飲食店が多く、利便性と住みやすさで若年層・単身に支持される上昇エリア。",
  此花区: "USJ・湾岸エリア。再開発進行中でファミリー需要。",
  中央区: "難波・心斎橋・本町を擁するミナミの中心。単身からDINKsまで幅広い需要。",
  西区: "堀江・新町などおしゃれな街並み。20〜30代の単身・DINKsに人気の都心居住エリア。",
  港区: "弁天町中心。ベイエリアでファミリー・単身とも一定需要。",
  大正区: "下町情緒。家賃が手頃で単身・ファミリーに堅実な需要。",
  天王寺区: "天王寺・上本町の文教地区。教育環境とアクセスでファミリー・単身とも需要が厚い。",
  浪速区: "なんば南・新今宮。難波直結の利便性で単身需要が厚く再開発進行中。",
  西淀川区: "工業・住宅混在。家賃手頃で単身需要。",
  淀川区: "新大阪擁する交通要衝。出張・転勤の単身需要が高い。",
  東淀川区: "住宅地中心。学生・単身に手頃な家賃帯。",
  東成区: "中央区東隣の住宅地。職住近接でファミリー需要。",
  生野区: "下町・多文化エリア。家賃手頃で実需中心。",
  旭区: "住宅地。落ち着いた環境でファミリー需要。",
  城東区: "京橋至近の住宅地。利便性とコスパで単身〜ファミリー。",
  阿倍野区: "天王寺至近。あべのハルカス周辺の人気居住エリア。",
  住吉区: "閑静な住宅地。ファミリー需要が中心。",
  東住吉区: "住宅地。家賃手頃でファミリー・単身。",
  西成区: "再開発と家賃の手頃さ。単身需要が中心。",
  住之江区: "南港・住宅混在。コスパ重視の単身・ファミリー。",
  鶴見区: "住宅地。緑地多くファミリー需要。",
  平野区: "大阪市最大人口の住宅区。手頃な家賃でファミリー需要。",
};

const WARD_POP: Record<string, number> = {
  北区: 10,
  中央区: 10,
  西区: 8,
  天王寺区: 8,
  福島区: 8,
  浪速区: 7,
  都島区: 6,
  阿倍野区: 7,
  淀川区: 6,
  城東区: 5,
  此花区: 4,
  港区: 4,
  東成区: 5,
  生野区: 4,
  旭区: 4,
  住吉区: 5,
  東住吉区: 4,
  西成区: 4,
  住之江区: 4,
  鶴見区: 4,
  平野区: 5,
  大正区: 4,
  西淀川区: 3,
  東淀川区: 4,
};

const ALL_WARDS = WARD_GRID.flat()
  .filter((w): w is string => Boolean(w))
  .filter((w, i, arr) => arr.indexOf(w) === i)
  .sort();

const DEFAULT_SETTINGS: Settings = {
  slots: 500,
  smapicLimit: 300,
  ward: "中央区",
  prices: {
    smapic: 600,
    misepic: 500,
    panorama: 500,
    area: 400,
    movie: 600,
  },
};

type PageId =
  | "home"
  | "weekly"
  | "monthly"
  | "props"
  | "opt"
  | "smapic"
  | "lowpv"
  | "optbal"
  | "area"
  | "upload"
  | "settings";

type Settings = {
  slots: number;
  smapicLimit: number;
  ward: string;
  prices: {
    smapic: number;
    misepic: number;
    panorama: number;
    area: number;
    movie: number;
  };
};

type DayDiff = {
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

type PeriodSummary = {
  key: string;
  label: string;
  subLabel?: string;
  listPV: number;
  detailPV: number;
  inquiry: number;
  avgCompetition: number;
  count: number;
};

type SmartItem = {
  id: string;
  name: string;
  room: string;
  score: number;
  priorityScore: number;
  currentSmapic: boolean;
  lowPerformance: boolean;
};

type PropertyHistory = {
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

type OptionBalance = {
  totalSaving: number;
  totalWaste: number;
  waste: Record<OptionKey, number>;
  current: Record<OptionKey, number>;
  cards: Array<{
    key: OptionKey;
    name: string;
    icon: string;
    price: number;
    current: number;
    waste: number;
    saving: number;
  }>;
};

type OptionKey = "smapic" | "misepic" | "panorama" | "area" | "movie";

type AnalysisResult = {
  listedRows: CsvRow[];
  lowPvRows: CsvRow[];
  removeAllRows: CsvRow[];
  lowerToSecondRows: CsvRow[];
  raiseToSecondRows: CsvRow[];
  raiseToThirdRows: CsvRow[];
  smapicAdd: SmartItem[];
  smapicRemove: SmartItem[];
  optionBalance: OptionBalance;
  totalInquiry: number;
  smapicRows: number;
};

type CheckState = Record<string, string[]>;

function pageClass(activePage: string, id: PageId) {
  return `page${activePage === id ? " active" : ""}`;
}

function navClass(activePage: string, id: PageId, extra = "") {
  return `nav-item${extra ? ` ${extra}` : ""}${activePage === id ? " active" : ""}`;
}

function toNumber(value: string | number | undefined | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = String(value).replace(/,/g, "").replace(/%/g, "").replace(/円/g, "").replace(/[^0-9.\-]/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeId(value: string | undefined | null) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[-‐ー−―]/g, "-")
    .replace(/[（）()「」【】]/g, "")
    .replace(/[\s　]+/g, "")
    .trim();
}

function isOn(value: string | undefined | null) {
  return String(value ?? "").trim() !== "";
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ja-JP");
}

function formatMoney(value: number) {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

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

function deltaCell(current: number, previous?: number) {
  if (!previous) return <span style={{ color: "var(--ink3)" }}>—</span>;
  const rate = ((current - previous) / previous) * 100;
  if (current > previous) return <span className="d-up">▲{rate.toFixed(1)}%</span>;
  if (current < previous) return <span className="d-down">▼{Math.abs(rate).toFixed(1)}%</span>;
  return <span style={{ color: "var(--ink3)" }}>±0%</span>;
}

function rowKey(row: CsvRow) {
  return row["物件コード"] || `${normalizeId(row["物件名"])}-${normalizeId(row["部屋番号"])}`;
}

const C = {
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

function buildSummary(rows: CsvRow[]): CsvSummary {
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

function buildDayDiffs(snapshots: CsvSnapshot[]): DayDiff[] {
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

function buildWeekly(days: DayDiff[]): PeriodSummary[] {
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

function buildMonthly(days: DayDiff[]): PeriodSummary[] {
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

function buildPropertyHistories(days: DayDiff[]): PropertyHistory[] {
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

function analyzeRows(rows: CsvRow[], settings: Settings): AnalysisResult {
  const listedRows = rows.filter(C.listed);
  const totalInquiry = rows.reduce((sum, row) => sum + C.inquiry(row), 0);
  const smapicRows = rows.filter(C.smapic).length;
  const lowPvRows = listedRows
    .filter((row) => C.days(row) >= 3 && C.detailPvPerDay(row) > 0 && C.detailPvPerDay(row) < 0.3)
    .sort((a, b) => C.detailPvPerDay(a) - C.detailPvPerDay(b));

  const removeAllRows = rows
    .filter((row) => C.listed(row) && C.belong(row) >= 2 && C.total(row) <= 3)
    .sort((a, b) => C.score(a) - C.score(b));

  const lowerToSecondRows = rows
    .filter((row) => {
      if (!C.listed(row)) return false;
      const totalByBasis = C.c3(row) + C.c2(row) + C.c1(row);
      if (totalByBasis < 4 || C.c2(row) > 2) return false;
      return C.c3(row) <= 2 && C.belong(row) === 3;
    })
    .sort((a, b) => C.total(b) - C.total(a));

  const raiseToSecondRows = rows
    .filter((row) => C.listed(row) && C.belong(row) <= 1 && C.total(row) >= 4 && C.c3(row) <= 2 && C.c2(row) <= 2)
    .sort((a, b) => C.total(b) - C.total(a));

  const raiseToThirdRows = rows
    .filter((row) => C.listed(row) && C.belong(row) <= 2 && C.total(row) >= 4 && C.c2(row) >= 2 && C.c1(row) >= 3)
    .sort((a, b) => C.inquiry(b) - C.inquiry(a));

  const smartScores: SmartItem[] = rows.map((row) => {
    const listPV = C.listPV(row);
    const detailPV = C.detailPV(row);
    const inquiry = C.inquiry(row);
    const days = C.days(row);
    const competition = C.total(row);
    const detailRate = detailPV > 0 ? inquiry / detailPV : 0;
    const transitionRate = listPV > 0 ? detailPV / listPV : 0;
    const score = detailRate * 10000 + transitionRate * 5000 + inquiry * 10 + competition * 10 + listPV / 100;
    const priorityScore = listPV + detailPV * 2 + competition * 5;

    return {
      id: `${normalizeId(C.name(row))}-${normalizeId(C.room(row))}`,
      name: C.name(row),
      room: C.room(row),
      score,
      priorityScore,
      currentSmapic: C.smapic(row),
      lowPerformance: days >= 15 && inquiry <= 0 && competition <= 5,
    };
  });

  const available = smartScores.filter((item) => rows.find((row) => `${normalizeId(C.name(row))}-${normalizeId(C.room(row))}` === item.id && C.listed(row)) && !item.lowPerformance);
  const topBySmartScore = available.filter((item) => !item.currentSmapic).sort((a, b) => b.score - a.score).slice(0, 200);
  const topByPriority = [...available].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 100);
  const finalMap = new Map<string, SmartItem>();
  topBySmartScore.forEach((item) => finalMap.set(item.id, item));
  topByPriority.forEach((item) => finalMap.set(item.id, item));
  const finalRecommended = Array.from(finalMap.values()).sort((a, b) => b.score - a.score).slice(0, settings.smapicLimit);

  if (finalRecommended.length < settings.smapicLimit) {
    const extras = smartScores.filter((item) => !finalMap.has(item.id) && !item.lowPerformance).sort((a, b) => b.score - a.score);
    for (const item of extras) {
      if (finalRecommended.length >= settings.smapicLimit) break;
      finalRecommended.push(item);
      finalMap.set(item.id, item);
    }
  }

  const finalSet = new Set(finalRecommended.map((item) => item.id));
  const smapicAdd = finalRecommended.filter((item) => !item.currentSmapic).sort((a, b) => b.score - a.score);
  const smapicRemove = smartScores
    .filter((item) => item.currentSmapic && !finalSet.has(item.id))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.max(smapicAdd.length, 30));

  const optionBalance = computeOptionBalance(rows, settings, removeAllRows, smapicRemove);

  return {
    listedRows,
    lowPvRows,
    removeAllRows,
    lowerToSecondRows,
    raiseToSecondRows,
    raiseToThirdRows,
    smapicAdd,
    smapicRemove,
    optionBalance,
    totalInquiry,
    smapicRows,
  };
}

function computeOptionBalance(rows: CsvRow[], settings: Settings, removeAllRows: CsvRow[], smapicRemoveList: SmartItem[]): OptionBalance {
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

function computeAreaAllocation(ward: string) {
  const positions: Record<string, { r: number; c: number }> = {};
  WARD_GRID.forEach((row, r) => row.forEach((w, c) => {
    if (w) positions[w] = { r, c };
  }));

  const pos = positions[ward];
  if (!pos) return [];

  const adjacent: string[] = [];
  WARD_GRID.forEach((row, rr) => row.forEach((w, cc) => {
    if (w && w !== ward && Math.abs(rr - pos.r) <= 1 && Math.abs(cc - pos.c) <= 1) adjacent.push(w);
  }));

  const targets = [ward, ...adjacent.sort((a, b) => (WARD_POP[b] || 3) - (WARD_POP[a] || 3)).slice(0, 5)];
  const weights = targets.map((w, index) => (index === 0 ? (WARD_POP[w] || 5) * 1.6 : WARD_POP[w] || 3));
  const sum = weights.reduce((acc, value) => acc + value, 0);

  return targets.map((w, index) => ({ ward: w, pct: (weights[index] / sum) * 100, info: WARD_INFO[w] || "" }));
}

function maxValue(values: number[]) {
  return Math.max(...values, 1);
}

function CheckableRow({
  tableId,
  itemKey,
  checked,
  onChange,
  children,
}: {
  tableId: string;
  itemKey: string;
  checked: boolean;
  onChange: (tableId: string, key: string, checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <tr className={checked ? "done" : ""}>
      <td className="col-check">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(tableId, itemKey, event.target.checked)} />
      </td>
      {children}
    </tr>
  );
}

function EmptyRow({ colSpan, text = "—" }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty">
        {text}
      </td>
    </tr>
  );
}

function ProgressActions({ tableId, total, checkedState, onClear }: { tableId: string; total: number; checkedState: CheckState; onClear: (tableId: string) => void }) {
  const done = checkedState[tableId]?.length ?? 0;
  return (
    <div className="card-actions">
      <span className="progress-label">{done} / {total}</span>
      <button type="button" className="clear-btn" onClick={() => onClear(tableId)}>
        チェック解除
      </button>
    </div>
  );
}

function MiniBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = maxValue(data.map((item) => item.value));
  if (!data.length) return <div className="empty">比較用に2日分以上のCSVを読み込んでください</div>;

  return (
    <div style={{ padding: "8px 2px", display: "grid", gap: 8 }}>
      {data.slice(-10).map((item) => (
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "96px 1fr 72px", alignItems: "center", gap: 8, fontSize: 11 }}>
          <div style={{ color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
          <div style={{ height: 12, background: "var(--green-l)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(3, (item.value / max) * 100)}%`, background: "var(--green)", borderRadius: 8 }} />
          </div>
          <div className="num" style={{ fontWeight: 700 }}>{formatNumber(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

function useHydratedSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;

    try {
      const raw = localStorage.getItem("gugumo_s");
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw);

      return {
        slots: Number(parsed.slots ?? parsed.s_slots ?? DEFAULT_SETTINGS.slots),
        smapicLimit: Number(parsed.smapicLimit ?? parsed.smapic_limit ?? DEFAULT_SETTINGS.smapicLimit),
        ward: parsed.ward ?? DEFAULT_SETTINGS.ward,
        prices: {
          smapic: Number(parsed.pr_smapic ?? parsed.prices?.smapic ?? DEFAULT_SETTINGS.prices.smapic),
          misepic: Number(parsed.pr_misepic ?? parsed.prices?.misepic ?? DEFAULT_SETTINGS.prices.misepic),
          panorama: Number(parsed.pr_panorama ?? parsed.prices?.panorama ?? DEFAULT_SETTINGS.prices.panorama),
          area: Number(parsed.pr_area ?? parsed.prices?.area ?? DEFAULT_SETTINGS.prices.area),
          movie: Number(parsed.pr_movie ?? parsed.prices?.movie ?? DEFAULT_SETTINGS.prices.movie),
        },
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  return [settings, setSettings] as const;
}

export default function Page() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [snapshots, setSnapshots] = useState<CsvSnapshot[]>([]);
  const [isReadingCsv, setIsReadingCsv] = useState(false);
  const [settings, setSettings] = useHydratedSettings();
  const [checkedState, setCheckedState] = useState<CheckState>(() => {
    if (typeof window === "undefined") return {};

    try {
      const raw = localStorage.getItem("gugumo_checks");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [savedVisible, setSavedVisible] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [openProperties, setOpenProperties] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("gugumo_checks", JSON.stringify(checkedState));
    } catch {
      // ignore
    }
  }, [checkedState]);

  const latestSnapshot = snapshots[snapshots.length - 1];
  const latestRows = latestSnapshot?.rows ?? [];
  const latestSummary = latestSnapshot?.summary;
  const dayDiffs = useMemo(() => buildDayDiffs(snapshots), [snapshots]);
  const weekly = useMemo(() => buildWeekly(dayDiffs), [dayDiffs]);
  const monthly = useMemo(() => buildMonthly(dayDiffs), [dayDiffs]);
  const propertyHistories = useMemo(() => buildPropertyHistories(dayDiffs), [dayDiffs]);
  const analysis = useMemo(() => analyzeRows(latestRows, settings), [latestRows, settings]);
  const areaAllocation = useMemo(() => computeAreaAllocation(settings.ward), [settings.ward]);

  const goto = (id: PageId) => setActivePage(id);
  const navBadgeValue = (badge: "weeklyCount" | "optionReviewCount" | "lowPvCount") => {
    if (badge === "weeklyCount") return weekly.length ? `${weekly.length}週` : "—";
    if (badge === "optionReviewCount") return analysis.removeAllRows.length + analysis.lowerToSecondRows.length + analysis.raiseToSecondRows.length + analysis.raiseToThirdRows.length || "—";
    return analysis.lowPvRows.length || "—";
  };

  const toggleCheck = (tableId: string, key: string, checked: boolean) => {
    setCheckedState((current) => {
      const existing = new Set(current[tableId] ?? []);
      if (checked) existing.add(key);
      else existing.delete(key);
      return { ...current, [tableId]: Array.from(existing) };
    });
  };

  const clearChecks = (tableId: string) => {
    setCheckedState((current) => ({ ...current, [tableId]: [] }));
  };

  const isChecked = (tableId: string, key: string) => Boolean(checkedState[tableId]?.includes(key));

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const loadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.name.toLowerCase().endsWith(".csv"));
    if (!files.length) return;

    setIsReadingCsv(true);
    setCheckedState({});

    try {
      const parsed = await Promise.all(files.sort((a, b) => a.name.localeCompare(b.name)).map((file) => readCsvFile(file, {
        buildSummary,
        dateKey,
        formatDate,
      })));
      parsed.sort((a, b) => a.date.getTime() - b.date.getTime());

      for (const snapshot of parsed) {
        const { error } = await supabase.from("csv_uploads").insert({
          file_name: snapshot.fileName,
          file_data: snapshot.rows,
        });

        if (error) {
          console.error(error);
          alert(`Supabase保存に失敗しました: ${snapshot.fileName}`);
          return;
        }
      }

      setSnapshots(parsed);
      goto("home");
      alert("CSVを読み込み、Supabaseに保存しました。");
    } catch (error) {
      console.error(error);
      alert("CSVの読み込みに失敗しました。ファイル形式を確認してください。");
    } finally {
      setIsReadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) loadFiles(event.target.files);
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(
        "gugumo_s",
        JSON.stringify({
          slots: settings.slots,
          smapic_limit: settings.smapicLimit,
          ward: settings.ward,
          pr_smapic: settings.prices.smapic,
          pr_misepic: settings.prices.misepic,
          pr_panorama: settings.prices.panorama,
          pr_area: settings.prices.area,
          pr_movie: settings.prices.movie,
        }),
      );
      setSavedVisible(true);
      window.setTimeout(() => setSavedVisible(false), 2000);
    } catch {
      alert("設定保存に失敗しました。");
    }
  };

  const setPrice = (key: OptionKey, value: number) => {
    setSettings((current) => ({ ...current, prices: { ...current.prices, [key]: value } }));
  };

  const filteredProperties = propertyHistories
    .filter((property) => {
      const q = propertySearch.trim().toLowerCase();
      if (!q) return true;
      return [property.name, property.room, property.station, property.madori].some((value) => value.toLowerCase().includes(q));
    })
    .slice(0, 80);

  const currentWardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    analysis.listedRows.forEach((row) => {
      const address = C.address(row);
      const ward = areaAllocation.find((item) => address.includes(item.ward));
      if (ward) counts[ward.ward] = (counts[ward.ward] ?? 0) + 1;
    });
    return counts;
  }, [analysis.listedRows, areaAllocation]);

  const topbarStatus = latestSnapshot ? `${snapshots.length}ファイル読み込み済み / 最新 ${latestSnapshot.dateLabel}` : "データ未読み込み";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-row">
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <ellipse cx="14" cy="17" rx="9" ry="8" fill="#3a3a4a" />
              <ellipse cx="14" cy="16.5" rx="7.5" ry="6.5" fill="#4a4a5e" />
              <circle cx="11.5" cy="14" r="1.5" fill="#fff" />
              <circle cx="16.5" cy="14" r="1.5" fill="#fff" />
              <circle cx="11.8" cy="13.7" r="0.5" fill="#1e1e2e" />
              <circle cx="16.8" cy="13.7" r="0.5" fill="#1e1e2e" />
              <path d="M12.5 16.5 Q14 17.5 15.5 16.5" stroke="#5DCAA5" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              <ellipse cx="9" cy="7.5" rx="2" ry="2.5" fill="#3a3a4a" />
              <ellipse cx="19" cy="7.5" rx="2" ry="2.5" fill="#3a3a4a" />
              <ellipse cx="9" cy="7.5" rx="1.2" ry="1.8" fill="#4a4a5e" />
              <ellipse cx="19" cy="7.5" rx="1.2" ry="1.8" fill="#4a4a5e" />
            </svg>
            <div>
              <div className="logo-text">GUGUMO<span className="up">↑</span></div>
              <div className="logo-sub">SUUMO最適化</div>
            </div>
          </div>
        </div>
        <nav className="nav">
          {NAVIGATION_GROUPS.map((group) => (
            <Fragment key={group.label}>
              <div className="nav-group">{group.label}</div>
              {group.items.map((item) => (
                <div key={item.id} className={navClass(activePage, item.id, item.extraClass)} onClick={() => goto(item.id)}>
                  <i className={`ti ${item.icon}`} />
                  <span>{item.label}</span>
                  {item.badge ? <span className={`nav-badge${item.badgeClass ? ` ${item.badgeClass}` : ""}`}>{navBadgeValue(item.badge)}</span> : null}
                </div>
              ))}
            </Fragment>
          ))}
        </nav>
        <div className="mascot">
          <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
            <ellipse cx="14" cy="22" rx="8" ry="7" fill="#3a3a4a" />
            <ellipse cx="14" cy="21" rx="6.5" ry="5.5" fill="#4a4a5e" />
            <circle cx="11.5" cy="19.5" r="1.2" fill="#fff" />
            <circle cx="16.5" cy="19.5" r="1.2" fill="#fff" />
            <circle cx="11.8" cy="19.3" r="0.4" fill="#1e1e2e" />
            <circle cx="16.8" cy="19.3" r="0.4" fill="#1e1e2e" />
            <ellipse cx="8.5" cy="13" rx="1.8" ry="2.2" fill="#3a3a4a" />
            <ellipse cx="19.5" cy="13" rx="1.8" ry="2.2" fill="#3a3a4a" />
            <path d="M14 23.5 Q13 25 12 26" stroke="#3a3a4a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="22" r="2" fill="#3a3a4a" />
            <circle cx="8" cy="23" r="1.5" fill="#3a3a4a" />
          </svg>
          <div className="mascot-msg">今日も<br />最適化しよう</div>
        </div>
        <div className="sidebar-footer">
          <div className="settings-link" onClick={() => goto(SETTINGS_NAV_ITEM.id)}><i className={`ti ${SETTINGS_NAV_ITEM.icon}`} style={{ fontSize: 14 }} /><span>{SETTINGS_NAV_ITEM.label}</span></div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <span className="page-title">{PAGE_TITLES[activePage]}</span>
          <span className={`status-pill${latestSnapshot ? " loaded" : ""}`}>{topbarStatus}</span>
          <button type="button" className="topbar-btn primary" onClick={() => goto("upload")}><i className="ti ti-upload" style={{ fontSize: 13 }} />CSVを読み込む</button>
        </div>

        <div className="content">
          <div className={pageClass(activePage, "home")}>
            {analysis.optionBalance.totalSaving > 0 && (
              <div className="savings-banner">
                <div className="savings-main">
                  <div className="savings-label"><i className="ti ti-sparkles" /> GUGUMOで削減できた無駄オプション費用（月額）</div>
                  <div className="savings-amount">{formatMoney(analysis.optionBalance.totalSaving)}<small>/月</small></div>
                  <div className="savings-sub">無駄オプション {analysis.optionBalance.totalWaste}件を特定（年間 {formatMoney(analysis.optionBalance.totalSaving * 12)} の削減効果）</div>
                </div>
                <div className="savings-detail">
                  <div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.waste.smapic}</div><div className="savings-stat-lbl">スマピク無駄</div></div>
                  <div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.waste.panorama}</div><div className="savings-stat-lbl">パノラマ無駄</div></div>
                  <div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.waste.misepic}</div><div className="savings-stat-lbl">店ピク無駄</div></div>
                </div>
              </div>
            )}

            <div className="metrics">
              <div className="metric"><div className="metric-label">掲載物件数</div><div className="metric-value">{latestSummary ? formatNumber(latestSummary.listedRows) : "—"}</div><div className="metric-sub">件</div></div>
              <div className="metric"><div className="metric-label">総問い合わせ</div><div className="metric-value">{latestSummary ? formatNumber(latestSummary.totalInquiry) : "—"}</div><div className="metric-sub">件</div></div>
              <div className="metric"><div className="metric-label">スマピク適用</div><div className="metric-value">{latestSummary ? formatNumber(latestSummary.smapicRows) : "—"}</div><div className="metric-sub">件</div></div>
              <div className="metric danger"><div className="metric-label">入替対象</div><div className="metric-value">{analysis.lowPvRows.length || "—"}</div><div className="metric-sub">件</div></div>
            </div>

            <div className="row3">
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />週次PV推移</div></div>
                <div className="chart-wrap"><MiniBarChart data={weekly.map((week, index) => ({ label: `W${index + 1}`, value: week.listPV }))} /></div>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-alert-triangle" />要対応アラート</div></div>
                {!latestSnapshot ? <div className="empty">データを読み込んでください</div> : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      className="notice"
                      style={{
                        background: "#FCEBEB",
                        border: "1px solid #F4B8B8",
                        color: "#A32D2D",
                        borderRadius: 10,
                        padding: "12px 14px",
                        fontWeight: 700,
                      }}
                    >
                      <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "#A32D2D" }} />
                      <span>入替対象 {analysis.lowPvRows.length}件</span>
                    </div>
                    <div
                      className="notice"
                      style={{
                        background: "#FAEEDA",
                        border: "1px solid #E8C58E",
                        color: "#854F0B",
                        borderRadius: 10,
                        padding: "12px 14px",
                        fontWeight: 700,
                      }}
                    >
                      <i className="ti ti-adjustments" style={{ fontSize: 16, color: "#854F0B" }} />
                      <span>
                        オプション見直し {analysis.removeAllRows.length + analysis.lowerToSecondRows.length + analysis.raiseToSecondRows.length + analysis.raiseToThirdRows.length}件
                      </span>
                    </div>
                    <div
                      className="notice"
                      style={{
                        background: "#E6F1FB",
                        border: "1px solid #B8D8F1",
                        color: "#185FA5",
                        borderRadius: 10,
                        padding: "12px 14px",
                        fontWeight: 700,
                      }}
                    >
                      <i className="ti ti-star" style={{ fontSize: 16, color: "#185FA5" }} />
                      <span>スマピク付与推奨 {analysis.smapicAdd.length}件 / 削除推奨 {analysis.smapicRemove.length}件</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title"><i className="ti ti-clock" />日次ログ（直近7日）</div></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>データ日付</th><th>一覧PV</th><th>詳細PV</th><th>問合せ</th><th>平均競合数</th><th>掲載件数</th></tr></thead>
                  <tbody>
                    {dayDiffs.length ? [...dayDiffs].reverse().slice(0, 7).map((day) => (
                      <tr key={day.dateKey}><td>{day.dateLabel}</td><td className="num">{formatNumber(day.listPV)}</td><td className="num">{formatNumber(day.detailPV)}</td><td className="num">{formatNumber(day.inquiry)}</td><td className="num">{day.avgCompetition.toFixed(1)}</td><td className="num">{formatNumber(day.listedCount)}</td></tr>
                    )) : <EmptyRow colSpan={6} text="比較用に2日分以上のCSVを読み込んでください" />}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={pageClass(activePage, "weekly")}>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />週次PV推移（木〜水締め）</div></div><div className="chart-wrap tall"><MiniBarChart data={weekly.map((week) => ({ label: week.label, value: week.listPV }))} /></div></div>
            <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>週</th><th>期間</th><th>一覧PV</th><th>前週比</th><th>詳細PV</th><th>前週比</th><th>問合せ</th><th>前週比</th><th>平均競合数</th></tr></thead><tbody>{weekly.length ? weekly.map((week, index) => { const prev = weekly[index - 1]; return <tr key={week.key}><td>W{index + 1}</td><td style={{ color: "var(--ink3)", fontSize: 10 }}>{week.label}</td><td className="num">{formatNumber(week.listPV)}</td><td>{deltaCell(week.listPV, prev?.listPV)}</td><td className="num">{formatNumber(week.detailPV)}</td><td>{deltaCell(week.detailPV, prev?.detailPV)}</td><td className="num">{formatNumber(week.inquiry)}</td><td>{deltaCell(week.inquiry, prev?.inquiry)}</td><td className="num">{week.avgCompetition.toFixed(1)}</td></tr>; }) : <EmptyRow colSpan={9} text="比較用に2日分以上のCSVを読み込んでください" />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "monthly")}>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />月次推移（月末締め）</div></div><div className="chart-wrap tall"><MiniBarChart data={monthly.map((month) => ({ label: month.label, value: month.listPV }))} /></div></div>
            <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>月</th><th>一覧PV</th><th>前月比</th><th>詳細PV</th><th>前月比</th><th>問合せ</th><th>前月比</th><th>平均競合数</th></tr></thead><tbody>{monthly.length ? monthly.map((month, index) => { const prev = monthly[index - 1]; return <tr key={month.key}><td>{month.label}</td><td className="num">{formatNumber(month.listPV)}</td><td>{deltaCell(month.listPV, prev?.listPV)}</td><td className="num">{formatNumber(month.detailPV)}</td><td>{deltaCell(month.detailPV, prev?.detailPV)}</td><td className="num">{formatNumber(month.inquiry)}</td><td>{deltaCell(month.inquiry, prev?.inquiry)}</td><td className="num">{month.avgCompetition.toFixed(1)}</td></tr>; }) : <EmptyRow colSpan={8} text="比較用に2日分以上のCSVを読み込んでください" />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "props")}>
            <div className="card">
              <input value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} placeholder="物件名・駅で検索..." style={{ width: "100%", padding: "7px 11px", fontSize: 12, border: "0.5px solid var(--line2)", borderRadius: 6, background: "var(--panel)", color: "var(--ink)", marginBottom: 10, fontFamily: "inherit" }} />
              {!filteredProperties.length ? <div className="empty">比較用に2日分以上のCSVを読み込んでください</div> : filteredProperties.map((property) => {
                const totalList = property.entries.reduce((sum, entry) => sum + entry.dListPV, 0);
                const totalInquiry = property.entries.reduce((sum, entry) => sum + entry.dInquiry, 0);
                const changes = property.entries.filter((entry) => entry.smapicChanged || Math.abs(entry.competitionDelta) >= 3).length;
                const open = openProperties[property.key];
                return (
                  <div className="prop-row" key={property.key}>
                    <div className="prop-head" onClick={() => setOpenProperties((current) => ({ ...current, [property.key]: !current[property.key] }))}>
                      <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{property.name} {property.room}</span>
                      <span style={{ fontSize: 10, color: "var(--ink3)" }}>{property.station} / {property.madori}</span>
                      <span style={{ fontSize: 10, color: "var(--ink3)", marginLeft: 6 }}>PV {formatNumber(totalList)} / 問合せ {formatNumber(totalInquiry)}</span>
                      {changes ? <span className="tag tag-amber" style={{ marginLeft: 5 }}>変化{changes}件</span> : null}
                      <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "var(--ink3)", marginLeft: 4 }} />
                    </div>
                    <div className={`prop-body${open ? " open" : ""}`}>
                      <table className="tbl"><thead><tr><th>日付</th><th>一覧PV</th><th>詳細PV</th><th>問合せ</th><th>競合数</th><th>変化</th></tr></thead><tbody>{property.entries.map((entry) => <tr key={`${property.key}-${entry.dateLabel}`}><td>{entry.dateLabel}</td><td className="num">{entry.dListPV}</td><td className="num">{entry.dDetailPV}</td><td className="num">{entry.dInquiry}</td><td className="num">{entry.competition}{entry.competitionDelta !== 0 ? <span style={{ fontSize: 9, marginLeft: 3, color: entry.competitionDelta > 0 ? "#A32D2D" : "#3B6D11" }}>{entry.competitionDelta > 0 ? "▲" : "▼"}{Math.abs(entry.competitionDelta)}</span> : null}</td><td>{entry.smapicChanged ? <span className="tag tag-amber">スマピク{entry.smapicNow ? "付与" : "削除"}</span> : null}</td></tr>)}</tbody></table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={pageClass(activePage, "opt")}>
            <div className="opt-group remove">
              <div className="opt-group-label"><i className="ti ti-circle-minus" />オプションを外す系</div>
              <div className="card"><div className="card-head"><div className="card-title">①全オプションを外す（スマピク以外）</div><ProgressActions tableId="t1" total={analysis.removeAllRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>住戸名寄せ点数</th><th>競合数</th></tr></thead><tbody>{analysis.removeAllRows.length ? analysis.removeAllRows.slice(0, 200).map((row) => { const key = rowKey(row); return <CheckableRow key={key} tableId="t1" itemKey={key} checked={isChecked("t1", key)} onChange={toggleCheck}><td className="nm">{C.name(row)}</td><td>{C.room(row)}</td><td className="num">{C.score(row)}</td><td className="num">{C.total(row)}</td></CheckableRow>; }) : <EmptyRow colSpan={5} />}</tbody></table></div></div>
              <div style={{ height: 11 }} />
              <div className="card"><div className="card-head"><div className="card-title">②第2基準まで落とす</div><ProgressActions tableId="t2" total={analysis.lowerToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋</th><th>第3</th><th>第2</th><th>第1</th><th>競合</th></tr></thead><tbody>{analysis.lowerToSecondRows.length ? analysis.lowerToSecondRows.slice(0, 200).map((row) => { const key = rowKey(row); return <CheckableRow key={key} tableId="t2" itemKey={key} checked={isChecked("t2", key)} onChange={toggleCheck}><td className="nm">{C.name(row)}</td><td>{C.room(row)}</td><td className="num">{C.c3(row)}</td><td className="num">{C.c2(row)}</td><td className="num">{C.c1(row)}</td><td className="num">{C.total(row)}</td></CheckableRow>; }) : <EmptyRow colSpan={7} />}</tbody></table></div></div>
            </div>
            <div className="opt-group add">
              <div className="opt-group-label"><i className="ti ti-circle-plus" />オプションを付ける系</div>
              <div className="card"><div className="card-head"><div className="card-title">③第2基準に上げる</div><ProgressActions tableId="t3" total={analysis.raiseToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋</th><th>第3</th><th>第2</th><th>第1</th><th>競合</th></tr></thead><tbody>{analysis.raiseToSecondRows.length ? analysis.raiseToSecondRows.slice(0, 200).map((row) => { const key = rowKey(row); return <CheckableRow key={key} tableId="t3" itemKey={key} checked={isChecked("t3", key)} onChange={toggleCheck}><td className="nm">{C.name(row)}</td><td>{C.room(row)}</td><td className="num">{C.c3(row)}</td><td className="num">{C.c2(row)}</td><td className="num">{C.c1(row)}</td><td className="num">{C.total(row)}</td></CheckableRow>; }) : <EmptyRow colSpan={7} />}</tbody></table></div></div>
              <div style={{ height: 11 }} />
              <div className="card"><div className="card-head"><div className="card-title">④第3基準に上げる</div><ProgressActions tableId="t4" total={analysis.raiseToThirdRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋</th><th>第3</th><th>第2</th><th>第1</th><th>競合</th></tr></thead><tbody>{analysis.raiseToThirdRows.length ? analysis.raiseToThirdRows.slice(0, 200).map((row) => { const key = rowKey(row); return <CheckableRow key={key} tableId="t4" itemKey={key} checked={isChecked("t4", key)} onChange={toggleCheck}><td className="nm">{C.name(row)}</td><td>{C.room(row)}</td><td className="num">{C.c3(row)}</td><td className="num">{C.c2(row)}</td><td className="num">{C.c1(row)}</td><td className="num">{C.total(row)}</td></CheckableRow>; }) : <EmptyRow colSpan={7} />}</tbody></table></div></div>
            </div>
          </div>

          <div className={pageClass(activePage, "smapic")}>
            <div className="row2">
              <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-circle-plus" />付与推奨</div><ProgressActions tableId="t5" total={analysis.smapicAdd.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>#</th><th>物件名</th><th>部屋番号</th><th>スコア</th><th>現在</th></tr></thead><tbody>{analysis.smapicAdd.length ? analysis.smapicAdd.slice(0, 200).map((item, index) => <CheckableRow key={item.id} tableId="t5" itemKey={item.id} checked={isChecked("t5", item.id)} onChange={toggleCheck}><td className="num">{index + 1}</td><td className="nm">{item.name}</td><td>{item.room}</td><td className="num">{item.score.toFixed(1)}</td><td>なし</td></CheckableRow>) : <EmptyRow colSpan={6} />}</tbody></table></div></div>
              <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-circle-minus" />削除推奨</div><ProgressActions tableId="t5r" total={analysis.smapicRemove.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>#</th><th>物件名</th><th>部屋番号</th><th>スコア</th></tr></thead><tbody>{analysis.smapicRemove.length ? analysis.smapicRemove.slice(0, 200).map((item, index) => <CheckableRow key={item.id} tableId="t5r" itemKey={item.id} checked={isChecked("t5r", item.id)} onChange={toggleCheck}><td className="num">{index + 1}</td><td className="nm">{item.name}</td><td>{item.room}</td><td className="num">{item.score.toFixed(1)}</td></CheckableRow>) : <EmptyRow colSpan={5} />}</tbody></table></div></div>
            </div>
          </div>

          <div className={pageClass(activePage, "lowpv")}>
            <div className="card"><div className="card-head"><div className="card-title" style={{ color: "var(--red)" }}><i className="ti ti-alert-triangle" />入替対象物件</div><ProgressActions tableId="t6" total={analysis.lowPvRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>駅</th><th>間取</th><th>賃料+管理費</th><th>掲載日数</th><th>問合せ</th><th>競合数</th></tr></thead><tbody>{analysis.lowPvRows.length ? analysis.lowPvRows.slice(0, 300).map((row) => { const key = rowKey(row); return <CheckableRow key={key} tableId="t6" itemKey={key} checked={isChecked("t6", key)} onChange={toggleCheck}><td className="nm">{C.name(row)}</td><td>{C.room(row)}</td><td>{C.station(row)}</td><td>{C.madori(row)}</td><td className="num">{C.rent(row)}万円</td><td className="num">{C.days(row)}日</td><td className="num">{C.inquiry(row)}件</td><td className="num">{C.total(row)}件</td></CheckableRow>; }) : <EmptyRow colSpan={9} />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "optbal")}>
            <div className="savings-banner" style={{ marginBottom: 14 }}><div className="savings-main"><div className="savings-label"><i className="ti ti-coin" /> 月額オプション節約効果</div><div className="savings-amount">{formatMoney(analysis.optionBalance.totalSaving)}<small>/月</small></div><div className="savings-sub">最適化による無駄オプションの削減額</div></div><div className="savings-detail"><div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.totalWaste}</div><div className="savings-stat-lbl">無駄オプション計</div></div><div className="savings-stat"><div className="savings-stat-val">{formatMoney(analysis.optionBalance.totalSaving * 12)}</div><div className="savings-stat-lbl">年間削減</div></div></div></div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-scale" />オプション収支分析（現状 vs 最適化後）</div></div><div className="optbal-grid">{analysis.optionBalance.cards.map((card) => <div className="optbal-card" key={card.key}><div className="optbal-name"><i className={`ti ${card.icon}`} style={{ color: "var(--green)" }} />{card.name}</div><div className="optbal-row"><span>現在の付与</span><b>{card.current}件</b></div><div className="optbal-row"><span>無駄（外せる）</span><b style={{ color: "var(--red)" }}>{card.waste}件</b></div><div className="optbal-row"><span>最適化後</span><b>{Math.max(0, card.current - card.waste)}件</b></div><div className="optbal-row"><span>単価</span><b>{formatMoney(card.price)}</b></div><div className={`optbal-verdict ${card.waste > 0 ? "verdict-cut" : "verdict-ok"}`}>{card.waste > 0 ? <>▼ {card.waste}件 削減推奨<br /><span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink3)" }}>月 {formatMoney(card.saving)} 節約</span></> : "適正"}</div></div>)}</div><div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6 }}>※「最適化後の必要数」は現在の掲載・競合状況から、各基準を満たすのに必要なオプション件数を試算したものです。単価は設定画面で変更できます。</div></div>
          </div>

          <div className={pageClass(activePage, "area")}>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-map-2" />掲載エリアマップ — <span style={{ color: "var(--green)" }}>{settings.ward}</span>基準</div></div><div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 12 }}>所属区（濃紺）と、データ上反響が見込める推奨掲載区（緑）。設定画面で所属区を変更できます。</div><div className="area-map">
                {WARD_GRID.map((row, r) =>
                  row.map((ward, c) => {
                    const allocation = areaAllocation.find((item) => item.ward === ward);
                    const isBaseWard = Boolean(ward) && ward === settings.ward;
                    const isRecommendedWard = Boolean(ward) && Boolean(allocation);
                    const cellStyle = !ward
                      ? {
                          background: "transparent",
                          border: "none",
                          boxShadow: "none",
                        }
                      : isBaseWard
                        ? {
                            background: "#1e1e2e",
                            border: "1px solid #1e1e2e",
                            color: "#ffffff",
                          }
                        : isRecommendedWard
                          ? {
                              background: "#e1f5ee",
                              border: "1px solid #9fdcc9",
                              color: "#0f6e56",
                            }
                          : {
                              background: "#ffffff",
                              border: "1px solid var(--line2)",
                              color: "var(--ink)",
                            };

                    return (
                      <div
                        key={`${r}-${c}-${ward}`}
                        className={`area-cell${isBaseWard ? " home" : ""}${isRecommendedWard ? " rec" : ""}`}
                        style={{
                          minHeight: 72,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          fontWeight: 700,
                          fontSize: 14,
                          lineHeight: 1.2,
                          ...cellStyle,
                        }}
                      >
                        {ward ? (
                          <>
                            <span className="ward" style={{ color: "inherit" }}>{ward}</span>
                            {allocation ? (
                              <span
                                className="pct"
                                style={{
                                  marginTop: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  opacity: isBaseWard ? 0.95 : 0.9,
                                  color: "inherit",
                                }}
                              >
                                {allocation.pct.toFixed(1)}%
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div></div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-pie" />推奨掲載配分 vs 現状の掲載件数</div></div><div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 10 }}>推奨配分（緑）に対し、最新CSVの所在地から各区の現掲載件数を集計。<span style={{ color: "var(--red)" }}>不足</span>＝もっと載せるべき／<span style={{ color: "var(--blue)" }}>過剰</span>＝載せ過ぎ。</div><div className="tbl-wrap"><table className="tbl"><thead><tr><th>区</th><th>推奨配分</th><th>推奨件数</th><th>現掲載</th><th>過不足</th><th className="num" style={{ width: 180 }}>バランス</th><th>特性</th></tr></thead><tbody>{areaAllocation.length && latestSnapshot ? areaAllocation.map((item) => { const recommended = Math.round(analysis.listedRows.length * item.pct / 100); const actual = currentWardCounts[item.ward] ?? 0; const diff = actual - recommended; const max = Math.max(recommended, actual, 1); const status = diff < -2 ? <span style={{ color: "var(--red)", fontWeight: 700 }}>不足 {Math.abs(diff)}</span> : diff > 2 ? <span style={{ color: "var(--blue)", fontWeight: 700 }}>過剰 +{diff}</span> : <span style={{ color: "var(--green)" }}>適正</span>; return <tr key={item.ward}><td className="nm" style={{ fontWeight: 700 }}>{item.ward}{item.ward === settings.ward ? <span className="tag" style={{ background: "#1e1e2e", color: "#fff", marginLeft: 4 }}>所属</span> : null}</td><td className="num">{item.pct.toFixed(1)}%</td><td className="num">{recommended}件</td><td className="num">{actual}件</td><td>{status}</td><td><div className="area-bar"><div style={{ width: `${(actual / max) * 100}%`, background: diff < -2 ? "var(--red)" : diff > 2 ? "var(--blue)" : "var(--green)" }} /></div></td><td style={{ whiteSpace: "normal", maxWidth: 260, fontSize: 10.5, color: "var(--ink2)" }}>{item.info}</td></tr>; }) : <EmptyRow colSpan={7} text="設定画面で所属区を選び、CSVを読み込んでください" />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "upload")}>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-upload" />CSVアップロード</div></div><div className={`upload-zone${isDragOver ? " drag" : ""}`} onClick={openFileDialog} onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={(event) => { event.preventDefault(); setIsDragOver(false); if (event.dataTransfer.files.length) loadFiles(event.dataTransfer.files); }} style={{ cursor: "pointer" }}><i className="ti ti-files" style={{ fontSize: 28, color: "var(--ink2)", display: "block", marginBottom: 9 }} /><div style={{ fontSize: 13.5, color: "var(--ink2)" }}>{isReadingCsv ? "読み込み中..." : "複数ファイルをまとめてドロップ or クリック"}</div><div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 5 }}>keisaibukken_report_YYYYMMDD_hhmmss.csv / Shift-JIS・UTF-8 対応</div></div><input ref={fileInputRef} type="file" accept=".csv" multiple style={{ display: "none" }} onChange={handleFileInput} /><div style={{ marginTop: 9 }}>{snapshots.map((snapshot) => <span className="chip" key={snapshot.fileName}>{snapshot.dateLabel} / {snapshot.rows.length}件</span>)}</div><div className="notice"><i className="ti ti-lock" style={{ fontSize: 13 }} />データはブラウザ内のみで処理。サーバーには送信されません。</div><div className="notice"><i className="ti ti-refresh" style={{ fontSize: 13 }} />新しいCSVを読み込むと、チェック（対応済み）はリセットされます。</div></div>
          </div>

          <div className={pageClass(activePage, "settings")}>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-settings" />SUUMO契約枠</div></div><div className="setting-grid"><div className="setting-card"><div className="setting-label">掲載枠数（総数）</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><input className="setting-input" type="number" value={settings.slots} min={0} onChange={(event) => setSettings((current) => ({ ...current, slots: Number(event.target.value) }))} /><span style={{ fontSize: 11, color: "var(--ink3)" }}>件</span></div></div><div className="setting-card"><div className="setting-label">スマピク上限</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><input className="setting-input" type="number" value={settings.smapicLimit} min={0} onChange={(event) => setSettings((current) => ({ ...current, smapicLimit: Number(event.target.value) }))} /><span style={{ fontSize: 11, color: "var(--ink3)" }}>件</span></div></div><div className="setting-card"><div className="setting-label">所属区（エリア配分の基準）</div><div><select className="setting-select" value={settings.ward} onChange={(event) => setSettings((current) => ({ ...current, ward: event.target.value }))}>{ALL_WARDS.map((ward) => <option key={ward} value={ward}>{ward}</option>)}</select></div></div><div className="setting-card" style={{ display: "flex", alignItems: "flex-end" }}><button type="button" className="save-btn" onClick={saveSettings}>保存して再計算</button>{savedVisible ? <span style={{ fontSize: 10, color: "#3B6D11", marginLeft: 8 }}>✓ 保存済み</span> : null}</div></div></div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-coin" />オプション単価（月額・1件あたり）</div></div><div className="setting-grid"><div className="setting-card"><div className="setting-label">スマピク</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.smapic} min={0} onChange={(event) => setPrice("smapic", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">店ピク</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.misepic} min={0} onChange={(event) => setPrice("misepic", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">パノラマ</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.panorama} min={0} onChange={(event) => setPrice("panorama", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">得意なエリア</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.area} min={0} onChange={(event) => setPrice("area", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">動画</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.movie} min={0} onChange={(event) => setPrice("movie", Number(event.target.value))} /></div></div></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
