import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentWorkspaceContext } from "@/src/server/core";
import HelpCenter from "./help-center";
import styles from "./help.module.css";

export const metadata: Metadata = {
  title: "GUGUMO ご利用ガイド",
};

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const contextResult = await getCurrentWorkspaceContext();
  if (!contextResult.ok || !contextResult.data) redirect("/");
  const { section } = await searchParams;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="GUGUMO ホームへ戻る"><Image src="/gugumo-sidebar-logo.png" alt="GUGUMO" width={815} height={234} priority /></Link>
          <Link href="/" className={styles.back}><i className="ti ti-arrow-left" aria-hidden="true" />アプリへ戻る</Link>
        </div>
      </header>
      <div className={styles.hero}><span className={styles.kicker}>HELP CENTER</span><h1>ご利用ガイド</h1><p>GUGUMOの基本操作と運用ルールを確認できます</p></div>
      <HelpCenter initialSection={section} />
    </main>
  );
}
