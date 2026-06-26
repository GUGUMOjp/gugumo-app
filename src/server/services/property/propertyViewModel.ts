import type { PropertyHistory } from "@/src/server/services/analysis/summary";

export type PropertyViewModel = PropertyHistory & {
  totalList: number;
  totalInquiry: number;
  changes: number;
};

export function buildPropertyViewModels(propertyHistories: PropertyHistory[], propertySearch: string): PropertyViewModel[] {
  return propertyHistories
    .filter((property) => {
      const q = propertySearch.trim().toLowerCase();
      if (!q) return true;
      return [property.name, property.room, property.station, property.madori].some((value) => value.toLowerCase().includes(q));
    })
    .slice(0, 80)
    .map((property) => ({
      ...property,
      totalList: property.entries.reduce((sum, entry) => sum + entry.dListPV, 0),
      totalInquiry: property.entries.reduce((sum, entry) => sum + entry.dInquiry, 0),
      changes: property.entries.filter((entry) => entry.smapicChanged || Math.abs(entry.competitionDelta) >= 3).length,
    }));
}
