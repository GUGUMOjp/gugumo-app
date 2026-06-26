import type { CsvRow } from "@/src/server/types/csv";

type OptionKey = "smapic" | "misepic" | "panorama" | "area" | "movie";

export type SmartItem = {
  id: string;
  name: string;
  room: string;
  score: number;
  priorityScore: number;
  currentSmapic: boolean;
  lowPerformance: boolean;
};

export type OptionBalance = {
  totalSaving: number;
  totalWaste: number;
  waste: Record<OptionKey, number>;
  current: Record<OptionKey, number>;
  cards: Array<{
    key: OptionKey;
    name: string;
    icon: string;
    price: number;
    current: number;
    waste: number;
    saving: number;
  }>;
};

export type AnalysisResult = {
  listedRows: CsvRow[];
  lowPvRows: CsvRow[];
  removeAllRows: CsvRow[];
  lowerToSecondRows: CsvRow[];
  raiseToSecondRows: CsvRow[];
  raiseToThirdRows: CsvRow[];
  smapicAdd: SmartItem[];
  smapicRemove: SmartItem[];
  optionBalance: OptionBalance;
  totalInquiry: number;
  smapicRows: number;
};
