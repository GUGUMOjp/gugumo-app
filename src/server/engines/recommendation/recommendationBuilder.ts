import { isSmapicLowPerformance } from "@/src/server/rules";
import { C, normalizeId } from "@/src/server/services/csv";
import type { SmartItem } from "@/src/server/types";
import type { CsvRow } from "@/src/server/types/csv";

type RecommendationResult = {
  smapicAdd: SmartItem[];
  smapicRemove: SmartItem[];
};

export function buildRecommendations(rows: CsvRow[], smapicLimit: number): RecommendationResult {
  const smartScores: SmartItem[] = rows.map((row) => {
    const listPV = C.listPV(row);
    const detailPV = C.detailPV(row);
    const inquiry = C.inquiry(row);
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
      lowPerformance: isSmapicLowPerformance(row),
    };
  });

  const available = smartScores.filter((item) => rows.find((row) => `${normalizeId(C.name(row))}-${normalizeId(C.room(row))}` === item.id && C.listed(row)) && !item.lowPerformance);
  const topBySmartScore = available.filter((item) => !item.currentSmapic).sort((a, b) => b.score - a.score).slice(0, 200);
  const topByPriority = [...available].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 100);
  const finalMap = new Map<string, SmartItem>();
  topBySmartScore.forEach((item) => finalMap.set(item.id, item));
  topByPriority.forEach((item) => finalMap.set(item.id, item));
  const finalRecommended = Array.from(finalMap.values()).sort((a, b) => b.score - a.score).slice(0, smapicLimit);

  if (finalRecommended.length < smapicLimit) {
    const extras = smartScores.filter((item) => !finalMap.has(item.id) && !item.lowPerformance).sort((a, b) => b.score - a.score);
    for (const item of extras) {
      if (finalRecommended.length >= smapicLimit) break;
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

  return {
    smapicAdd,
    smapicRemove,
  };
}
