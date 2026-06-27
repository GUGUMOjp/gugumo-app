type AdviceSeverity = "info" | "warning" | "critical";

type AdviceCategory =
  | "option"
  | "area"
  | "property"
  | "upload"
  | "recommendation";

export type Advice = {
  id: string;
  severity: AdviceSeverity;
  category: AdviceCategory;
  target: string;
  count?: number;
};

type AdviceAnalysis = {
  lowPvRows: unknown[];
  removeAllRows: unknown[];
  lowerToSecondRows: unknown[];
  raiseToSecondRows: unknown[];
  raiseToThirdRows: unknown[];
  smapicAdd: unknown[];
  smapicRemove: unknown[];
  optionBalance: {
    totalWaste: number;
    totalSaving: number;
  };
};

function addCountAdvice(
  advices: Advice[],
  id: string,
  severity: AdviceSeverity,
  category: AdviceCategory,
  target: string,
  count: number,
) {
  if (!count) return;

  advices.push({
    id,
    severity,
    category,
    target,
    count,
  });
}

export function buildAdvices(analysis: AdviceAnalysis): Advice[] {
  const advices: Advice[] = [];

  addCountAdvice(advices, "property-low-pv", "critical", "property", "lowPvRows", analysis.lowPvRows.length);
  addCountAdvice(advices, "option-remove-all", "warning", "option", "removeAllRows", analysis.removeAllRows.length);
  addCountAdvice(advices, "option-lower-to-second", "warning", "option", "lowerToSecondRows", analysis.lowerToSecondRows.length);
  addCountAdvice(advices, "option-raise-to-second", "info", "option", "raiseToSecondRows", analysis.raiseToSecondRows.length);
  addCountAdvice(advices, "option-raise-to-third", "info", "option", "raiseToThirdRows", analysis.raiseToThirdRows.length);
  addCountAdvice(advices, "recommendation-smapic-add", "info", "recommendation", "smapicAdd", analysis.smapicAdd.length);
  addCountAdvice(advices, "recommendation-smapic-remove", "warning", "recommendation", "smapicRemove", analysis.smapicRemove.length);
  addCountAdvice(advices, "option-total-waste", "warning", "option", "optionBalance.totalWaste", analysis.optionBalance.totalWaste);
  addCountAdvice(advices, "option-total-saving", "info", "option", "optionBalance.totalSaving", analysis.optionBalance.totalSaving);

  return advices;
}
