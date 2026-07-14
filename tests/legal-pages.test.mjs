import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const legalContent = await readFile(new URL("app/legal-content.tsx", root), "utf8");

const pages = [
  { path: "terms", key: "terms", title: "GUGUMO 利用規約", h1: "利用規約" },
  { path: "privacy", key: "privacy", title: "GUGUMO プライバシーポリシー", h1: "プライバシーポリシー" },
  { path: "data-policy", key: "dataPolicy", title: "GUGUMO データ取扱方針", h1: "データ取扱方針" },
  { path: "support", key: "support", title: "GUGUMO サポート・お問い合わせ", h1: "サポート・お問い合わせ" },
  { path: "legal", key: "legal", title: "GUGUMO 特定商取引法に基づく表記", h1: "特定商取引法に基づく表記" },
  { path: "security", key: "security", title: "GUGUMO セキュリティ・禁止事項", h1: "セキュリティ・禁止事項" },
];

test("six legal and support pages define route-specific metadata and current navigation", async () => {
  for (const page of pages) {
    const source = await readFile(new URL(`app/${page.path}/page.tsx`, root), "utf8");

    assert.match(source, /export const metadata: Metadata/);
    assert.ok(source.includes(`title: "${page.title}"`));
    assert.ok(source.includes(`currentPage="${page.key}"`));
    assert.ok(legalContent.includes(`title: "${page.h1}"`));
  }
});

test("common legal page exposes one h1, update date, navigation, and official destinations", () => {
  assert.equal((legalContent.match(/<h1\b/g) ?? []).length, 1);
  assert.ok(legalContent.includes("最終更新日：{lastUpdated}"));
  assert.ok(legalContent.includes('const lastUpdated = "2026年7月14日"'));
  assert.ok(legalContent.includes('aria-label="法務・サポートページ"'));
  assert.ok(legalContent.includes('aria-current={currentPage === item.key ? "page" : undefined}'));
  assert.ok(legalContent.includes('href="https://gugumo.jp"'));
  assert.ok(legalContent.includes('href="https://app.gugumo.jp"'));
  for (const path of ["/terms", "/privacy", "/data-policy", "/support", "/legal", "/security"]) {
    assert.ok(legalContent.includes(`href: "${path}"`));
  }
});

test("official contact addresses are linked and support audiences are separated", () => {
  assert.ok(legalContent.includes('href="mailto:info@gugumo.jp"'));
  assert.ok(legalContent.includes('href="mailto:support@gugumo.jp"'));
  assert.ok(legalContent.includes('title: "導入相談・一般お問い合わせ"'));
  assert.ok(legalContent.includes('title: "ご利用中のお客様"'));

  const publicEmails = [...legalContent.matchAll(/[A-Z0-9._%+-]+@gugumo\.jp/gi)].map((match) => match[0]);
  assert.deepEqual([...new Set(publicEmails)].sort(), ["info@gugumo.jp", "support@gugumo.jp"]);
});

test("terms state service scope, non-affiliation, no automatic changes, and effect disclaimer", () => {
  const required = [
    "SUUMOの公式サービスまたは提携サービスではありません",
    "GUGUMOがSUUMOの掲載内容またはオプションを自動的に変更することはありません",
    "費用対効果額は、掲載運用上の判断材料です",
    "反響、成約、売上、利益または費用削減を保証しません",
    "CSVの正確性、完全性および最新性",
  ];

  for (const text of required) assert.ok(legalContent.includes(text));
});

test("security reflects current authorization facts without the former staged wording", () => {
  for (const text of [
    "アカウント認証",
    "会社・ワークスペース単位",
    "owner、admin、member、viewer",
    "viewerのCSV書き込みを制限",
    "Service Roleを使用しない設計",
  ]) {
    assert.ok(legalContent.includes(text));
  }

  assert.ok(!legalContent.includes("段階的に整備"));
});

test("public legal copy does not finalize deferred conditions or expose internal notes", () => {
  const prohibited = [
    "最低利用期間6か月",
    "最低6か月",
    "自動更新します",
    "返金しません",
    "【事業判断が必要】",
    "【契約条件の確定が必要】",
    "【法的確認が必要】",
    "TBD",
    "TODO",
    "準備中",
    "本Sprint",
  ];

  for (const text of prohibited) assert.ok(!legalContent.includes(text), `${text} must not be public copy`);
  assert.doesNotMatch(legalContent, /(?:所在地|電話番号)[^"\n]*\d{2,}/);
});
