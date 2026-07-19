"use client";

import { useEffect, useMemo, useState } from "react";
import { HELP_CATEGORIES, HELP_FAQS, HELP_SECTIONS, helpSearchText, type HelpSection } from "@/src/content/help/help-content";
import styles from "./help.module.css";

function SectionContent({ section }: { section: HelpSection }) {
  return (
    <>
      {section.important ? <div className={styles.important}><i className="ti ti-alert-circle" aria-hidden="true" /><strong>{section.important}</strong></div> : null}
      {section.paragraphs?.map((text) => <p key={text}>{text}</p>)}
      {section.steps ? <ol className={styles.steps}>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
      {section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
      {section.table ? <div className={styles.tableWrap}><table><thead><tr>{section.table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{section.table.rows.map((row) => <tr key={row.join("-")}>{row.map((cell, index) => <td key={`${cell}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></div> : null}
      {section.examples ? <div className={styles.examples}>{section.examples.map((example) => <div key={example.label} className={`${styles.example} ${styles[example.tone]}`}><strong>{example.label}</strong><span>{example.text}</span></div>)}</div> : null}
      {section.note ? <div className={styles.note}><strong>補足</strong><span>{section.note}</span></div> : null}
    </>
  );
}

export default function HelpCenter({ initialSection }: { initialSection?: string }) {
  const initialTarget = HELP_SECTIONS.find((section) => section.id === initialSection);
  const initialCategory = initialSection === "faq" ? "FAQ" : initialSection === "contact" ? "問い合わせ" : initialTarget?.category ?? "はじめに";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(initialCategory);

  useEffect(() => {
    if (!initialSection) return;
    requestAnimationFrame(() => document.getElementById(initialSection)?.scrollIntoView({ block: "start" }));
  }, [initialSection]);

  const normalized = query.trim().toLocaleLowerCase("ja-JP");
  const sections = useMemo(() => {
    if (!normalized) return HELP_SECTIONS.filter((section) => section.category === category);
    return HELP_SECTIONS
      .filter((section) => helpSearchText(section).includes(normalized))
      .sort((a, b) => Number(b.title.toLocaleLowerCase("ja-JP").includes(normalized)) - Number(a.title.toLocaleLowerCase("ja-JP").includes(normalized)));
  }, [category, normalized]);
  const faqs = useMemo(() => HELP_FAQS.filter((faq) => !normalized || JSON.stringify(faq).toLocaleLowerCase("ja-JP").includes(normalized)), [normalized]);
  const showFaq = category === "FAQ" || Boolean(normalized);

  return (
    <div className={styles.layout}>
      <aside className={styles.categoryNav} aria-label="ヘルプカテゴリ">
        {HELP_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item && !normalized}
            className={category === item && !normalized ? styles.active : ""}
            onClick={() => {
              setQuery("");
              setCategory(item);
            }}
          >
            {item}
          </button>
        ))}
      </aside>
      <div className={styles.main}>
        <label className={styles.search}>
          <i className="ti ti-search" aria-hidden="true" />
          <span className="sr-only">ヘルプを検索</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="キーワードで検索（例：37点、CSV、22㎡）" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="検索をクリア"><i className="ti ti-x" aria-hidden="true" /></button> : null}
        </label>
        {!sections.length && (!showFaq || !faqs.length) && category !== "問い合わせ" ? <div className={styles.empty}>該当するガイドが見つかりません</div> : null}
        <div className={styles.sections}>
          {sections.map((section) => <article id={section.id} key={section.id} className={styles.card}><span className={styles.eyebrow}>{section.category}</span><h2>{section.title}</h2><p className={styles.summary}>{section.summary}</p><SectionContent section={section} /></article>)}
          {showFaq && faqs.length ? <section id="faq" className={styles.card}><span className={styles.eyebrow}>FAQ</span><h2>よくある質問</h2><div className={styles.faqs}>{faqs.map((faq) => <details key={faq.id} open={Boolean(normalized)}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section> : null}
          {!normalized && category === "問い合わせ" ? <section id="contact" className={styles.card}><span className={styles.eyebrow}>問い合わせ</span><h2>解決しない場合</h2><p>操作方法や分析結果について確認が必要な場合は、状況と表示されたメッセージを添えてお問い合わせください。</p><a className={styles.contactButton} href="mailto:support@gugumo.jp?subject=GUGUMO利用方法について"><i className="ti ti-mail" aria-hidden="true" />メールで問い合わせる</a><p className={styles.address}>support@gugumo.jp</p></section> : null}
        </div>
      </div>
    </div>
  );
}
