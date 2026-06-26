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
    waste: {
      smapic: number;
      panorama: number;
      misepic: number;
    };
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
      wasteSmapic: analysis.optionBalance.waste.smapic,
      wastePanorama: analysis.optionBalance.waste.panorama,
      wasteMisepic: analysis.optionBalance.waste.misepic,
    },
    alerts: {
      lowPvRows: analysis.lowPvRows.length,
      optionReviewCount,
      smapicAdd: analysis.smapicAdd.length,
      smapicRemove: analysis.smapicRemove.length,
    },
  };
}
