import { C } from "@/src/server/services/csv";
import type { CsvRow } from "@/src/server/types/csv";

type AreaAllocationItem = {
  ward: string;
};

export function buildCurrentWardCounts(rows: CsvRow[], areaAllocation: AreaAllocationItem[]) {
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    const address = C.address(row);
    const ward = areaAllocation.find((item) => address.includes(item.ward));
    if (ward) counts[ward.ward] = (counts[ward.ward] ?? 0) + 1;
  });
  return counts;
}
