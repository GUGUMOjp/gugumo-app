export type CsvRow = Record<string, string>;

export type CsvSnapshot = {
  fileName: string;
  date: Date;
  dateKey: string;
  dateLabel: string;
  rows: CsvRow[];
  summary: CsvSummary;
};

export type CsvSummary = {
  totalRows: number;
  listedRows: number;
  vacantRows: number;
  totalInquiry: number;
  totalListPv: number;
  totalDetailPv: number;
  smapicRows: number;
  lowPvRows: number;
  averageCompetition: number;
};
