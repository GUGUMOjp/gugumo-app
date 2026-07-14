import type { Metadata } from "next";
import {
  LegalPage,
  legalPages,
} from "../legal-content";

export const metadata: Metadata = {
  title: "GUGUMO 特定商取引法に基づく表記",
  description: "GUGUMOの運営者情報、販売条件、提供時期、契約条件に関するご案内です。",
};

export default function LegalNotationPage() {
  return <LegalPage content={legalPages.legal} currentPage="legal" />;
}
