import type { Metadata } from "next";
import {
  LegalPage,
  legalPages,
} from "../legal-content";

export const metadata: Metadata = {
  title: "GUGUMO サポート・お問い合わせ",
  description: "GUGUMOの導入相談と、ご利用中のお客様向けサポート窓口をご案内します。",
};

export default function SupportPage() {
  return <LegalPage content={legalPages.support} currentPage="support" />;
}
