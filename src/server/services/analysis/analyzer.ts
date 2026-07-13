import { buildOptionBalance } from "@/src/server/engines/health";
import { buildRecommendations } from "@/src/server/engines/recommendation";
import {
  isLowPvCandidate,
  isLowerToSecondOptionCandidate,
  isRaiseToSecondOptionCandidate,
  isRaiseToThirdOptionCandidate,
  isRemoveAllOptionCandidate,
} from "@/src/server/rules";
import { C } from "@/src/server/services/csv";
import type { AnalysisResult } from "@/src/server/types";
import type { CsvRow } from "@/src/server/types/csv";

type OptionKey = "smapic" | "misepic" | "panorama" | "area" | "movie";

type AnalysisSettings = {
  slots: number;
  smapicLimit: number;
  prices: Record<OptionKey, number>;
};

export function analyzeRows(rows: CsvRow[], settings: AnalysisSettings): AnalysisResult {
  const listedRows = rows.filter(C.listed);
  const totalInquiry = rows.reduce((sum, row) => sum + C.inquiry(row), 0);
  const smapicRows = rows.filter(C.smapic).length;
  const lowPvRows = listedRows
    .filter(isLowPvCandidate)
    .sort((a, b) => C.detailPvPerDay(a) - C.detailPvPerDay(b));

  const removeAllRows = rows
    .filter(isRemoveAllOptionCandidate)
    .sort((a, b) => C.score(a) - C.score(b));

  const lowerToSecondRows = rows
    .filter(isLowerToSecondOptionCandidate)
    .sort((a, b) => C.total(b) - C.total(a));

  const raiseToSecondRows = rows
    .filter(isRaiseToSecondOptionCandidate)
    .sort((a, b) => C.total(b) - C.total(a));

  const raiseToThirdRows = rows
    .filter(isRaiseToThirdOptionCandidate)
    .sort((a, b) => C.inquiry(b) - C.inquiry(a));

  const { smapicAdd, smapicRemove } = buildRecommendations(rows, settings.smapicLimit);

  const optionBalance = buildOptionBalance(rows, settings, {
    removeAllRows,
    lowerToSecondRows,
    raiseToSecondRows,
    raiseToThirdRows,
    smapicAdd,
    smapicRemove,
  });

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
