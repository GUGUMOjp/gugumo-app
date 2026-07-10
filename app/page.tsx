"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { PAGE_TITLES } from "@/data/constants/pageTitles";
import { NAVIGATION_GROUPS, SETTINGS_NAV_ITEM } from "@/data/navigation/navigation";
import {
  LEGAL_LINKS,
  PRODUCT_META,
} from "@/data/product/productMeta";
import { supabase } from "@/lib/supabase";
import {
  getCurrentWorkspaceContextAction,
} from "@/src/server/actions/workspaceActions";
import {
  loadRecentCsvUploadSnapshotsAction,
  saveCsvUploadRecordsAction,
} from "@/src/server/actions/csvUploadActions";
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

function EmptyActionPanel({
  icon = "ti-upload",
  title,
  message,
  actionLabel = "CSVを読み込む",
  onAction,
  points = [],
}: {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction: () => void;
  points?: string[];
}) {
  return (
    <div className="empty-action-panel">
      <div className="empty-action-icon"><i className={`ti ${icon}`} /></div>
      <div>
        <div className="empty-action-title">{title}</div>
        <div className="empty-action-text">{message}</div>
      </div>
      {points.length ? (
        <div className="empty-action-points">
          {points.map((point) => (
            <div key={point}><i className="ti ti-check" />{point}</div>
          ))}
        </div>
      ) : null}
      <button type="button" className="topbar-btn primary empty-action-btn" onClick={onAction}>
        <i className="ti ti-upload" />{actionLabel}
      </button>
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

function LoginScreen({
  onLogin,
  isSubmitting = false,
  errorMessage = "",
}: {
  onLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-copy-card">
          <div className="login-brand">GUGUMO<span>↑</span></div>
          <div className="login-kicker">SUUMO掲載最適化ツール</div>
          <h1>掲載運用の現在地と改善点がひと目でわかる</h1>
          <p>
            SUUMOのCSVを読み込むだけで、反響の変化、入替候補、オプション見直しを営業説明に使いやすい形で整理します。
          </p>
          <div className="login-value-list">
            <div><i className="ti ti-chart-bar" />反響の変化を週次・月次で確認</div>
            <div><i className="ti ti-alert-triangle" />優先して確認する物件を整理</div>
            <div><i className="ti ti-coin" />オプション費用の見直し余地を把握</div>
          </div>
        </section>

        <section className="login-form-card">
          <div>
            <div className="login-form-title">ログイン</div>
            <div className="login-form-sub">店舗の掲載改善レポートを確認します。</div>
          </div>
          <form
            className="login-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await onLogin({ email, password });
            }}
          >
            <label>
              <span>メールアドレス</span>
              <input
                type="email"
                placeholder="example@gugumo.jp"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
                required
              />
            </label>
            <label>
              <span>パスワード</span>
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
                required
              />
            </label>
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => setResetMessage("パスワード再設定（準備中）: 正式版では入力したメールアドレス宛に再設定メールを送信します。")}
            >
              パスワードをお忘れですか？
            </button>
            {resetMessage ? <div className="login-support-message">{resetMessage}</div> : null}
            {errorMessage ? <div className="login-error-message">{errorMessage}</div> : null}
            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </section>
      </div>
      <footer className="login-footer">
        {LEGAL_LINKS.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
      </footer>
    </main>
  );
}

function SessionLoadingScreen() {
  return (
    <main className="login-page">
      <div className="login-loading-card">
        <LoadingState text="ログイン状態を確認しています..." />
      </div>
      <footer className="login-footer">
        {LEGAL_LINKS.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
      </footer>
    </main>
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
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "minmax(132px, 160px) minmax(80px, 1fr) 72px", alignItems: "center", gap: 8, fontSize: 11 }}>
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
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [snapshots, setSnapshots] = useState<CsvSnapshot[]>([]);
  const [isRestoringCsv, setIsRestoringCsv] = useState(false);
  const [restoreError, setRestoreError] = useState("");
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
  const authUserId = session?.user.id ?? null;
  const authAccessToken = session?.access_token ?? null;

  const resetAuthenticatedState = useCallback(() => {
    setIsRestoringCsv(false);
    setRestoreError("");
    setSnapshots([]);
    setCheckedState({});
    setActivePage("home");
    setTenantHeader(TENANT_HEADER_FALLBACK);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.warn("Session restore failed", error);
          setSession(null);
          return;
        }

        setSession(data.session ?? null);
      } catch (error) {
        console.warn("Session restore failed", error);

        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    restoreSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingSession(false);

      if (nextSession) {
        setLoginError("");
      } else {
        resetAuthenticatedState();
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [resetAuthenticatedState]);

  useEffect(() => {
    if (!authUserId || !authAccessToken) {
      return;
    }

    let isMounted = true;

    async function loadWorkspaceContext() {
      try {
        const result = await getCurrentWorkspaceContextAction(authAccessToken ?? undefined);

        if (isMounted && result.ok) {
          setTenantHeader(buildTenantHeaderDisplay(result.data));
        }
        // TODO: tenant未紐付けユーザーの専用案内は本番Auth移行後に整理する。
      } catch (error) {
        console.error(error);
      }
    }

    loadWorkspaceContext();

    return () => {
      isMounted = false;
    };
  }, [authUserId, authAccessToken]);

  useEffect(() => {
    if (!authUserId) return;

    let isMounted = true;

    async function restoreRecentCsv() {
      setIsRestoringCsv(true);

      try {
        const result = await loadRecentCsvUploadSnapshotsAction();

        if (!isMounted) return;

        if (result.ok) {
          setSnapshots(result.data);
        } else {
          setRestoreError("保存済みデータを読み込めませんでした。時間をおいて再度お試しください。");
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setRestoreError("保存済みデータを読み込めませんでした。時間をおいて再度お試しください。");
        }
      } finally {
        if (isMounted) {
          setIsRestoringCsv(false);
        }
      }
    }

    restoreRecentCsv();

    return () => {
      isMounted = false;
    };
  }, [authUserId]);

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
      const saveResult = await saveCsvUploadRecordsAction(buildCsvUploadRecords(parsed));

      if (!saveResult.ok) {
        console.error(saveResult.error);
        alert("CSVの保存に失敗しました。時間をおいて再度お試しください。");
        return;
      }

      setSnapshots(parsed);
      setRestoreError("");
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

  const topbarStatus = isRestoringCsv
    ? "保存済みデータを確認中"
    : latestSnapshot
      ? `${snapshots.length}ファイル読み込み済み / 最終更新 ${latestSnapshot.dateLabel}`
      : "データ未読み込み";

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoginError("");
    setRestoreError("");
    setIsSigningIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        setLoginError("メールアドレスまたはパスワードをご確認ください。");
        return;
      }

      setSession(data.session);
    } catch {
      setLoginError("メールアドレスまたはパスワードをご確認ください。");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
    }

    setSession(null);
    resetAuthenticatedState();
  };

  if (isCheckingSession) {
    return <SessionLoadingScreen />;
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} isSubmitting={isSigningIn} errorMessage={loginError} />;
  }

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
                  {item.badge && latestSnapshot ? <span className={`nav-badge${item.badgeClass ? ` ${item.badgeClass}` : ""}`}>{navBadgeValue(item.badge)}</span> : null}
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
          <button type="button" className="topbar-btn" onClick={handleLogout}><i className="ti ti-logout" style={{ fontSize: 13 }} />ログアウト</button>
        </div>

        <div className={`content${isRestoringCsv ? " restoring" : ""}`}>
          {isRestoringCsv ? (
            <div className="restore-state">
              <LoadingState text="保存済みデータを読み込んでいます..." />
            </div>
          ) : null}
          {restoreError ? (
            <StatusNotice tone="warning" icon="ti-alert-circle" title="保存済みデータを読み込めませんでした">
              時間をおいて再度お試しください。CSVを新しく読み込むこともできます。
            </StatusNotice>
          ) : null}
          <div className={pageClass(activePage, "home")}>
            <PageIntro
              title="ダッシュボード"
              description="最新の分析結果から、経営サマリー・改善候補・次に見るべき画面をまとめて確認できます。"
            >
              {latestSnapshot ? (
                <>
                  <button type="button" className="topbar-btn" onClick={() => goto("weekly")}>週次を見る</button>
                  <button type="button" className="topbar-btn" onClick={() => goto("upload")}>CSVを追加</button>
                </>
              ) : null}
            </PageIntro>
            {!latestSnapshot ? (
              <EmptyActionPanel
                icon="ti-file-upload"
                title="まずCSVを読み込む"
                message="SUUMOから出力したCSVを読み込むと、営業説明に使う確認ポイントを自動で整理します。"
                onAction={() => goto("upload")}
                points={[
                  "反響の変化を週次・月次で確認",
                  "優先して見る物件を整理",
                  "オプション見直しの余地を確認",
                ]}
              />
            ) : (
              <>
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
                  </div>
                </div>
                {dayDiffs.length ? (
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-clock" />日次ログ（直近7日）</div></div>
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr><th>データ日付</th><th>一覧PV</th><th>詳細PV</th><th>問合せ</th><th>平均競合数</th><th>掲載件数</th></tr></thead>
                        <tbody>
                          {[...dayDiffs].reverse().slice(0, 7).map((day) => (
                            <tr key={day.dateKey}><td>{day.dateLabel}</td><td className="num">{formatNumber(day.listPV)}</td><td className="num">{formatNumber(day.detailPV)}</td><td className="num">{formatNumber(day.inquiry)}</td><td className="num">{day.avgCompetition.toFixed(1)}</td><td className="num">{formatNumber(day.listedCount)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className={pageClass(activePage, "weekly")}>
            <PageIntro
              title="週次レポート"
              description="木曜から水曜までの反響変化を、経営者向けサマリーと優先確認項目に整理します。"
            >
              {weekly.length ? (
                <>
                  <button type="button" className="topbar-btn" onClick={() => goto("monthly")}>月次を見る</button>
                  <button type="button" className="topbar-btn" onClick={() => goto("lowpv")}>入替対象を見る</button>
                </>
              ) : null}
            </PageIntro>
            {!weekly.length ? (
              <EmptyActionPanel
                icon="ti-chart-bar"
                title="2日分以上のCSVで週次比較できます"
                message="CSVを複数日分読み込むと、木曜から水曜までの反響変化を週次で確認できます。"
                onAction={() => goto("upload")}
              />
            ) : (
              <>
                <div className="metrics">
                  <KpiCard label="一覧PV" value={latestWeek ? formatNumber(latestWeek.listPV) : "—"} sub={deltaCell(latestWeek?.listPV ?? 0, previousWeek?.listPV)} />
                  <KpiCard label="詳細PV" value={latestWeek ? formatNumber(latestWeek.detailPV) : "—"} sub={deltaCell(latestWeek?.detailPV ?? 0, previousWeek?.detailPV)} />
                  <KpiCard label="問い合わせ" value={latestWeek ? formatNumber(latestWeek.inquiry) : "—"} unit="件" sub={deltaCell(latestWeek?.inquiry ?? 0, previousWeek?.inquiry)} />
                  <KpiCard label="平均競合数" value={latestWeek ? latestWeek.avgCompetition.toFixed(1) : "—"} unit="件" />
                </div>
                <div className="row2">
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-report-analytics" />経営サマリー</div></div>
                  <div className="summary-list">
                    <div><b>対象期間</b><span>{latestWeek!.label}</span></div>
                    <div><b>一覧PV</b><span>{formatNumber(latestWeek!.listPV)} PV</span></div>
                    <div><b>問い合わせ</b><span>{formatNumber(latestWeek!.inquiry)} 件</span></div>
                    <div><b>平均競合数</b><span>{latestWeek!.avgCompetition.toFixed(1)} 件</span></div>
                  </div>
                  </div>
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-list-check" />改善ポイント・優先確認項目</div></div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <StatusNotice tone="critical" icon="ti-alert-triangle" title={`入替対象 ${analysis.lowPvRows.length}件`}>反響が弱い物件から優先確認します。</StatusNotice>
                    <StatusNotice tone="warning" icon="ti-adjustments" title={`オプション見直し ${analysis.optionBalance.totalWaste}件`}>無駄なオプション費用を抑えられる可能性があります。</StatusNotice>
                  </div>
                  </div>
                </div>
                <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />週次PV推移（木〜水締め）</div></div><div className="chart-wrap tall"><MiniBarChart data={weekly.map((week) => ({ label: week.label, value: week.listPV }))} /></div></div>
                <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>週</th><th>期間</th><th>一覧PV</th><th>前週比</th><th>詳細PV</th><th>前週比</th><th>問合せ</th><th>前週比</th><th>平均競合数</th></tr></thead><tbody>{weekly.map((week, index) => { const prev = weekly[index - 1]; return <tr key={week.key}><td>{index === weekly.length - 1 ? "直近週" : `第${index + 1}週`}</td><td style={{ color: "var(--ink3)", fontSize: 10 }}>{week.label}</td><td className="num">{formatNumber(week.listPV)}</td><td>{deltaCell(week.listPV, prev?.listPV)}</td><td className="num">{formatNumber(week.detailPV)}</td><td>{deltaCell(week.detailPV, prev?.detailPV)}</td><td className="num">{formatNumber(week.inquiry)}</td><td>{deltaCell(week.inquiry, prev?.inquiry)}</td><td className="num">{week.avgCompetition.toFixed(1)}</td></tr>; })}</tbody></table></div></div>
              </>
            )}
          </div>

          <div className={pageClass(activePage, "monthly")}>
            <PageIntro
              title="月次レポート"
              description="読み込み済みCSVの月ごとの推移を、営業報告で説明しやすい形に整理します。"
            >
              {monthly.length ? (
                <>
                  <button type="button" className="topbar-btn" onClick={() => goto("weekly")}>週次を見る</button>
                  <button type="button" className="topbar-btn" onClick={() => goto("optbal")}>オプション分析を見る</button>
                </>
              ) : null}
            </PageIntro>
            {!monthly.length ? (
              <EmptyActionPanel
                icon="ti-calendar-stats"
                title="複数日のCSV読み込み後に月次サマリーを表示します"
                message="月ごとの推移や優先課題は、複数日のCSVを読み込むと確認できます。"
                onAction={() => goto("upload")}
              />
            ) : (
              <>
                <div className="metrics">
                  <KpiCard label="一覧PV" value={latestMonth ? formatNumber(latestMonth.listPV) : "—"} sub={deltaCell(latestMonth?.listPV ?? 0, previousMonth?.listPV)} />
                  <KpiCard label="詳細PV" value={latestMonth ? formatNumber(latestMonth.detailPV) : "—"} sub={deltaCell(latestMonth?.detailPV ?? 0, previousMonth?.detailPV)} />
                  <KpiCard label="問い合わせ" value={latestMonth ? formatNumber(latestMonth.inquiry) : "—"} unit="件" sub={deltaCell(latestMonth?.inquiry ?? 0, previousMonth?.inquiry)} />
                  <KpiCard label="平均競合数" value={latestMonth ? latestMonth.avgCompetition.toFixed(1) : "—"} unit="件" />
                </div>
                <div className="row2">
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-report" />月次経営サマリー</div></div>
                  <div className="summary-list">
                    <div><b>対象月</b><span>{latestMonth!.label}</span></div>
                    <div><b>一覧PV</b><span>{formatNumber(latestMonth!.listPV)} PV</span></div>
                    <div><b>問い合わせ</b><span>{formatNumber(latestMonth!.inquiry)} 件</span></div>
                    <div><b>平均競合数</b><span>{latestMonth!.avgCompetition.toFixed(1)} 件</span></div>
                  </div>
                  </div>
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-flag" />優先課題</div></div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <StatusNotice tone="critical" icon="ti-alert-triangle" title={`入替対象 ${analysis.lowPvRows.length}件`}>低反響物件を入替候補として確認します。</StatusNotice>
                    <StatusNotice tone="success" icon="ti-coin" title={`月額削減見込み ${formatMoney(analysis.optionBalance.totalSaving)}`}>オプション運用の見直し余地を確認できます。</StatusNotice>
                  </div>
                  </div>
                </div>
                <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />月次推移</div></div><div className="chart-wrap tall"><MiniBarChart data={monthly.map((month) => ({ label: month.label, value: month.listPV }))} /></div></div>
                <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>月</th><th>一覧PV</th><th>前月比</th><th>詳細PV</th><th>前月比</th><th>問合せ</th><th>前月比</th><th>平均競合数</th></tr></thead><tbody>{monthly.map((month, index) => { const prev = monthly[index - 1]; return <tr key={month.key}><td>{month.label}</td><td className="num">{formatNumber(month.listPV)}</td><td>{deltaCell(month.listPV, prev?.listPV)}</td><td className="num">{formatNumber(month.detailPV)}</td><td>{deltaCell(month.detailPV, prev?.detailPV)}</td><td className="num">{formatNumber(month.inquiry)}</td><td>{deltaCell(month.inquiry, prev?.inquiry)}</td><td className="num">{month.avgCompetition.toFixed(1)}</td></tr>; })}</tbody></table></div></div>
              </>
            )}
          </div>

          <div className={pageClass(activePage, "props")}>
            <PageIntro
              title="物件推移"
              description="物件ごとのPV・問い合わせ・競合変化を確認し、営業説明に使える変化点を追えます。"
            />
            <div className="card">
              {!filteredProperties.length ? (
                <EmptyActionPanel
                  icon="ti-building-estate"
                  title="物件ごとの反響変化を確認できます"
                  message="CSVを複数日分読み込むと、どの物件の反響が落ちたか、改善後に戻ったかを物件単位で追えます。"
                  onAction={() => goto("upload")}
                  points={[
                    "物件ごとのPV・問い合わせを確認",
                    "競合数の変化を確認",
                    "改善後の戻りを営業説明に活用",
                  ]}
                />
              ) : (
                <>
                  <input value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} placeholder="物件名・駅で検索..." style={{ width: "100%", padding: "7px 11px", fontSize: 12, border: "0.5px solid var(--line2)", borderRadius: 6, background: "var(--panel)", color: "var(--ink)", marginBottom: 10, fontFamily: "inherit" }} />
                  {filteredProperties.map((property) => {
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
                </>
              )}
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
            {!latestSnapshot ? (
              <EmptyActionPanel
                icon="ti-adjustments"
                title="見直し候補はまだありません"
                message="CSVを読み込むと、外す候補・付ける候補がある場合だけ一覧で表示します。"
                onAction={() => goto("upload")}
              />
            ) : (
              <>
                <div className="opt-group remove">
                  <div className="opt-group-label"><i className="ti ti-circle-minus" />オプションを外す系</div>
                  {removeAllPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">外す候補（スマピク以外）</div><ProgressActions tableId="t1" total={analysis.removeAllRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{removeAllPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t1" itemKey={row.key} checked={isChecked("t1", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {lowerToSecondPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">掲載を抑える候補</div><ProgressActions tableId="t2" total={analysis.lowerToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{lowerToSecondPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t2" itemKey={row.key} checked={isChecked("t2", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {!removeAllPropertyRows.length && !lowerToSecondPropertyRows.length ? <EmptyState title="外す候補はありません" message="現在、外す候補として表示する物件はありません。" /> : null}
                </div>
                <div className="opt-group add">
                  <div className="opt-group-label"><i className="ti ti-circle-plus" />オプションを付ける系</div>
                  {raiseToSecondPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">付ける候補</div><ProgressActions tableId="t3" total={analysis.raiseToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{raiseToSecondPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t3" itemKey={row.key} checked={isChecked("t3", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {raiseToThirdPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">優先的に強める候補</div><ProgressActions tableId="t4" total={analysis.raiseToThirdRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{raiseToThirdPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t4" itemKey={row.key} checked={isChecked("t4", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {!raiseToSecondPropertyRows.length && !raiseToThirdPropertyRows.length ? <EmptyState title="付ける候補はありません" message="現在、追加候補として表示する物件はありません。" /> : null}
                </div>
              </>
            )}
          </div>

          <div className={pageClass(activePage, "smapic")}>
            <PageIntro
              title="スマピク最適化"
              description="スマピクを付けるべき物件・外してよい物件を確認し、掲載改善の作業順を決めやすくします。"
            />
            {!latestSnapshot ? (
              <EmptyActionPanel
                icon="ti-star"
                title="スマピクの見直し候補はまだありません"
                message="CSVを読み込むと、付けるべき物件と外してよい物件がある場合だけ一覧で表示します。"
                onAction={() => goto("upload")}
              />
            ) : (
              <div className="row2">
                {analysis.smapicAdd.length ? <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-circle-plus" />付けるべき物件</div><ProgressActions tableId="t5" total={analysis.smapicAdd.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>現在</th></tr></thead><tbody>{analysis.smapicAdd.slice(0, 200).map((item) => <CheckableRow key={item.id} tableId="t5" itemKey={item.id} checked={isChecked("t5", item.id)} onChange={toggleCheck}><td className="nm">{item.name}</td><td>{item.room}</td><td>未付与</td></CheckableRow>)}</tbody></table></div></div> : null}
                {analysis.smapicRemove.length ? <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-circle-minus" />外してよい物件</div><ProgressActions tableId="t5r" total={analysis.smapicRemove.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>現在</th></tr></thead><tbody>{analysis.smapicRemove.slice(0, 200).map((item) => <CheckableRow key={item.id} tableId="t5r" itemKey={item.id} checked={isChecked("t5r", item.id)} onChange={toggleCheck}><td className="nm">{item.name}</td><td>{item.room}</td><td>付与中</td></CheckableRow>)}</tbody></table></div></div> : null}
                {!analysis.smapicAdd.length && !analysis.smapicRemove.length ? <EmptyState title="スマピクの見直し候補はありません" message="現在、追加・削除候補として表示する物件はありません。" /> : null}
              </div>
            )}
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
            <div className="decision-flow">
              <div>反響確認</div>
              <i className="ti ti-arrow-right" />
              <div>改善</div>
              <i className="ti ti-arrow-right" />
              <div>入替検討</div>
            </div>
            {!latestSnapshot ? (
              <EmptyActionPanel
                icon="ti-alert-triangle"
                title="反響が弱い物件を確認する画面です"
                message="CSVを読み込むと、問い合わせやPVが弱い物件を確認リストとして表示します。"
                onAction={() => goto("upload")}
              />
            ) : lowPvPropertyRows.length ? (
              <div className="card"><div className="card-head"><div className="card-title" style={{ color: "var(--red)" }}><i className="ti ti-alert-triangle" />入替対象物件</div><ProgressActions tableId="t6" total={analysis.lowPvRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>駅</th><th>間取</th><th>賃料+管理費</th><th>掲載日数</th><th>問合せ</th><th>競合数</th></tr></thead><tbody>{lowPvPropertyRows.slice(0, 300).map((row) => <CheckableRow key={row.key} tableId="t6" itemKey={row.key} checked={isChecked("t6", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td>{row.station}</td><td>{row.madori}</td><td className="num">{row.rent}万円</td><td className="num">{row.days}日</td><td className="num">{row.inquiry}件</td><td className="num">{row.total}件</td></CheckableRow>)}</tbody></table></div></div>
            ) : <EmptyState title="入替対象はありません" message="現在、入替対象として表示する物件はありません。" />}
          </div>

          <div className={pageClass(activePage, "optbal")}>
            <PageIntro
              title="オプション収支分析"
              description="現在の付与数・無駄候補・削減見込みをまとめ、費用対効果を説明しやすくします。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("opt")}>運用候補を見る</button>
            </PageIntro>
            {!latestSnapshot ? (
              <EmptyActionPanel
                icon="ti-coin"
                title="CSV読み込み後に削減見込みを表示します"
                message="実データがない状態では、削減見込みやオプション別の収支表は表示しません。"
                onAction={() => goto("upload")}
              />
            ) : (
              <>
                <div className="savings-banner" style={{ marginBottom: 14 }}><div className="savings-main"><div className="savings-label"><i className="ti ti-coin" /> 月額オプション節約効果</div><div className="savings-amount">{formatMoney(analysis.optionBalance.totalSaving)}<small>/月</small></div><div className="savings-sub">最適化による無駄オプションの削減額</div></div><div className="savings-detail"><div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.totalWaste}</div><div className="savings-stat-lbl">無駄オプション計</div></div><div className="savings-stat"><div className="savings-stat-val">{formatMoney(analysis.optionBalance.totalSaving * 12)}</div><div className="savings-stat-lbl">年間削減</div></div></div></div>
                <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-scale" />オプション収支分析（現在と見直し後）</div></div><div className="optbal-grid">{analysis.optionBalance.cards.map((card) => <div className="optbal-card" key={card.key}><div className="optbal-name"><i className={`ti ${card.icon}`} style={{ color: "var(--green)" }} />{card.name}</div><div className="optbal-row"><span>現在の付与</span><b>{card.current}件</b></div><div className="optbal-row"><span>見直し候補</span><b style={{ color: "var(--red)" }}>{card.waste}件</b></div><div className="optbal-row"><span>見直し後</span><b>{Math.max(0, card.current - card.waste)}件</b></div><div className="optbal-row"><span>単価</span><b>{formatMoney(card.price)}</b></div><div className={`optbal-verdict ${card.waste > 0 ? "verdict-cut" : "verdict-ok"}`}>{card.waste > 0 ? <>▼ {card.waste}件 削減推奨<br /><span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink3)" }}>月 {formatMoney(card.saving)} 節約</span></> : "適正"}</div></div>)}</div><div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6 }}>※現在の掲載・競合状況から、必要なオプション件数を確認したものです。単価は設定画面で変更できます。</div></div>
              </>
            )}
          </div>

          <div className={pageClass(activePage, "area")}>
            <PageIntro
              title="エリア配分"
              description="所属区を基準に、推奨掲載配分と現在の掲載バランスを確認します。"
            />
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-map-2" />掲載エリアマップ — <span style={{ color: "var(--green)" }}>{settings.ward}</span>基準</div></div><div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 12 }}>{latestSnapshot ? "所属区（濃紺）と、データ上反響が見込める推奨掲載区（緑）。設定画面で所属区を変更できます。" : "所属区を設定し、CSV読み込み後に掲載バランスを確認します。"}</div><div className={`area-map${latestSnapshot ? "" : " disabled"}`}>
                {WARD_GRID.map((row, r) =>
                  row.map((ward, c) => {
                    const allocation = areaAllocation.find((item) => item.ward === ward);
                    const isBaseWard = Boolean(ward) && ward === settings.ward;
                    const isRecommendedWard = Boolean(latestSnapshot) && Boolean(ward) && Boolean(allocation);
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
                            {latestSnapshot && allocation ? (
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
            {!latestSnapshot ? (
              <EmptyActionPanel
                icon="ti-map-2"
                title="所属区を設定し、CSV読み込み後に掲載バランスを確認します"
                message="実データがない状態では、推奨配分や過不足は表示しません。"
                onAction={() => goto("upload")}
                points={["設定画面で所属区を確認", "CSV読み込み後に現在の掲載件数を反映", "エリアごとの過不足を確認"]}
              />
            ) : (
              <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-pie" />推奨掲載配分と現在の掲載件数</div></div><div style={{ fontSize: 11, color: "var(--ink2)", marginBottom: 10 }}>推奨配分に対し、各区の現在の掲載件数を確認できます。<span style={{ color: "var(--red)" }}>不足</span>＝掲載を増やす余地あり／<span style={{ color: "var(--blue)" }}>多め</span>＝配分を見直す余地あり。</div><div className="tbl-wrap"><table className="tbl"><thead><tr><th>区</th><th>推奨配分</th><th>推奨件数</th><th>現掲載</th><th>過不足</th><th className="num" style={{ width: 180 }}>バランス</th><th>特性</th></tr></thead><tbody>{areaBalance.map((item) => { const status = item.statusType === "shortage" ? <span style={{ color: "var(--red)", fontWeight: 700 }}>不足 {Math.abs(item.diff)}</span> : item.statusType === "excess" ? <span style={{ color: "var(--blue)", fontWeight: 700 }}>多め +{item.diff}</span> : <span style={{ color: "var(--green)" }}>適正</span>; return <tr key={item.ward}><td className="nm" style={{ fontWeight: 700 }}>{item.ward}{item.ward === settings.ward ? <span className="tag" style={{ background: "#1e1e2e", color: "#fff", marginLeft: 4 }}>所属</span> : null}</td><td className="num">{item.pct.toFixed(1)}%</td><td className="num">{item.recommended}件</td><td className="num">{item.actual}件</td><td>{status}</td><td><div className="area-bar"><div style={{ width: `${(item.actual / item.max) * 100}%`, background: item.statusType === "shortage" ? "var(--red)" : item.statusType === "excess" ? "var(--blue)" : "var(--green)" }} /></div></td><td style={{ whiteSpace: "normal", maxWidth: 260, fontSize: 10.5, color: "var(--ink2)" }}>{item.info}</td></tr>; })}</tbody></table></div></div>
            )}
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
            <StatusNotice tone="info" icon="ti-info-circle" title="設定の反映先">
              契約枠はホームと各レポート、所属区はエリア配分、オプション単価はオプション収支に反映されます。
            </StatusNotice>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-settings" />SUUMO契約枠</div></div><div className="setting-grid"><div className="setting-card"><div className="setting-label">掲載枠数（総数）</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><input className="setting-input" type="number" value={settings.slots} min={0} onChange={(event) => setSettings((current) => ({ ...current, slots: Number(event.target.value) }))} /><span style={{ fontSize: 11, color: "var(--ink3)" }}>件</span></div></div><div className="setting-card"><div className="setting-label">スマピク上限</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><input className="setting-input" type="number" value={settings.smapicLimit} min={0} onChange={(event) => setSettings((current) => ({ ...current, smapicLimit: Number(event.target.value) }))} /><span style={{ fontSize: 11, color: "var(--ink3)" }}>件</span></div></div><div className="setting-card"><div className="setting-label">所属区（エリア配分の基準）</div><div><select className="setting-select" value={settings.ward} onChange={(event) => setSettings((current) => ({ ...current, ward: event.target.value }))}>{ALL_WARDS.map((ward) => <option key={ward} value={ward}>{ward}</option>)}</select></div></div><div className="setting-card" style={{ display: "flex", alignItems: "flex-end" }}><button type="button" className="save-btn" onClick={saveSettings}>保存して再計算</button>{savedVisible ? <span style={{ fontSize: 10, color: "#3B6D11", marginLeft: 8 }}>✓ 保存済み</span> : null}</div></div></div>
            <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-coin" />オプション単価（月額・1件あたり）</div></div><div className="setting-grid"><div className="setting-card"><div className="setting-label">スマピク</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.smapic} min={0} onChange={(event) => setPrice("smapic", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">店ピク</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.misepic} min={0} onChange={(event) => setPrice("misepic", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">パノラマ</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.panorama} min={0} onChange={(event) => setPrice("panorama", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">得意なエリア</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.area} min={0} onChange={(event) => setPrice("area", Number(event.target.value))} /></div></div><div className="setting-card"><div className="setting-label">動画</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}>¥<input className="setting-input" type="number" value={settings.prices.movie} min={0} onChange={(event) => setPrice("movie", Number(event.target.value))} /></div></div></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
