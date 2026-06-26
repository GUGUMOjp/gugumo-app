type AreaAllocationItem = {
  ward: string;
  pct: number;
  info: string;
};

type AreaBalanceStatusType = "shortage" | "excess" | "ok";

export type AreaBalanceItem = AreaAllocationItem & {
  recommended: number;
  actual: number;
  diff: number;
  max: number;
  statusType: AreaBalanceStatusType;
};

export function buildAreaBalanceViewModel(
  areaAllocation: AreaAllocationItem[],
  currentWardCounts: Record<string, number>,
  listedRowsCount: number,
): AreaBalanceItem[] {
  return areaAllocation.map((item) => {
    const recommended = Math.round(listedRowsCount * item.pct / 100);
    const actual = currentWardCounts[item.ward] ?? 0;
    const diff = actual - recommended;
    const max = Math.max(recommended, actual, 1);
    const statusType = diff < -2 ? "shortage" : diff > 2 ? "excess" : "ok";

    return {
      ...item,
      recommended,
      actual,
      diff,
      max,
      statusType,
    };
  });
}
