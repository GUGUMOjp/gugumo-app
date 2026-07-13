type DashboardSummary = {
  listedRows: number;
  totalInquiry: number;
  smapicRows: number;
};

type DashboardAnalysis = {
  lowPvRows: unknown[];
  removeAllRows: unknown[];
  lowerToSecondRows: unknown[];
  raiseToSecondRows: unknown[];
  raiseToThirdRows: unknown[];
  smapicAdd: unknown[];
  smapicRemove: unknown[];
  optionBalance: {
    totalSaving: number;
    totalWaste: number;
    optimization: {
      capacitySavingsAmount: number;
      replacementOptimizationAmount: number;
      totalImprovementAmount: number;
      removalOptimizationAmount: number;
      removalOptimizationCount: number;
      additionOptimizationAmount: number;
      additionOptimizationCount: number;
    };
    cards: Array<{
      key: string;
      name: string;
      waste: number;
    }>;
  };
};

type DashboardBadge = "weeklyCount" | "optionReviewCount" | "lowPvCount";

export function buildDashboardViewModel(
  latestSummary: DashboardSummary | undefined,
  analysis: DashboardAnalysis,
  weekly: unknown[],
) {
  const optionReviewCount = analysis.removeAllRows.length
    + analysis.lowerToSecondRows.length
    + analysis.raiseToSecondRows.length
    + analysis.raiseToThirdRows.length;

  const navBadges: Record<DashboardBadge, string | number> = {
    weeklyCount: weekly.length ? `${weekly.length}週` : "—",
    optionReviewCount: optionReviewCount || "—",
    lowPvCount: analysis.lowPvRows.length || "—",
  };

  return {
    navBadges,
    metrics: {
      listedRows: latestSummary?.listedRows,
      totalInquiry: latestSummary?.totalInquiry,
      smapicRows: latestSummary?.smapicRows,
      lowPvRows: analysis.lowPvRows.length || "—",
    },
    savings: {
      totalSaving: analysis.optionBalance.totalSaving,
      totalWaste: analysis.optionBalance.totalWaste,
      annualSaving: analysis.optionBalance.totalSaving * 12,
      optimization: analysis.optionBalance.optimization,
      cards: analysis.optionBalance.cards.map((card) => ({
        key: card.key,
        name: card.name,
        waste: card.waste,
      })),
    },
    alerts: {
      lowPvRows: analysis.lowPvRows.length,
      optionReviewCount,
      smapicAdd: analysis.smapicAdd.length,
      smapicRemove: analysis.smapicRemove.length,
    },
  };
}
