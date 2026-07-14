import type { Metadata } from "next";
import {
  LegalPage,
  legalPages,
} from "../legal-content";

export const metadata: Metadata = {
  title: "GUGUMO プライバシーポリシー",
  description: "GUGUMOにおける個人情報・法人情報の取扱い方針をご案内します。",
};

export default function PrivacyPage() {
  return <LegalPage content={legalPages.privacy} currentPage="privacy" />;
}
