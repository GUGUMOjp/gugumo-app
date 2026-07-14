import type { Metadata } from "next";
import {
  LegalPage,
  legalPages,
} from "../legal-content";

export const metadata: Metadata = {
  title: "GUGUMO 利用規約",
  description: "GUGUMOのサービス利用条件、免責事項、個別契約条件に関するご案内です。",
};

export default function TermsPage() {
  return <LegalPage content={legalPages.terms} currentPage="terms" />;
}
