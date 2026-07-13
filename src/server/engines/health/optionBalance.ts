import { C } from "@/src/server/services/csv";
import { buildPropertyNameRoomKey } from "@/src/server/shared";
import type { OptionBalance } from "@/src/server/types";
import type { CsvRow } from "@/src/server/types/csv";

type OptionKey = "smapic" | "misepic" | "panorama" | "area" | "movie";
type NonSmapicOptionKey = Exclude<OptionKey, "smapic">;
type OptimizationAction = "remove" | "add";
type OptionDecisionRows = {
  removeAllRows: CsvRow[];
  lowerToSecondRows: CsvRow[];
  raiseToSecondRows: CsvRow[];
  raiseToThirdRows: CsvRow[];
  smapicAdd: Array<{ id: string; currentSmapic: boolean }>;
  smapicRemove: Array<{ id: string; currentSmapic: boolean }>;
};

type OptionBalanceSettings = {
  slots: number;
  prices: Record<OptionKey, number>;
};

const nonSmapicPriority: NonSmapicOptionKey[] = ["misepic", "panorama", "movie", "area"];
const optionNames = {
  smapic: "スマピク",
  misepic: "店ピク",
  panorama: "パノラマ",
  area: "得意なエリア",
  movie: "動画",
} satisfies Record<OptionKey, string>;
const optionIcons = {
  smapic: "ti-star",
  misepic: "ti-building-store",
  panorama: "ti-360",
  area: "ti-map-pin",
  movie: "ti-video",
} satisfies Record<OptionKey, string>;
const optionScores = {
  misepic: 4,
  panorama: 4,
  area: 2,
  movie: 5,
} satisfies Record<NonSmapicOptionKey, number>;
const additionOptionPriority = {
  misepic: 0,
  panorama: 1,
  movie: 2,
  area: 3,
} satisfies Record<NonSmapicOptionKey, number>;
const removalSameScoreTiePriority = {
  panorama: 0,
  misepic: 1,
  movie: 2,
  area: 3,
} satisfies Record<NonSmapicOptionKey, number>;

function buildBaseRecommendedCount(listingCapacity: number) {
  if (!Number.isFinite(listingCapacity) || listingCapacity <= 0) return 0;

  return Math.ceil((listingCapacity * 0.35) / 50) * 50;
}

function getRowKey(row: CsvRow) {
  return buildPropertyNameRoomKey(C.name(row), C.room(row));
}

function isOptionEnabled(row: CsvRow, optionKey: OptionKey) {
  if (optionKey === "smapic") return C.smapic(row);
  if (optionKey === "misepic") return C.misepic(row);
  if (optionKey === "panorama") return C.panorama(row);
  if (optionKey === "area") return C.area(row);
  return C.movie(row);
}

function buildLedgerKey(rowKey: string, optionKey: OptionKey) {
  return `${rowKey}:${optionKey}`;
}

function buildLedgerItem(rowKey: string, optionKey: OptionKey, action: OptimizationAction, prices: Record<OptionKey, number>) {
  return {
    key: buildLedgerKey(rowKey, optionKey),
    rowKey,
    optionKey,
    action,
    amount: prices[optionKey],
  };
}

function rankRemovalCandidate(
  optionA: NonSmapicOptionKey,
  optionB: NonSmapicOptionKey,
  prices: Record<OptionKey, number>,
) {
  const scoreDiff = optionScores[optionB] - optionScores[optionA];
  if (scoreDiff !== 0) return scoreDiff;

  const priceDiff = prices[optionB] - prices[optionA];
  if (priceDiff !== 0) return priceDiff;

  return removalSameScoreTiePriority[optionA] - removalSameScoreTiePriority[optionB];
}

function getRequiredAdditionalScore(row: CsvRow, targetBelongingScore: 2 | 3) {
  return Math.max(targetBelongingScore - C.belong(row), 1);
}

function selectLowerToSecondRemovalOption(row: CsvRow, prices: Record<OptionKey, number>) {
  return nonSmapicPriority
    .filter((optionKey) => isOptionEnabled(row, optionKey))
    .sort((optionA, optionB) => rankRemovalCandidate(optionA, optionB, prices))[0] ?? null;
}

function buildOptionCombinations(options: NonSmapicOptionKey[]) {
  const combinations: NonSmapicOptionKey[][] = [];
  const total = 2 ** options.length;

  for (let mask = 1; mask < total; mask += 1) {
    combinations.push(options.filter((_, index) => Boolean(mask & (1 << index))));
  }

  return combinations;
}

function compareOptionPriority(optionA: NonSmapicOptionKey, optionB: NonSmapicOptionKey) {
  return additionOptionPriority[optionA] - additionOptionPriority[optionB];
}

function buildCombinationSignature(options: NonSmapicOptionKey[]) {
  return options.map((optionKey) => additionOptionPriority[optionKey]).join("-");
}

function compareCombinationSignature(optionsA: NonSmapicOptionKey[], optionsB: NonSmapicOptionKey[]) {
  const maxLength = Math.max(optionsA.length, optionsB.length);

  for (let index = 0; index < maxLength; index += 1) {
    const priorityA = optionsA[index] === undefined ? Number.POSITIVE_INFINITY : additionOptionPriority[optionsA[index]];
    const priorityB = optionsB[index] === undefined ? Number.POSITIVE_INFINITY : additionOptionPriority[optionsB[index]];
    if (priorityA !== priorityB) return priorityA - priorityB;
  }

  return 0;
}

function selectAdditionOptions(
  row: CsvRow,
  targetBelongingScore: 2 | 3,
  prices: Record<OptionKey, number>,
) {
  const requiredScore = getRequiredAdditionalScore(row, targetBelongingScore);
  const candidates = buildOptionCombinations(
    nonSmapicPriority
      .filter((optionKey) => !isOptionEnabled(row, optionKey))
      .sort(compareOptionPriority),
  )
    .map((options) => {
      const sortedOptions = [...options].sort(compareOptionPriority);
      const score = sortedOptions.reduce((sum, optionKey) => sum + optionScores[optionKey], 0);
      const amount = sortedOptions.reduce((sum, optionKey) => sum + prices[optionKey], 0);

      return {
        options: sortedOptions,
        score,
        excessScore: score - requiredScore,
        amount,
        signature: buildCombinationSignature(sortedOptions),
      };
    })
    .filter((candidate) => candidate.score >= requiredScore)
    .sort((candidateA, candidateB) => {
      const excessDiff = candidateA.excessScore - candidateB.excessScore;
      if (excessDiff !== 0) return excessDiff;

      const amountDiff = candidateA.amount - candidateB.amount;
      if (amountDiff !== 0) return amountDiff;

      const priorityDiff = compareCombinationSignature(candidateA.options, candidateB.options);
      if (priorityDiff !== 0) return priorityDiff;

      const countDiff = candidateA.options.length - candidateB.options.length;
      if (countDiff !== 0) return countDiff;

      return candidateA.signature.localeCompare(candidateB.signature);
    });

  return candidates[0]?.options ?? [];
}

function addOptimizationItem(
  ledger: Map<string, ReturnType<typeof buildLedgerItem>>,
  rowKey: string,
  optionKey: OptionKey,
  action: OptimizationAction,
  prices: Record<OptionKey, number>,
) {
  ledger.set(buildLedgerKey(rowKey, optionKey), buildLedgerItem(rowKey, optionKey, action, prices));
}

function buildReplacementOptimization(
  rows: CsvRow[],
  settings: OptionBalanceSettings,
  decisions: OptionDecisionRows,
) {
  const rowByKey = new Map(rows.map((row) => [getRowKey(row), row]));
  const removals = new Map<string, ReturnType<typeof buildLedgerItem>>();
  const additions = new Map<string, ReturnType<typeof buildLedgerItem>>();
  const conflictsByOption: Record<OptionKey, number> = {
    smapic: 0,
    misepic: 0,
    panorama: 0,
    area: 0,
    movie: 0,
  };
  let conflictCount = 0;

  decisions.removeAllRows.forEach((row) => {
    const rowKey = getRowKey(row);
    nonSmapicPriority.forEach((optionKey) => {
      if (isOptionEnabled(row, optionKey)) {
        addOptimizationItem(removals, rowKey, optionKey, "remove", settings.prices);
      }
    });
  });

  decisions.lowerToSecondRows.forEach((row) => {
    const optionKey = selectLowerToSecondRemovalOption(row, settings.prices);
    if (!optionKey) return;

    addOptimizationItem(removals, getRowKey(row), optionKey, "remove", settings.prices);
  });

  decisions.smapicRemove.forEach((item) => {
    if (!item.currentSmapic) return;

    addOptimizationItem(removals, item.id, "smapic", "remove", settings.prices);
  });

  const addOptionForRow = (row: CsvRow, targetBelongingScore: 2 | 3) => {
    const rowKey = getRowKey(row);
    const optionKeys = selectAdditionOptions(row, targetBelongingScore, settings.prices);

    optionKeys.forEach((optionKey) => {
      if (removals.has(buildLedgerKey(rowKey, optionKey))) {
        conflictCount += 1;
        conflictsByOption[optionKey] += 1;
        return;
      }

      addOptimizationItem(additions, rowKey, optionKey, "add", settings.prices);
    });
  };

  decisions.raiseToSecondRows.forEach((row) => addOptionForRow(row, 2));
  decisions.raiseToThirdRows.forEach((row) => addOptionForRow(row, 3));

  decisions.smapicAdd.forEach((item) => {
    if (item.currentSmapic) return;
    if (removals.has(buildLedgerKey(item.id, "smapic"))) {
      conflictCount += 1;
      conflictsByOption.smapic += 1;
      return;
    }

    const row = rowByKey.get(item.id);
    if (row && isOptionEnabled(row, "smapic")) return;

    addOptimizationItem(additions, item.id, "smapic", "add", settings.prices);
  });

  const removalItems = Array.from(removals.values());
  const additionItems = Array.from(additions.values());
  const removalOptimizationAmount = removalItems.reduce((sum, item) => sum + item.amount, 0);
  const additionOptimizationAmount = additionItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    removalOptimizationAmount,
    removalOptimizationCount: removalItems.length,
    additionOptimizationAmount,
    additionOptimizationCount: additionItems.length,
    replacementOptimizationAmount: removalOptimizationAmount + additionOptimizationAmount,
    replacementOptimizationCount: removalItems.length + additionItems.length,
    conflictCount,
    conflictsByOption,
  };
}

export function buildOptionBalance(
  rows: CsvRow[],
  settings: OptionBalanceSettings,
  decisions: OptionDecisionRows,
): OptionBalance {
  const baseRecommendedCount = buildBaseRecommendedCount(settings.slots);
  const current: Record<OptionKey, number> = {
    smapic: rows.filter(C.smapic).length,
    misepic: rows.filter(C.misepic).length,
    panorama: rows.filter(C.panorama).length,
    area: rows.filter(C.area).length,
    movie: rows.filter(C.movie).length,
  };
  const maintainedNonSmapicOptions = new Set(
    nonSmapicPriority.filter((optionKey) => current[optionKey] > 0).slice(0, 2),
  );

  const waste: Record<OptionKey, number> = {
    smapic: Math.max(current.smapic - baseRecommendedCount, 0),
    misepic: Math.max(current.misepic - (maintainedNonSmapicOptions.has("misepic") ? baseRecommendedCount : 0), 0),
    panorama: Math.max(current.panorama - (maintainedNonSmapicOptions.has("panorama") ? baseRecommendedCount : 0), 0),
    area: Math.max(current.area - (maintainedNonSmapicOptions.has("area") ? baseRecommendedCount : 0), 0),
    movie: Math.max(current.movie - (maintainedNonSmapicOptions.has("movie") ? baseRecommendedCount : 0), 0),
  };

  const cards = (["smapic", "misepic", "panorama", "movie", "area"] as OptionKey[]).map((optionKey) => ({
    key: optionKey,
    name: optionNames[optionKey],
    icon: optionIcons[optionKey],
    price: settings.prices[optionKey],
    current: current[optionKey],
    recommended: current[optionKey] - waste[optionKey],
    waste: waste[optionKey],
    saving: waste[optionKey] * settings.prices[optionKey],
  }));
  const capacitySavingsAmount = cards.reduce((sum, card) => sum + card.saving, 0);
  const capacityReductionCount = cards.reduce((sum, card) => sum + card.waste, 0);
  const replacementOptimization = buildReplacementOptimization(rows, settings, decisions);

  return {
    totalSaving: capacitySavingsAmount,
    totalWaste: capacityReductionCount,
    baseRecommendedCount,
    waste,
    current,
    cards,
    optimization: {
      capacitySavingsAmount,
      capacityReductionCount,
      ...replacementOptimization,
      totalImprovementAmount: capacitySavingsAmount + replacementOptimization.replacementOptimizationAmount,
    },
  };
}
