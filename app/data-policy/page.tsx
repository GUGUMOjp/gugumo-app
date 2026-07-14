import type { Metadata } from "next";
import {
  LegalPage,
  legalPages,
} from "../legal-content";

export const metadata: Metadata = {
  title: "GUGUMO データ取扱方針",
  description: "GUGUMOへアップロードするSUUMO由来CSVと分析結果の取扱い方針をご案内します。",
};

export default function DataPolicyPage() {
  return <LegalPage content={legalPages.dataPolicy} currentPage="dataPolicy" />;
}
