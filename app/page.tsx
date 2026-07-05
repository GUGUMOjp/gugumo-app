"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { PAGE_TITLES } from "@/data/constants/pageTitles";
import { NAVIGATION_GROUPS, SETTINGS_NAV_ITEM } from "@/data/navigation/navigation";
import {
  LEGAL_LINKS,
  PRODUCT_META,
} from "@/data/product/productMeta";
import {
  getCurrentWorkspaceContextAction,
} from "@/src/server/actions/workspaceActions";
import {
  saveCsvUploadRecords,
} from "@/src/server/repositories";
import {
  analyzeRows,
  buildDayDiffs,
  buildMonthly,
  buildPropertyHistories,
  buildWeekly,
} from "@/src/server/services/analysis";
import {
  buildAreaBalanceViewModel,
  buildCurrentWardCounts,
  computeAreaAllocation,
  WARD_GRID,
} from "@/src/server/services/area";
import {
  buildDashboardViewModel,
} from "@/src/server/services/dashboard";
import {
  buildLowPvPropertyRowViewModels,
  buildOptionPropertyRowViewModels,
  buildPropertyViewModels,
} from "@/src/server/services/property";
import {
  buildCsvUploadRecords,
  buildUploadSnapshots,
  getLatestSnapshot,
  hasCsvUploadFiles,
} from "@/src/server/services/upload";
import type {
  CsvSnapshot,
} from "@/src/server/types/csv";
import type {
  CurrentWorkspaceContext,
  WorkspaceRole,
} from "@/src/server/core";
import type { OptionKey } from "@/types/option";
import type { PageId } from "@/types/page";
import type { Settings } from "@/types/settings";

const ALL_WARDS = WARD_GRID.flat()
  .filter((w): w is string => Boolean(w))
  .filter((w, i, arr) => arr.indexOf(w) === i)
  .sort();

const DEFAULT_SETTINGS: Settings = {
  slots: 500,
  smapicLimit: 300,
  ward: "中央区",
  prices: {
    smapic: 600,
    misepic: 500,
    panorama: 500,
    area: 400,
    movie: 600,
  },
};

type CheckState = Record<string, string[]>;

type TenantHeaderDisplay = {
  tenantName: string;
  roleLabel: string;
};

const TENANT_HEADER_FALLBACK: TenantHeaderDisplay = {
  tenantName: "GUGUMO",
  roleLabel: "",
};

const ROLE_LABELS = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
  viewer: "閲覧者",
} satisfies Record<WorkspaceRole, string>;

function buildTenantHeaderDisplay(context: CurrentWorkspaceContext | null): TenantHeaderDisplay {
  if (!context) return TENANT_HEADER_FALLBACK;

  return {
    tenantName: `${context.companyName}　${context.workspaceName}`,
    roleLabel: ROLE_LABELS[context.role],
  };
}

function pageClass(activePage: string, id: PageId) {
  return `page${activePage === id ? " active" : ""}`;
}

function navClass(activePage: string, id: PageId, extra = "") {
  return `nav-item${extra ? ` ${extra}` : ""}${activePage === id ? " active" : ""}`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ja-JP");
}

function formatMoney(value: number) {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function deltaCell(current: number, previous?: number) {
  if (!previous) return <span style={{ color: "var(--ink3)" }}>—</span>;
  const rate = ((current - previous) / previous) * 100;
  if (current > previous) return <span className="d-up">▲{rate.toFixed(1)}%</span>;
  if (current < previous) return <span className="d-down">▼{Math.abs(rate).toFixed(1)}%</span>;
  return <span style={{ color: "var(--ink3)" }}>±0%</span>;
}

function maxValue(values: number[]) {
  return Math.max(...values, 1);
}

function CheckableRow({
  tableId,
  itemKey,
  checked,
  onChange,
  children,
}: {
  tableId: string;
  itemKey: string;
  checked: boolean;
  onChange: (tableId: string, key: string, checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <tr className={checked ? "done" : ""}>
      <td className="col-check">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(tableId, itemKey, event.target.checked)} />
      </td>
      {children}
    </tr>
  );
}

const EMPTY_MESSAGES = {
  noData: "CSVを読み込むと、ここに分析結果が表示されます。",
  needComparison: "比較には2日分以上のCSVが必要です。",
  noRecommendation: "現在、優先対応が必要な候補はありません。",
  noSummary: "サマリーを表示するにはCSVを読み込んでください。",
};

function EmptyRow({ colSpan, text = "該当データはありません" }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty">
        {text}
      </td>
    </tr>
  );
}

function EmptyState({
  title = "まだデータがありません",
  message = EMPTY_MESSAGES.noData,
  actionLabel,
  onAction,
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <i className="ti ti-database empty-icon" />
      <div className="empty-title">{title}</div>
      <div className="empty-text">{message}</div>
      {actionLabel && onAction ? (
        <button type="button" className="topbar-btn primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function LoadingState({ text = "読み込み中です..." }: { text?: string }) {
  return (
    <div className="loading-state">
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <span>{text}</span>
    </div>
  );
}

function StatusNotice({
  tone = "info",
  icon = "ti-info-circle",
  title,
  children,
}: {
  tone?: "info" | "warning" | "critical" | "success";
  icon?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`notice-card ${tone}`}>
      <i className={`ti ${icon}`} />
      <div>
        <div className="notice-title">{title}</div>
        {children ? <div className="notice-text">{children}</div> : null}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  tone?: "default" | "danger" | "success" | "warning";
}) {
  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

function PageIntro({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-intro">
      <div>
        <div className="section-title">{title}</div>
        <div className="section-desc">{description}</div>
      </div>
      {children ? <div className="section-actions">{children}</div> : null}
    </div>
  );
}

function QuickLink({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="quick-link" onClick={onClick}>
      <i className={`ti ${icon} quick-icon`} />
      <span>
        <b>{label}</b>
        <small>{description}</small>
      </span>
    </button>
  );
}

function ProgressActions({ tableId, total, checkedState, onClear }: { tableId: string; total: number; checkedState: CheckState; onClear: (tableId: string) => void }) {
  const done = checkedState[tableId]?.length ?? 0;
  return (
    <div className="card-actions">
      <span className="progress-label">{done} / {total}</span>
      <button type="button" className="clear-btn" onClick={() => onClear(tableId)}>
        チェック解除
      </button>
    </div>
  );
}

function MiniBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = maxValue(data.map((item) => item.value));
  if (!data.length) return <EmptyState title="推移データがありません" message={EMPTY_MESSAGES.needComparison} />;

  return (
    <div style={{ padding: "8px 2px", display: "grid", gap: 8 }}>
      {data.slice(-10).map((item) => (
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "96px 1fr 72px", alignItems: "center", gap: 8, fontSize: 11 }}>
          <div style={{ color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
          <div style={{ height: 12, background: "var(--green-l)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(3, (item.value / max) * 100)}%`, background: "var(--green)", borderRadius: 8 }} />
          </div>
          <div className="num" style={{ fontWeight: 700 }}>{formatNumber(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

function useHydratedSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;

    try {
      const raw = localStorage.getItem("gugumo_s");
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw);

      return {
        slots: Number(parsed.slots ?? parsed.s_slots ?? DEFAULT_SETTINGS.slots),
        smapicLimit: Number(parsed.smapicLimit ?? parsed.smapic_limit ?? DEFAULT_SETTINGS.smapicLimit),
        ward: parsed.ward ?? DEFAULT_SETTINGS.ward,
        prices: {
          smapic: Number(parsed.pr_smapic ?? parsed.prices?.smapic ?? DEFAULT_SETTINGS.prices.smapic),
          misepic: Number(parsed.pr_misepic ?? parsed.prices?.misepic ?? DEFAULT_SETTINGS.prices.misepic),
          panorama: Number(parsed.pr_panorama ?? parsed.prices?.panorama ?? DEFAULT_SETTINGS.prices.panorama),
          area: Number(parsed.pr_area ?? parsed.prices?.area ?? DEFAULT_SETTINGS.prices.area),
          movie: Number(parsed.pr_movie ?? parsed.prices?.movie ?? DEFAULT_SETTINGS.prices.movie),
        },
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  return [settings, setSettings] as const;
}

export default function Page() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [snapshots, setSnapshots] = useState<CsvSnapshot[]>([]);
  const [isReadingCsv, setIsReadingCsv] = useState(false);
  const [settings, setSettings] = useHydratedSettings();
  const [checkedState, setCheckedState] = useState<CheckState>(() => {
    if (typeof window === "undefined") return {};

    try {
      const raw = localStorage.getItem("gugumo_checks");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [savedVisible, setSavedVisible] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [openProperties, setOpenProperties] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [tenantHeader, setTenantHeader] = useState<TenantHeaderDisplay>(TENANT_HEADER_FALLBACK);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaceContext() {
      try {
        const result = await getCurrentWorkspaceContextAction();

        if (isMounted && result.ok) {
          setTenantHeader(buildTenantHeaderDisplay(result.data));
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadWorkspaceContext();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("gugumo_checks", JSON.stringify(checkedState));
    } catch {
      // ignore
    }
  }, [checkedState]);

  const latestSnapshot = useMemo(() => getLatestSnapshot(snapshots), [snapshots]);
  const latestRows = useMemo(() => latestSnapshot?.rows ?? [], [latestSnapshot]);
  const latestSummary = latestSnapshot?.summary;
  const dayDiffs = useMemo(() => buildDayDiffs(snapshots), [snapshots]);
  const weekly = useMemo(() => buildWeekly(dayDiffs), [dayDiffs]);
  const monthly = useMemo(() => buildMonthly(dayDiffs), [dayDiffs]);
  const propertyHistories = useMemo(() => buildPropertyHistories(dayDiffs), [dayDiffs]);
  const analysis = useMemo(() => analyzeRows(latestRows, settings), [latestRows, settings]);
  const areaAllocation = useMemo(() => computeAreaAllocation(settings.ward), [settings.ward]);
  const dashboard = useMemo(() => buildDashboardViewModel(latestSummary, analysis, weekly), [latestSummary, analysis, weekly]);

  const goto = (id: PageId) => setActivePage(id);
  const navBadgeValue = (badge: "weeklyCount" | "optionReviewCount" | "lowPvCount") => {
    return dashboard.navBadges[badge];
  };

  const toggleCheck = (tableId: string, key: string, checked: boolean) => {
    setCheckedState((current) => {
      const existing = new Set(current[tableId] ?? []);
      if (checked) existing.add(key);
      else existing.delete(key);
      return { ...current, [tableId]: Array.from(existing) };
    });
  };

  const clearChecks = (tableId: string) => {
    setCheckedState((current) => ({ ...current, [tableId]: [] }));
  };

  const isChecked = (tableId: string, key: string) => Boolean(checkedState[tableId]?.includes(key));

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const loadFiles = async (fileList: FileList | File[]) => {
    if (!hasCsvUploadFiles(fileList)) return;

    setIsReadingCsv(true);
    setCheckedState({});

    try {
      const parsed = await buildUploadSnapshots(fileList);
      const saveResult = await saveCsvUploadRecords(buildCsvUploadRecords(parsed));

      if (!saveResult.ok) {
        console.error(saveResult.error.cause);
        alert(`CSVの保存に失敗しました: ${saveResult.error.failedRecord.file_name}`);
        return;
      }

      setSnapshots(parsed);
      goto("home");
      alert("CSVを読み込み、分析に反映しました。");
    } catch (error) {
      console.error(error);
      alert("CSVの読み込みに失敗しました。ファイル形式を確認してください。");
    } finally {
      setIsReadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) loadFiles(event.target.files);
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(
        "gugumo_s",
        JSON.stringify({
          slots: settings.slots,
          smapic_limit: settings.smapicLimit,
          ward: settings.ward,
          pr_smapic: settings.prices.smapic,
          pr_misepic: settings.prices.misepic,
          pr_panorama: settings.prices.panorama,
          pr_area: settings.prices.area,
          pr_movie: settings.prices.movie,
        }),
      );
      setSavedVisible(true);
      window.setTimeout(() => setSavedVisible(false), 2000);
    } catch {
      alert("設定保存に失敗しました。");
    }
  };

  const setPrice = (key: OptionKey, value: number) => {
    setSettings((current) => ({ ...current, prices: { ...current.prices, [key]: value } }));
  };

  const filteredProperties = useMemo(
    () => buildPropertyViewModels(propertyHistories, propertySearch),
    [propertyHistories, propertySearch],
  );
  const removeAllPropertyRows = useMemo(() => buildOptionPropertyRowViewModels(analysis.removeAllRows), [analysis.removeAllRows]);
  const lowerToSecondPropertyRows = useMemo(() => buildOptionPropertyRowViewModels(analysis.lowerToSecondRows), [analysis.lowerToSecondRows]);
  const raiseToSecondPropertyRows = useMemo(() => buildOptionPropertyRowViewModels(analysis.raiseToSecondRows), [analysis.raiseToSecondRows]);
  const raiseToThirdPropertyRows = useMemo(() => buildOptionPropertyRowViewModels(analysis.raiseToThirdRows), [analysis.raiseToThirdRows]);
  const lowPvPropertyRows = useMemo(() => buildLowPvPropertyRowViewModels(analysis.lowPvRows), [analysis.lowPvRows]);

  const currentWardCounts = useMemo(() => buildCurrentWardCounts(analysis.listedRows, areaAllocation), [analysis.listedRows, areaAllocation]);
  const areaBalance = useMemo(
    () => buildAreaBalanceViewModel(areaAllocation, currentWardCounts, analysis.listedRows.length),
    [areaAllocation, currentWardCounts, analysis.listedRows.length],
  );
  const latestWeek = weekly.at(-1);
  const previousWeek = weekly.at(-2);
  const latestMonth = monthly.at(-1);
  const previousMonth = monthly.at(-2);

  const topbarStatus = latestSnapshot ? `${snapshots.length}ファイル読み込み済み / 最終更新 ${latestSnapshot.dateLabel}` : "データ未読み込み";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-row">
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <ellipse cx="14" cy="17" rx="9" ry="8" fill="#3a3a4a" />
              <ellipse cx="14" cy="16.5" rx="7.5" ry="6.5" fill="#4a4a5e" />
              <circle cx="11.5" cy="14" r="1.5" fill="#fff" />
              <circle cx="16.5" cy="14" r="1.5" fill="#fff" />
              <circle cx="11.8" cy="13.7" r="0.5" fill="#1e1e2e" />
              <circle cx="16.8" cy="13.7" r="0.5" fill="#1e1e2e" />
              <path d="M12.5 16.5 Q14 17.5 15.5 16.5" stroke="#5DCAA5" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              <ellipse cx="9" cy="7.5" rx="2" ry="2.5" fill="#3a3a4a" />
              <ellipse cx="19" cy="7.5" rx="2" ry="2.5" fill="#3a3a4a" />
              <ellipse cx="9" cy="7.5" rx="1.2" ry="1.8" fill="#4a4a5e" />
              <ellipse cx="19" cy="7.5" rx="1.2" ry="1.8" fill="#4a4a5e" />
            </svg>
            <div>
              <div className="logo-text">GUGUMO<span className="up">↑</span></div>
              <div className="logo-sub">SUUMO最適化</div>
            </div>
          </div>
        </div>
        <nav className="nav">
          {NAVIGATION_GROUPS.map((group) => (
            <Fragment key={group.label}>
              <div className="nav-group">{group.label}</div>
              {group.items.map((item) => (
                <div key={item.id} className={navClass(activePage, item.id, item.extraClass)} onClick={() => goto(item.id)}>
                  <i className={`ti ${item.icon}`} />
                  <span>{item.label}</span>
                  {item.badge ? <span className={`nav-badge${item.badgeClass ? ` ${item.badgeClass}` : ""}`}>{navBadgeValue(item.badge)}</span> : null}
                </div>
              ))}
            </Fragment>
          ))}
        </nav>
        <div className="mascot">
          <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
            <ellipse cx="14" cy="22" rx="8" ry="7" fill="#3a3a4a" />
            <ellipse cx="14" cy="21" rx="6.5" ry="5.5" fill="#4a4a5e" />
            <circle cx="11.5" cy="19.5" r="1.2" fill="#fff" />
            <circle cx="16.5" cy="19.5" r="1.2" fill="#fff" />
            <circle cx="11.8" cy="19.3" r="0.4" fill="#1e1e2e" />
            <circle cx="16.8" cy="19.3" r="0.4" fill="#1e1e2e" />
            <ellipse cx="8.5" cy="13" rx="1.8" ry="2.2" fill="#3a3a4a" />
            <ellipse cx="19.5" cy="13" rx="1.8" ry="2.2" fill="#3a3a4a" />
            <path d="M14 23.5 Q13 25 12 26" stroke="#3a3a4a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="20" cy="22" r="2" fill="#3a3a4a" />
            <circle cx="8" cy="23" r="1.5" fill="#3a3a4a" />
          </svg>
          <div className="mascot-msg">今日も<br />最適化しよう</div>
        </div>
        <div className="sidebar-footer">
          <div className="settings-link" onClick={() => goto(SETTINGS_NAV_ITEM.id)}><i className={`ti ${SETTINGS_NAV_ITEM.icon}`} style={{ fontSize: 14 }} /><span>{SETTINGS_NAV_ITEM.label}</span></div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 10.5, color: "rgba(255, 255, 255, 0.46)", lineHeight: 1.5 }}>
              {PRODUCT_META.productName}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 8 }}>
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.45)", textDecoration: "none" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <span className="page-title">{PAGE_TITLES[activePage]}</span>
          <div style={{ minWidth: 168, textAlign: "right", lineHeight: 1.35 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{tenantHeader.tenantName}</div>
            {tenantHeader.roleLabel ? <div style={{ fontSize: 10, color: "var(--ink3)" }}>{tenantHeader.roleLabel}</div> : null}
          </div>
          <span className={`status-pill${latestSnapshot ? " loaded" : ""}`}>{topbarStatus}</span>
          <button type="button" className="topbar-btn primary" onClick={() => goto("upload")}><i className="ti ti-upload" style={{ fontSize: 13 }} />CSVを読み込む</button>
        </div>

        <div className="content">
          <div className={pageClass(activePage, "home")}>
            <PageIntro
              title="ダッシュボード"
              description="最新の分析結果から、経営サマリー・改善候補・次に見るべき画面をまとめて確認できます。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("weekly")}>週次を見る</button>
              <button type="button" className="topbar-btn" onClick={() => goto("upload")}>CSVを追加</button>
            </PageIntro>
            <div className="quick-grid">
              <QuickLink icon="ti-chart-bar" label="週次レポート" description="短期の反響変化を確認" onClick={() => goto("weekly")} />
              <QuickLink icon="ti-calendar-stats" label="月次レポート" description="経営向けの月次推移" onClick={() => goto("monthly")} />
              <QuickLink icon="ti-alert-triangle" label="入替対象" description="優先対応物件を確認" onClick={() => goto("lowpv")} />
              <QuickLink icon="ti-scale" label="オプション分析" description="無駄コストを確認" onClick={() => goto("optbal")} />
              <QuickLink icon="ti-upload" label="CSVアップロード" description="新しい分析を開始" onClick={() => goto("upload")} />
            </div>
            {dashboard.savings.totalSaving > 0 && (
              <div className="savings-banner">
                <div className="savings-main">
                  <div className="savings-label"><i className="ti ti-sparkles" /> GUGUMOで削減できた無駄オプション費用（月額）</div>
                  <div className="savings-amount">{formatMoney(dashboard.savings.totalSaving)}<small>/月</small></div>
                  <div className="savings-sub">無駄オプション {dashboard.savings.totalWaste}件を特定（年間 {formatMoney(dashboard.savings.annualSaving)} の削減効果）</div>
                </div>
                <div className="savings-detail">
                  <div className="savings-stat"><div className="savings-stat-val">{dashboard.savings.wasteSmapic}</div><div className="savings-stat-lbl">スマピク無駄</div></div>
                  <div className="savings-stat"><div className="savings-stat-val">{dashboard.savings.wastePanorama}</div><div className="savings-stat-lbl">パノラマ無駄</div></div>
                  <div className="savings-stat"><div className="savings-stat-val">{dashboard.savings.wasteMisepic}</div><div className="savings-stat-lbl">店ピク無駄</div></div>
                </div>
              </div>
            )}

            <div className="metrics">
              <KpiCard label="掲載物件数" value={dashboard.metrics.listedRows !== undefined ? formatNumber(dashboard.metrics.listedRows) : "—"} unit="件" />
              <KpiCard label="総問い合わせ" value={dashboard.metrics.totalInquiry !== undefined ? formatNumber(dashboard.metrics.totalInquiry) : "—"} unit="件" />
              <KpiCard label="スマピク適用" value={dashboard.metrics.smapicRows !== undefined ? formatNumber(dashboard.metrics.smapicRows) : "—"} unit="件" />
              <KpiCard label="入替対象" value={dashboard.metrics.lowPvRows} unit="件" tone="danger" />
            </div>

            <div className="row3">
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />週次PV推移</div></div>
                <div className="chart-wrap"><MiniBarChart data={weekly.map((week, index) => ({ label: `第${index + 1}週`, value: week.listPV }))} /></div>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-alert-triangle" />要対応アラート</div></div>
                {!latestSnapshot ? <EmptyState title="分析データがありません" message={EMPTY_MESSAGES.noSummary} actionLabel="CSVを読み込む" onAction={() => goto("upload")} /> : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <StatusNotice tone="critical" icon="ti-alert-triangle" title={`入替対象 ${dashboard.alerts.lowPvRows}件`}>
                      反響が弱い物件を優先して確認します。
                    </StatusNotice>
                    <StatusNotice tone="warning" icon="ti-adjustments" title={`オプション見直し ${dashboard.alerts.optionReviewCount}件`}>
                      掲載状況に対して過不足のあるオプションを確認します。
                    </StatusNotice>
                    <StatusNotice tone="info" icon="ti-star" title={`スマピク付与推奨 ${dashboard.alerts.smapicAdd}件 / 削除推奨 ${dashboard.alerts.smapicRemove}件`}>
                      推薦候補はスマピク分析画面で確認できます。
                    </StatusNotice>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title"><i className="ti ti-clock" />日次ログ（直近7日）</div></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>データ日付</th><th>一覧PV</th><th>詳細PV</th><th>問合せ</th><th>平均競合数</th><th>掲載件数</th></tr></thead>
                  <tbody>
                    {dayDiffs.length ? [...dayDiffs].reverse().slice(0, 7).map((day) => (
                      <tr key={day.dateKey}><td>{day.dateLabel}</td><td className="num">{formatNumber(day.listPV)}</td><td className="num">{formatNumber(day.detailPV)}</td><td className="num">{formatNumber(day.inquiry)}</td><td className="num">{day.avgCompetition.toFixed(1)}</td><td className="num">{formatNumber(day.listedCount)}</td></tr>
                    )) : <EmptyRow colSpan={6} text={EMPTY_MESSAGES.needComparison} />}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={pageClass(activePage, "weekly")}>
            <PageIntro
              title="週次レポート"
              description="木曜から水曜までの反響変化を、経営者向けサマリーと優先確認項目に整理します。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("monthly")}>月次を見る</button>
              <button type="button" className="topbar-btn" onClick={() => goto("lowpv")}>入替対象を見る</button>
            </PageIntro>
            <div className="metrics">
              <KpiCard label="一覧PV" value={latestWeek ? formatNumber(latestWeek.listPV) : "—"} sub={deltaCell(latestWeek?.listPV ?? 0, previousWeek?.listPV)} />
              <KpiCard label="詳細PV" value={latestWeek ? formatNumber(latestWeek.detailPV) : "—"} sub={deltaCell(latestWeek?.detailPV ?? 0, previousWeek?.detailPV)} />
              <KpiCard label="問い合わせ" value={latestWeek ? formatNumber(latestWeek.inquiry) : "—"} unit="件" sub={deltaCell(latestWeek?.inquiry ?? 0, previousWeek?.inquiry)} />
              <KpiCard label="平均競合数" value={latestWeek ? latestWeek.avgCompetition.toFixed(1) : "—"} unit="件" />
            </div>
            <div className="row2">
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-report-analytics" />経営サマリー</div></div>
                {latestWeek ? (
                  <div className="summary-list">
                    <div><b>対象期間</b><span>{latestWeek.label}</span></div>
                    <div><b>一覧PV</b><span>{formatNumber(latestWeek.listPV)} PV</span></div>
                    <div><b>問い合わせ</b><span>{formatNumber(latestWeek.inquiry)} 件</span></div>
                    <div><b>平均競合数</b><span>{latestWeek.avgCompetition.toFixed(1)} 件</span></div>
                  </div>
                ) : <EmptyState title="週次サマリーがありません" message={EMPTY_MESSAGES.needComparison} />}
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-list-check" />改善ポイント・優先確認項目</div></div>
                {latestSnapshot ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <StatusNotice tone="critical" icon="ti-alert-triangle" title={`入替対象 ${analysis.lowPvRows.length}件`}>反響が弱い物件から優先確認します。</StatusNotice>
                    <StatusNotice tone="warning" icon="ti-adjustments" title={`オプション見直し ${analysis.optionBalance.totalWaste}件`}>無駄なオプション費用を抑えられる可能性があります。</StatusNotice>
                  </div>
                ) : <EmptyState title="優先確認項目がありません" message={EMPTY_MESSAGES.noSummary} />}
              </div>
            </div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />週次PV推移（木〜水締め）</div></div><div className="chart-wrap tall"><MiniBarChart data={weekly.map((week) => ({ label: week.label, value: week.listPV }))} /></div></div>
            <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>週</th><th>期間</th><th>一覧PV</th><th>前週比</th><th>詳細PV</th><th>前週比</th><th>問合せ</th><th>前週比</th><th>平均競合数</th></tr></thead><tbody>{weekly.length ? weekly.map((week, index) => { const prev = weekly[index - 1]; return <tr key={week.key}><td>{index === weekly.length - 1 ? "直近週" : `第${index + 1}週`}</td><td style={{ color: "var(--ink3)", fontSize: 10 }}>{week.label}</td><td className="num">{formatNumber(week.listPV)}</td><td>{deltaCell(week.listPV, prev?.listPV)}</td><td className="num">{formatNumber(week.detailPV)}</td><td>{deltaCell(week.detailPV, prev?.detailPV)}</td><td className="num">{formatNumber(week.inquiry)}</td><td>{deltaCell(week.inquiry, prev?.inquiry)}</td><td className="num">{week.avgCompetition.toFixed(1)}</td></tr>; }) : <EmptyRow colSpan={9} text="比較用に2日分以上のCSVを読み込んでください" />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "monthly")}>
            <PageIntro
              title="月次レポート"
              description="月末締めの推移を、営業報告で説明しやすい形に整理します。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("weekly")}>週次を見る</button>
              <button type="button" className="topbar-btn" onClick={() => goto("optbal")}>オプション分析を見る</button>
            </PageIntro>
            <div className="metrics">
              <KpiCard label="一覧PV" value={latestMonth ? formatNumber(latestMonth.listPV) : "—"} sub={deltaCell(latestMonth?.listPV ?? 0, previousMonth?.listPV)} />
              <KpiCard label="詳細PV" value={latestMonth ? formatNumber(latestMonth.detailPV) : "—"} sub={deltaCell(latestMonth?.detailPV ?? 0, previousMonth?.detailPV)} />
              <KpiCard label="問い合わせ" value={latestMonth ? formatNumber(latestMonth.inquiry) : "—"} unit="件" sub={deltaCell(latestMonth?.inquiry ?? 0, previousMonth?.inquiry)} />
              <KpiCard label="平均競合数" value={latestMonth ? latestMonth.avgCompetition.toFixed(1) : "—"} unit="件" />
            </div>
            <div className="row2">
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-report" />月次経営サマリー</div></div>
                {latestMonth ? (
                  <div className="summary-list">
                    <div><b>対象月</b><span>{latestMonth.label}</span></div>
                    <div><b>一覧PV</b><span>{formatNumber(latestMonth.listPV)} PV</span></div>
                    <div><b>問い合わせ</b><span>{formatNumber(latestMonth.inquiry)} 件</span></div>
                    <div><b>平均競合数</b><span>{latestMonth.avgCompetition.toFixed(1)} 件</span></div>
                  </div>
                ) : <EmptyState title="月次サマリーがありません" message={EMPTY_MESSAGES.needComparison} />}
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title"><i className="ti ti-flag" />優先課題</div></div>
                {latestSnapshot ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <StatusNotice tone="critical" icon="ti-alert-triangle" title={`入替対象 ${analysis.lowPvRows.length}件`}>低反響物件を入替候補として確認します。</StatusNotice>
                    <StatusNotice tone="success" icon="ti-coin" title={`月額削減見込み ${formatMoney(analysis.optionBalance.totalSaving)}`}>オプション運用の見直し余地を確認できます。</StatusNotice>
                  </div>
                ) : <EmptyState title="優先課題がありません" message={EMPTY_MESSAGES.noSummary} />}
              </div>
            </div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />月次推移（月末締め）</div></div><div className="chart-wrap tall"><MiniBarChart data={monthly.map((month) => ({ label: month.label, value: month.listPV }))} /></div></div>
            <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>月</th><th>一覧PV</th><th>前月比</th><th>詳細PV</th><th>前月比</th><th>問合せ</th><th>前月比</th><th>平均競合数</th></tr></thead><tbody>{monthly.length ? monthly.map((month, index) => { const prev = monthly[index - 1]; return <tr key={month.key}><td>{month.label}</td><td className="num">{formatNumber(month.listPV)}</td><td>{deltaCell(month.listPV, prev?.listPV)}</td><td className="num">{formatNumber(month.detailPV)}</td><td>{deltaCell(month.detailPV, prev?.detailPV)}</td><td className="num">{formatNumber(month.inquiry)}</td><td>{deltaCell(month.inquiry, prev?.inquiry)}</td><td className="num">{month.avgCompetition.toFixed(1)}</td></tr>; }) : <EmptyRow colSpan={8} text="比較用に2日分以上のCSVを読み込んでください" />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "props")}>
            <PageIntro
              title="物件推移"
              description="物件ごとのPV・問い合わせ・競合変化を確認し、営業説明に使える変化点を追えます。"
            />
            <div className="card">
              <input value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} placeholder="物件名・駅で検索..." style={{ width: "100%", padding: "7px 11px", fontSize: 12, border: "0.5px solid var(--line2)", borderRadius: 6, background: "var(--panel)", color: "var(--ink)", marginBottom: 10, fontFamily: "inherit" }} />
              {!filteredProperties.length ? <EmptyState title="物件推移がありません" message={EMPTY_MESSAGES.needComparison} /> : filteredProperties.map((property) => {
                const open = openProperties[property.key];
                return (
                  <div className="prop-row" key={property.key}>
                    <div className="prop-head" onClick={() => setOpenProperties((current) => ({ ...current, [property.key]: !current[property.key] }))}>
                      <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{property.name} {property.room}</span>
                      <span style={{ fontSize: 10, color: "var(--ink3)" }}>{property.station} / {property.madori}</span>
                      <span style={{ fontSize: 10, color: "var(--ink3)", marginLeft: 6 }}>PV {formatNumber(property.totalList)} / 問合せ {formatNumber(property.totalInquiry)}</span>
                      {property.changes ? <span className="tag tag-amber" style={{ marginLeft: 5 }}>掲載状態に変化あり</span> : null}
                      <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "var(--ink3)", marginLeft: 4 }} />
                    </div>
                    <div className={`prop-body${open ? " open" : ""}`}>
                      <table className="tbl"><thead><tr><th>日付</th><th>一覧PV</th><th>詳細PV</th><th>問合せ</th><th>競合数</th><th>変化</th></tr></thead><tbody>{property.entries.map((entry) => <tr key={`${property.key}-${entry.dateLabel}`}><td>{entry.dateLabel}</td><td className="num">{entry.dListPV}</td><td className="num">{entry.dDetailPV}</td><td className="num">{entry.dInquiry}</td><td className="num">{entry.competition}{entry.competitionDelta !== 0 ? <span style={{ fontSize: 9, marginLeft: 3, color: entry.competitionDelta > 0 ? "#A32D2D" : "#3B6D11" }}>{entry.competitionDelta > 0 ? "▲" : "▼"}{Math.abs(entry.competitionDelta)}</span> : null}</td><td>{entry.smapicChanged ? <span className="tag tag-amber">スマピク{entry.smapicNow ? "付与" : "削除"}</span> : null}</td></tr>)}</tbody></table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={pageClass(activePage, "opt")}>
            <PageIntro
              title="オプション運用"
              description="掲載状況に対して、外す候補・付ける候補を同じ基準で確認できます。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("optbal")}>収支分析を見る</button>
            </PageIntro>
            <StatusNotice tone="info" icon="ti-info-circle" title="オプション判断の見方">
              各表は最新の掲載状況をもとに、対応確認用の候補を整理したものです。チェック状態は画面内の作業管理として保存されます。
            </StatusNotice>
            <div className="opt-group remove">
              <div className="opt-group-label"><i className="ti ti-circle-minus" />オプションを外す系</div>
              <div className="card"><div className="card-head"><div className="card-title">外す候補（スマピク以外）</div><ProgressActions tableId="t1" total={analysis.removeAllRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{removeAllPropertyRows.length ? removeAllPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t1" itemKey={row.key} checked={isChecked("t1", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>) : <EmptyRow colSpan={4} />}</tbody></table></div></div>
              <div style={{ height: 11 }} />
              <div className="card"><div className="card-head"><div className="card-title">掲載を抑える候補</div><ProgressActions tableId="t2" total={analysis.lowerToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{lowerToSecondPropertyRows.length ? lowerToSecondPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t2" itemKey={row.key} checked={isChecked("t2", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>) : <EmptyRow colSpan={4} />}</tbody></table></div></div>
            </div>
            <div className="opt-group add">
              <div className="opt-group-label"><i className="ti ti-circle-plus" />オプションを付ける系</div>
              <div className="card"><div className="card-head"><div className="card-title">付ける候補</div><ProgressActions tableId="t3" total={analysis.raiseToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{raiseToSecondPropertyRows.length ? raiseToSecondPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t3" itemKey={row.key} checked={isChecked("t3", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>) : <EmptyRow colSpan={4} />}</tbody></table></div></div>
              <div style={{ height: 11 }} />
              <div className="card"><div className="card-head"><div className="card-title">優先的に強める候補</div><ProgressActions tableId="t4" total={analysis.raiseToThirdRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{raiseToThirdPropertyRows.length ? raiseToThirdPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t4" itemKey={row.key} checked={isChecked("t4", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>) : <EmptyRow colSpan={4} />}</tbody></table></div></div>
            </div>
          </div>

          <div className={pageClass(activePage, "smapic")}>
            <PageIntro
              title="スマピク推薦"
              description="スマピクの付与・削除候補を一覧で確認し、掲載改善の作業順を決めやすくします。"
            />
            <div className="row2">
              <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-circle-plus" />付与推奨</div><ProgressActions tableId="t5" total={analysis.smapicAdd.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>現在</th></tr></thead><tbody>{analysis.smapicAdd.length ? analysis.smapicAdd.slice(0, 200).map((item) => <CheckableRow key={item.id} tableId="t5" itemKey={item.id} checked={isChecked("t5", item.id)} onChange={toggleCheck}><td className="nm">{item.name}</td><td>{item.room}</td><td>未付与</td></CheckableRow>) : <EmptyRow colSpan={4} />}</tbody></table></div></div>
              <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-circle-minus" />削除推奨</div><ProgressActions tableId="t5r" total={analysis.smapicRemove.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>現在</th></tr></thead><tbody>{analysis.smapicRemove.length ? analysis.smapicRemove.slice(0, 200).map((item) => <CheckableRow key={item.id} tableId="t5r" itemKey={item.id} checked={isChecked("t5r", item.id)} onChange={toggleCheck}><td className="nm">{item.name}</td><td>{item.room}</td><td>付与中</td></CheckableRow>) : <EmptyRow colSpan={4} />}</tbody></table></div></div>
            </div>
          </div>

          <div className={pageClass(activePage, "lowpv")}>
            <PageIntro
              title="入替対象分析"
              description="反響が弱い物件を確認し、入替・改善の優先順位を営業現場で説明しやすくします。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("weekly")}>週次を見る</button>
              <button type="button" className="topbar-btn" onClick={() => goto("upload")}>CSVを追加</button>
            </PageIntro>
            <StatusNotice tone="warning" icon="ti-alert-triangle" title="入替対象の扱い">
              表示される候補は確認リストです。実際の掲載判断は営業状況とオーナー方針を踏まえて確認してください。
            </StatusNotice>
            <div className="card"><div className="card-head"><div className="card-title" style={{ color: "var(--red)" }}><i className="ti ti-alert-triangle" />入替対象物件</div><ProgressActions tableId="t6" total={analysis.lowPvRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>駅</th><th>間取</th><th>賃料+管理費</th><th>掲載日数</th><th>問合せ</th><th>競合数</th></tr></thead><tbody>{lowPvPropertyRows.length ? lowPvPropertyRows.slice(0, 300).map((row) => <CheckableRow key={row.key} tableId="t6" itemKey={row.key} checked={isChecked("t6", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td>{row.station}</td><td>{row.madori}</td><td className="num">{row.rent}万円</td><td className="num">{row.days}日</td><td className="num">{row.inquiry}件</td><td className="num">{row.total}件</td></CheckableRow>) : <EmptyRow colSpan={9} />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "optbal")}>
            <PageIntro
              title="オプション収支分析"
              description="現在の付与数・無駄候補・削減見込みをまとめ、費用対効果を説明しやすくします。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("opt")}>運用候補を見る</button>
            </PageIntro>
            <div className="savings-banner" style={{ marginBottom: 14 }}><div className="savings-main"><div className="savings-label"><i className="ti ti-coin" /> 月額オプション節約効果</div><div className="savings-amount">{formatMoney(analysis.optionBalance.totalSaving)}<small>/月</small></div><div className="savings-sub">最適化による無駄オプションの削減額</div></div><div className="savings-detail"><div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.totalWaste}</div><div className="savings-stat-lbl">無駄オプション計</div></div><div className="savings-stat"><div className="savings-stat-val">{formatMoney(analysis.optionBalance.totalSaving * 12)}</div><div className="savings-stat-lbl">年間削減</div></div></div></div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-scale" />オプション収支分析（現在と見直し後）</div></div><div className="optbal-grid">{analysis.optionBalance.cards.map((card) => <div className="optbal-card" key={card.key}><div className="optbal-name"><i className={`ti ${card.icon}`} style={{ color: "var(--green)" }} />{card.name}</div><div className="optbal-row"><span>現在の付与</span><b>{card.current}件</b></div><div className="optbal-row"><span>見直し候補</span><b style={{ color: "var(--red)" }}>{card.waste}件</b></div><div className="optbal-row"><span>見直し後</span><b>{Math.max(0, card.current - card.waste)}件</b></div><div className="optbal-row"><span>単価</span><b>{formatMoney(card.price)}</b></div><div className={`optbal-verdict ${card.waste > 0 ? "verdict-cut" : "verdict-ok"}`}>{card.waste > 0 ? <>▼ {card.waste}件 削減推奨<br /><span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink3)" }}>月 {formatMoney(card.saving)} 節約</span></> : "適正"}</div></div>)}</div><div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6 }}>※現在の掲載・競合状況から、必要なオプション件数を試算したものです。単価は設定画面で変更できます。</div></div>
          </div>

          <div className={pageClass(activePage, "area")}>
            <PageIntro
              title="エリア配分"
              description="所属区を基準に、推奨掲載配分と現在の掲載バランスを確認します。"
            />
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-map-2" />掲載エリアマップ — <span style={{ color: "var(--green)" }}>{settings.ward}</span>基準</div></div><div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 12 }}>所属区（濃紺）と、データ上反響が見込める推奨掲載区（緑）。設定画面で所属区を変更できます。</div><div className="area-map">
                {WARD_GRID.map((row, r) =>
                  row.map((ward, c) => {
                    const allocation = areaAllocation.find((item) => item.ward === ward);
                    const isBaseWard = Boolean(ward) && ward === settings.ward;
                    const isRecommendedWard = Boolean(ward) && Boolean(allocation);
                    const cellStyle = !ward
                      ? {
                          background: "transparent",
                          border: "none",
                          boxShadow: "none",
                        }
                      : isBaseWard
                        ? {
                            background: "#1e1e2e",
                            border: "1px solid #1e1e2e",
                            color: "#ffffff",
                          }
                        : isRecommendedWard
                          ? {
                              background: "#e1f5ee",
                              border: "1px solid #9fdcc9",
                              color: "#0f6e56",
                            }
                          : {
                              background: "#ffffff",
                              border: "1px solid var(--line2)",
                              color: "var(--ink)",
                            };

                    return (
                      <div
                        key={`${r}-${c}-${ward}`}
                        className={`area-cell${isBaseWard ? " home" : ""}${isRecommendedWard ? " rec" : ""}`}
                        style={{
                          minHeight: 72,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          fontWeight: 700,
                          fontSize: 14,
                          lineHeight: 1.2,
                          ...cellStyle,
                        }}
                      >
                        {ward ? (
                          <>
                            <span className="ward" style={{ color: "inherit" }}>{ward}</span>
                            {allocation ? (
                              <span
                                className="pct"
                                style={{
                                  marginTop: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  opacity: isBaseWard ? 0.95 : 0.9,
                                  color: "inherit",
                                }}
                              >
                                {allocation.pct.toFixed(1)}%
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div></div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-pie" />推奨掲載配分と現在の掲載件数</div></div><div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 10 }}>推奨配分に対し、各区の現在の掲載件数を確認できます。<span style={{ color: "var(--red)" }}>不足</span>＝掲載を増やす余地あり／<span style={{ color: "var(--blue)" }}>多め</span>＝配分を見直す余地あり。</div><div className="tbl-wrap"><table className="tbl"><thead><tr><th>区</th><th>推奨配分</th><th>推奨件数</th><th>現掲載</th><th>過不足</th><th className="num" style={{ width: 180 }}>バランス</th><th>特性</th></tr></thead><tbody>{areaBalance.length && latestSnapshot ? areaBalance.map((item) => { const status = item.statusType === "shortage" ? <span style={{ color: "var(--red)", fontWeight: 700 }}>不足 {Math.abs(item.diff)}</span> : item.statusType === "excess" ? <span style={{ color: "var(--blue)", fontWeight: 700 }}>多め +{item.diff}</span> : <span style={{ color: "var(--green)" }}>適正</span>; return <tr key={item.ward}><td className="nm" style={{ fontWeight: 700 }}>{item.ward}{item.ward === settings.ward ? <span className="tag" style={{ background: "#1e1e2e", color: "#fff", marginLeft: 4 }}>所属</span> : null}</td><td className="num">{item.pct.toFixed(1)}%</td><td className="num">{item.recommended}件</td><td className="num">{item.actual}件</td><td>{status}</td><td><div className="area-bar"><div style={{ width: `${(item.actual / item.max) * 100}%`, background: item.statusType === "shortage" ? "var(--red)" : item.statusType === "excess" ? "var(--blue)" : "var(--green)" }} /></div></td><td style={{ whiteSpace: "normal", maxWidth: 260, fontSize: 10.5, color: "var(--ink2)" }}>{item.info}</td></tr>; }) : <EmptyRow colSpan={7} text="設定画面で所属区を選び、CSVを読み込んでください" />}</tbody></table></div></div>
          </div>

          <div className={pageClass(activePage, "upload")}>
            <PageIntro
              title="CSVアップロード"
              description="SUUMOのCSVを読み込み、ダッシュボードや各レポートで確認できる状態にします。"
            />
            <div className="card">
              <div className="card-head"><div className="card-title"><i className="ti ti-upload" />CSVアップロード</div></div>
              <div className={`upload-zone${isDragOver ? " drag" : ""}`} onClick={openFileDialog} onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={(event) => { event.preventDefault(); setIsDragOver(false); if (event.dataTransfer.files.length) loadFiles(event.dataTransfer.files); }} style={{ cursor: "pointer" }}>
                {isReadingCsv ? <LoadingState text="CSVを読み込んでいます..." /> : (
                  <>
                    <i className="ti ti-files" style={{ fontSize: 28, color: "var(--ink2)", display: "block", marginBottom: 9 }} />
                    <div style={{ fontSize: 13.5, color: "var(--ink2)" }}>複数ファイルをまとめてドロップ、またはクリックして選択</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 5 }}>SUUMO掲載CSV / Shift-JIS・UTF-8 対応</div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" multiple style={{ display: "none" }} onChange={handleFileInput} />
              <div style={{ marginTop: 9 }}>{snapshots.map((snapshot) => <span className="chip" key={snapshot.fileName}>{snapshot.dateLabel} / {snapshot.rows.length}件</span>)}</div>
              <StatusNotice tone="info" icon="ti-database" title="アップロード後の反映">
                読み込んだCSVは、各レポートと分析画面に反映されます。
              </StatusNotice>
              <StatusNotice tone="warning" icon="ti-refresh" title="チェック状態の扱い">
                新しいCSVを読み込むと、対応済みチェックはリセットされます。
              </StatusNotice>
            </div>
            <div className="card">
              <div className="card-head"><div className="card-title"><i className="ti ti-route" />アップロード後に見る画面</div></div>
              <div className="quick-grid compact">
                <QuickLink icon="ti-dashboard" label="ダッシュボードを見る" description="全体状況を確認" onClick={() => goto("home")} />
                <QuickLink icon="ti-chart-bar" label="週次レポートを見る" description="直近の反響を確認" onClick={() => goto("weekly")} />
                <QuickLink icon="ti-alert-triangle" label="入替対象を見る" description="優先対応を確認" onClick={() => goto("lowpv")} />
              </div>
            </div>
          </div>

          <div className={pageClass(activePage, "settings")}>
            <PageIntro
              title="設定"
              description="契約枠・所属区・オプション単価を調整し、分析結果を店舗運用に合わせます。"
            />
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-settings" />SUUMO契約枠</div></div><div className="setting-grid"><div className="setting-card"><div className="setting-label">掲載枠数（総数）</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><input className="setting-input" type="number" value={settings.slots} min={0} onChange={(event) => setSettings((current) => ({ ...current, slots: Number(event.target.value) }))} /><span style={{ fontSize: 11, color: "var(--ink3)" }}>件</span></div></div><div className="setting-card"><div className="setting-label">スマピク上限</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><input className="setting-input" type="number" value={settings.smapicLimit} min={0} onChange={(event) => setSettings((current) => ({ ...current, smapicLimit: Number(event.target.value) }))} /><span style={{ fontSize: 11, color: "var(--ink3)" }}>件</span></div></div><div className="setting-card"><div className="setting-label">所属区（エリア配分の基準）</div><div><select className="setting-select" value={settings.ward} onChange={(event) => setSettings((current) => ({ ...current, ward: event.target.value }))}>{ALL_WARDS.map((ward) => <option key={ward} value={ward}>{ward}</option>)}</select></div></div><div className="setting-card" style={{ display: "flex", alignItems: "flex-end" }}><button type="button" className="save-btn" onClick={saveSettings}>保存して再計算</button>{savedVisible ? <span style={{ fontSize: 10, color: "#3B6D11", marginLeft: 8 }}>✓ 保存済み</span> : null}</div></div></div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-coin" />オプション単価（月額・1件あたり）</div></div><div className="setting-grid"><div className="setting-card"><div className="setting-label">スマピク</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.smapic} min={0} onChange={(event) => setPrice("smapic", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">店ピク</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.misepic} min={0} onChange={(event) => setPrice("misepic", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">パノラマ</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.panorama} min={0} onChange={(event) => setPrice("panorama", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">得意なエリア</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.area} min={0} onChange={(event) => setPrice("area", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">動画</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.movie} min={0} onChange={(event) => setPrice("movie", Number(event.target.value))} /></div></div></div></div>
            <div className="card">
              <div className="card-head"><div className="card-title"><i className="ti ti-road" />今後追加予定</div></div>
              <div className="future-list">
                <div><b>ログイン・権限管理</b><span>会社・店舗・権限ごとに、利用できる画面や操作を整理します。</span></div>
                <div><b>店舗別設定</b><span>店舗ごとの契約枠・配信設定・レポート出力設定を保存できるようにします。</span></div>
                <div><b>レポート配信</b><span>週次・月次レポートを関係者へ共有しやすくする予定です。</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
