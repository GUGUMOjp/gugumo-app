import type { Metadata } from "next";
import {
  LegalPage,
  legalPages,
} from "../legal-content";

export const metadata: Metadata = {
  title: "GUGUMO セキュリティ・禁止事項",
  description: "GUGUMOの認証、データ管理、ロール別権限、禁止事項に関するご案内です。",
};

export default function SecurityPage() {
  return <LegalPage content={legalPages.security} currentPage="security" />;
}
