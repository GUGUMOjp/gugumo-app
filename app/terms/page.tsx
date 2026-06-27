import {
  LegalPage,
  legalPages,
} from "../legal-content";

export default function TermsPage() {
  return <LegalPage content={legalPages.terms} />;
}
