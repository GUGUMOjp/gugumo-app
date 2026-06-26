import { C } from "@/src/server/services/csv";
import type { CsvRow } from "@/src/server/types/csv";

export function isLowPvCandidate(row: CsvRow) {
  return C.days(row) >= 3 && C.detailPvPerDay(row) > 0 && C.detailPvPerDay(row) < 0.3;
}

export function isRemoveAllOptionCandidate(row: CsvRow) {
  return C.listed(row) && C.belong(row) >= 2 && C.total(row) <= 3;
}

export function isLowerToSecondOptionCandidate(row: CsvRow) {
  if (!C.listed(row)) return false;
  const totalByBasis = C.c3(row) + C.c2(row) + C.c1(row);
  if (totalByBasis < 4 || C.c2(row) > 2) return false;
  return C.c3(row) <= 2 && C.belong(row) === 3;
}

export function isRaiseToSecondOptionCandidate(row: CsvRow) {
  return C.listed(row) && C.belong(row) <= 1 && C.total(row) >= 4 && C.c3(row) <= 2 && C.c2(row) <= 2;
}

export function isRaiseToThirdOptionCandidate(row: CsvRow) {
  return C.listed(row) && C.belong(row) <= 2 && C.total(row) >= 4 && C.c2(row) >= 2 && C.c1(row) >= 3;
}

export function isSmapicLowPerformance(row: CsvRow) {
  const inquiry = C.inquiry(row);
  const days = C.days(row);
  const competition = C.total(row);

  return days >= 15 && inquiry <= 0 && competition <= 5;
}
