"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
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
  checkDuplicateCsvUploadChecksumsAction,
  deleteExcludedCsvUploadAction,
  loadRecentCsvUploadHistoryAction,
  loadRecentCsvUploadSnapshotsAction,
  saveCsvUploadRecordsAction,
  updateCsvUploadStatusAction,
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
  parseCsv,
  splitCsvLine,
} from "@/src/server/services/csv";
import {
  buildCsvUploadRecords,
  buildUploadSnapshots,
  canShowCsvUploadActivateAction,
  canShowCsvUploadExcludeAction,
  canShowCsvUploadPermanentDeleteAction,
  getCsvUploadDuplicateDisplayKind,
  getLatestSnapshot,
  mergeCsvUploadHistoryEntries,
  type CsvUploadDuplicateMetadata,
} from "@/src/server/services/upload";
import type {
  CsvSnapshot,
} from "@/src/server/types/csv";
import type {
  CurrentWorkspaceContext,
  WorkspaceContextErrorCode,
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

type UploadHistoryStatus = "active" | "excluded";

type UploadHistoryEntry = {
  id: string;
  databaseId?: number;
  fileName: string;
  dateKey: string;
  rowCount: number;
  uploadedAt: string | null;
  status: UploadHistoryStatus;
  contentHash?: string;
  duplicateMetadata: CsvUploadDuplicateMetadata;
};

type PermanentDeleteDialogState = {
  entry: UploadHistoryEntry;
  errorMessage: string;
} | null;

type UploadHistoryMetadata = {
  id: number;
  fileName: string;
  rowCount: number;
  uploadedAt: string | null;
  companyId: string | null;
  workspaceId: string | null;
  uploadedBy: string | null;
  snapshotDate: string | null;
  checksum: string | null;
  status: UploadHistoryStatus | null;
  excludedAt: string | null;
  excludedBy: string | null;
  duplicateMetadata: CsvUploadDuplicateMetadata;
};

type UploadSnapshot = CsvSnapshot & {
  uploadHistoryId?: string;
  uploadedAt?: string | null;
};

const EMPTY_DUPLICATE_METADATA: CsvUploadDuplicateMetadata = {
  identicalContentCount: 0,
  sameFileNameCount: 1,
  hasSameNameDifferentContent: false,
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

const PAGE_DESCRIPTIONS = {
  home: "最新の分析結果と、次に確認する画面をまとめて確認できます。",
  weekly: "木曜から水曜までの反響変化を確認します。",
  monthly: "月ごとの推移を営業報告で使いやすく整理します。",
  props: "物件ごとのPV・問い合わせ・競合変化を確認します。",
  opt: "掲載状況に対するオプション運用候補を確認します。",
  smapic: "スマピクを付ける・外す候補を確認します。",
  lowpv: "反響が弱い物件の優先確認先を整理します。",
  optbal: "見直し候補と削減余地を確認します。",
  area: "所属区を基準に掲載バランスを確認します。",
  upload: "SUUMOのCSVを読み込み、分析に反映します。",
  settings: "契約枠・所属区・オプション単価を調整します。",
} satisfies Record<PageId, string>;

const ACCOUNT_SETUP_PENDING_CODES = new Set<WorkspaceContextErrorCode>([
  "PROFILE_NOT_FOUND",
]);

const ACCOUNT_SETUP_PENDING_MESSAGE = "ご登録を受け付けました。現在、GUGUMOの利用環境を設定しています。設定が完了しましたら、担当者よりご連絡します。恐れ入りますが、しばらくお待ちください。";
const ACCOUNT_CONTEXT_UNAVAILABLE_MESSAGE = "アカウント情報を取得できませんでした。再読み込みしても解消しない場合はサポートへお問い合わせください。";
const MAX_SINGLE_CSV_FILE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_CSV_FILE_BYTES = 8 * 1024 * 1024;
const CSV_REQUIRED_HEADERS = [
  "物件コード",
  "物件名",
  "物件掲載",
] as const;

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

function formatOptionBalanceDisplayCount(rawCount: number) {
  return Math.max(0, Math.round(rawCount));
}

function formatUploadDate(value: string | null) {
  if (!value) return "日時不明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDataDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return "日付不明";

  return `${year}/${month}/${day}`;
}

function buildSnapshotUploadKey(snapshot: CsvSnapshot) {
  return `${snapshot.fileName}__${snapshot.dateKey}`;
}

function getSnapshotHistoryId(snapshot: CsvSnapshot) {
  return (snapshot as UploadSnapshot).uploadHistoryId ?? buildSnapshotUploadKey(snapshot);
}

function normalizeCsvText(text: string) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  return `${Math.ceil(bytes / 1024)}KB`;
}

function validateCsvSelection(fileList: FileList | File[]) {
  const files = Array.from(fileList);

  if (!files.length) {
    return {
      ok: false as const,
      message: "CSVファイルを選択してください。",
    };
  }

  const unsupportedFiles = files.filter((file) => !file.name.toLowerCase().endsWith(".csv"));
  if (unsupportedFiles.length) {
    return {
      ok: false as const,
      message: "CSVファイルのみアップロードできます。SUUMOから出力したCSVをご確認ください。",
    };
  }

  const emptyFile = files.find((file) => file.size <= 0);
  if (emptyFile) {
    return {
      ok: false as const,
      message: `空のCSVファイルは読み込めません。ファイルをご確認ください。\n対象: ${emptyFile.name}`,
    };
  }

  const oversizedFile = files.find((file) => file.size > MAX_SINGLE_CSV_FILE_BYTES);
  if (oversizedFile) {
    return {
      ok: false as const,
      message: `ファイルサイズが大きすぎます。対象期間を分けてアップロードしてください。\n対象: ${oversizedFile.name}（${formatFileSize(oversizedFile.size)}）`,
    };
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_CSV_FILE_BYTES) {
    return {
      ok: false as const,
      message: `複数ファイルの合計サイズが大きすぎます。回数を分けてアップロードしてください。\n合計: ${formatFileSize(totalBytes)}`,
    };
  }

  return {
    ok: true as const,
    files,
  };
}

async function validateCsvFile(file: File) {
  const text = await readFileAsCsvText(file);
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      ok: false as const,
      message: `CSVに有効なデータ行がありません。\n対象: ${file.name}`,
    };
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = CSV_REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (missingHeaders.length) {
    return {
      ok: false as const,
      message: `必要な項目が確認できないため、SUUMOから出力したCSVかご確認ください。\n対象: ${file.name}`,
    };
  }

  let rows;
  try {
    rows = parseCsv(text);
  } catch {
    return {
      ok: false as const,
      message: `CSVを読み込めませんでした。ファイル形式をご確認ください。\n対象: ${file.name}`,
    };
  }

  if (!rows.length) {
    return {
      ok: false as const,
      message: `CSVに有効なデータ行がありません。\n対象: ${file.name}`,
    };
  }

  return {
    ok: true as const,
  };
}

async function readFileAsCsvText(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";

  try {
    text = new TextDecoder("shift-jis").decode(bytes);
    if (!text.includes("物件名")) text = new TextDecoder("utf-8").decode(bytes);
  } catch {
    text = new TextDecoder("utf-8").decode(bytes);
  }

  return normalizeCsvText(text);
}

async function buildCsvContentHash(file: File) {
  const text = await readFileAsCsvText(file);
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildUploadHistoryFromSnapshots(
  sourceSnapshots: UploadSnapshot[],
  metadata: UploadHistoryMetadata[],
) {
  return mergeCsvUploadHistoryEntries({
    snapshots: sourceSnapshots.map((snapshot) => ({
      id: getSnapshotHistoryId(snapshot),
      fileName: snapshot.fileName,
      dateKey: snapshot.dateKey,
      rowCount: snapshot.rows.length,
      uploadedAt: snapshot.uploadedAt ?? null,
    })),
    metadata,
    emptyDuplicateMetadata: EMPTY_DUPLICATE_METADATA,
  });
}

function duplicateBadgeLabel(metadata: CsvUploadDuplicateMetadata) {
  const kind = getCsvUploadDuplicateDisplayKind(metadata);

  if (kind === "identical") {
    return `同一内容 ${metadata.identicalContentCount}件`;
  }

  if (kind === "same-name") {
    return "同名ファイルあり";
  }

  return null;
}

function duplicateDialogText(metadata: CsvUploadDuplicateMetadata) {
  const kind = getCsvUploadDuplicateDisplayKind(metadata);

  if (kind === "identical") {
    return `同じ内容のCSVがほかに${metadata.identicalContentCount - 1}件保存されています。`;
  }

  if (kind === "same-name") {
    return "同じファイル名のCSVがほかにも保存されています。内容や日付が異なる可能性があります。";
  }

  return null;
}

function deltaCell(current: number, previous?: number) {
  if (!previous) return <span style={{ color: "var(--ink3)" }}>—</span>;
  const rate = ((current - previous) / previous) * 100;
  if (current > previous) return <span className="d-up">▲{rate.toFixed(1)}%</span>;
  if (current < previous) return <span className="d-down">▼{Math.abs(rate).toFixed(1)}%</span>;
  return <span style={{ color: "var(--ink3)" }}>±0%</span>;
}

type PeriodReport = ReturnType<typeof buildWeekly>[number];
type ForecastMetric = "listPV" | "detailPV" | "inquiry";

function periodForecastValue(period: PeriodReport | undefined, metric: ForecastMetric) {
  return period?.forecast?.[metric];
}

function periodMetricCell(period: PeriodReport, metric: ForecastMetric, forecastLabel: string) {
  const forecastValue = periodForecastValue(period, metric);

  return (
    <>
      {formatNumber(period[metric])}
      {!period.isComplete && forecastValue !== undefined ? (
        <div className="metric-note">{forecastLabel} {formatNumber(forecastValue)}</div>
      ) : null}
    </>
  );
}

function periodTrendCell(
  period: PeriodReport,
  previous: PeriodReport | undefined,
  metric: ForecastMetric,
  forecastComparisonLabel: string,
  actualComparisonLabel: string,
) {
  const forecastValue = periodForecastValue(period, metric);
  const comparisonValue = !period.isComplete && forecastValue !== undefined ? forecastValue : period[metric];
  const label = !period.isComplete && forecastValue !== undefined ? forecastComparisonLabel : actualComparisonLabel;

  return (
    <div className="trend-cell">
      <span className="trend-label">{label}</span>
      {deltaCell(comparisonValue, previous?.[metric])}
    </div>
  );
}

function periodKpiSub(
  period: PeriodReport | undefined,
  previous: PeriodReport | undefined,
  metric: ForecastMetric,
  forecastLabel: string,
  forecastComparisonLabel: string,
  actualComparisonLabel: string,
) {
  if (!period) return null;

  const forecastValue = periodForecastValue(period, metric);
  if (!period.isComplete && forecastValue !== undefined) {
    return (
      <div className="forecast-sub">
        <span>{forecastLabel} {formatNumber(forecastValue)}</span>
        <span>{forecastComparisonLabel} {deltaCell(forecastValue, previous?.[metric])}</span>
        <span>{formatDataDate(period.latestDateKey)}時点</span>
      </div>
    );
  }

  return (
    <span>{actualComparisonLabel} {deltaCell(period[metric], previous?.[metric])}</span>
  );
}

function averageCompetitionSub(
  period: PeriodReport | undefined,
  previous: PeriodReport | undefined,
  comparisonLabel: string,
) {
  if (!period) return null;

  return (
    <span>{period.isComplete ? comparisonLabel : `現在平均${comparisonLabel}`} {deltaCell(period.avgCompetition, previous?.avgCompetition)}</span>
  );
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
  onPasswordReset,
  isSubmitting = false,
  errorMessage = "",
}: {
  onLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
  onPasswordReset: (email: string) => Promise<{ ok: boolean; message: string }>;
  isSubmitting?: boolean;
  errorMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-copy-card">
          <Image className="login-brand-logo" src="/gugumo-logo.png" alt="GUGUMO" width={520} height={130} priority />
          <div className="login-kicker">SUUMO掲載最適化ツール</div>
          <h1>掲載運用の現在地と改善点がひと目でわかる</h1>
          <p>
            SUUMOのCSVを読み込むだけで、掲載状況を分析し、反響の変化や入替候補、オプションの見直しポイントをわかりやすく整理します。
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
              if (resetMode) {
                setIsResetSubmitting(true);
                const result = await onPasswordReset(email);
                setResetMessage(result.message);
                setIsResetSubmitting(false);
                return;
              }
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
            {!resetMode ? (
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
            ) : null}
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => {
                setResetMode((current) => !current);
                setResetMessage("");
              }}
            >
              {resetMode ? "ログインに戻る" : "パスワードをお忘れですか？"}
            </button>
            {resetMessage ? <div className="login-support-message">{resetMessage}</div> : null}
            {errorMessage ? <div className="login-error-message">{errorMessage}</div> : null}
            <button type="submit" className="login-submit" disabled={isSubmitting || isResetSubmitting}>
              {resetMode
                ? isResetSubmitting ? "送信中..." : "再設定メールを送信"
                : isSubmitting ? "ログイン中..." : "ログイン"}
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

function PasswordUpdateScreen({
  onUpdatePassword,
  onBackToLogin,
  isSubmitting = false,
}: {
  onUpdatePassword: (password: string) => Promise<{ ok: boolean; message: string }>;
  onBackToLogin: () => void;
  isSubmitting?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  return (
    <main className="login-page">
      <section className="login-form-card password-update-card">
        <div>
          <Image className="login-brand-logo compact" src="/gugumo-logo.png" alt="GUGUMO" width={360} height={90} priority />
          <div className="login-form-title">新しいパスワードを設定</div>
          <div className="login-form-sub">メールの案内から開いた場合のみ設定できます。</div>
        </div>
        <form
          className="login-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await onUpdatePassword(password);
            setMessage(result.message);
          }}
        >
          <label>
            <span>新しいパスワード</span>
            <input
              type="password"
              placeholder="新しいパスワード"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
              minLength={8}
              required
            />
          </label>
          {message ? <div className={message.includes("完了") ? "login-support-message" : "login-error-message"}>{message}</div> : null}
          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "パスワードを更新"}
          </button>
          <button type="button" className="forgot-password-link" onClick={onBackToLogin}>
            ログイン画面へ戻る
          </button>
        </form>
      </section>
    </main>
  );
}

function AccountSetupIncompleteScreen({
  message,
  onLogout,
}: {
  message: string;
  onLogout: () => Promise<void> | void;
}) {
  const isAccountSetupPending = message === ACCOUNT_SETUP_PENDING_MESSAGE;

  return (
    <main className="login-page">
      <section className="login-form-card account-setup-card">
        <div>
          <Image className="login-brand-logo compact" src="/gugumo-logo.png" alt="GUGUMO" width={360} height={90} priority />
          <div className="login-form-title">{isAccountSetupPending ? "GUGUMOアカウントを準備しています" : "アカウント情報を取得できません"}</div>
          <div className="login-form-sub">
            {isAccountSetupPending ? (
              <>
                ご登録を受け付けました。
                <br />
                現在、GUGUMOの利用環境を設定しています。
                <br />
                <br />
                設定が完了しましたら、担当者よりご連絡します。
                <br />
                恐れ入りますが、しばらくお待ちください。
              </>
            ) : (
              message
            )}
          </div>
        </div>
        {!isAccountSetupPending ? (
          <div className="login-support-message">
            再読み込みしても解消しない場合は、サポートへお問い合わせください。
          </div>
        ) : null}
        <div className="account-setup-actions">
          {!isAccountSetupPending ? <a className="topbar-btn" href="/support">サポートを見る</a> : null}
          <button type="button" className="topbar-btn primary" onClick={onLogout}>ログアウト</button>
        </div>
      </section>
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
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [snapshots, setSnapshots] = useState<UploadSnapshot[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const raw = localStorage.getItem("gugumo_upload_history");
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item) => ({
        ...item,
        duplicateMetadata: item.duplicateMetadata ?? EMPTY_DUPLICATE_METADATA,
      }));
    } catch {
      return [];
    }
  });
  const [excludedUploadIds, setExcludedUploadIds] = useState<string[]>([]);
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
  const [currentRole, setCurrentRole] = useState<WorkspaceRole | null>(null);
  const [currentWorkspaceContext, setCurrentWorkspaceContext] = useState<CurrentWorkspaceContext | null>(null);
  const [isLoadingWorkspaceContext, setIsLoadingWorkspaceContext] = useState(false);
  const [accountSetupMessage, setAccountSetupMessage] = useState("");
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<PermanentDeleteDialogState>(null);
  const [deletingUploadId, setDeletingUploadId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authUserId = session?.user.id ?? null;

  const resetAuthenticatedState = useCallback(() => {
    setIsRestoringCsv(false);
    setRestoreError("");
    setSnapshots([]);
    setUploadHistory([]);
    setExcludedUploadIds([]);
    setCheckedState({});
    setActivePage("home");
    setTenantHeader(TENANT_HEADER_FALLBACK);
    setCurrentRole(null);
    setCurrentWorkspaceContext(null);
    setIsLoadingWorkspaceContext(false);
    setAccountSetupMessage("");
    setPermanentDeleteDialog(null);
    setDeletingUploadId(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        if (typeof window !== "undefined") {
          setIsPasswordRecovery(new URLSearchParams(window.location.search).get("reset-password") === "1");
        }

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

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }

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
    if (!authUserId) {
      return;
    }

    let isMounted = true;

    async function loadWorkspaceContext() {
      setIsLoadingWorkspaceContext(true);

      try {
        const result = await getCurrentWorkspaceContextAction();

        if (isMounted && result.ok && result.data) {
          setTenantHeader(buildTenantHeaderDisplay(result.data));
          setCurrentRole(result.data.role);
          setCurrentWorkspaceContext(result.data);
          setAccountSetupMessage("");
        } else if (isMounted) {
          setTenantHeader(TENANT_HEADER_FALLBACK);
          setCurrentRole(null);
          setCurrentWorkspaceContext(null);
          setAccountSetupMessage(
            !result.ok && ACCOUNT_SETUP_PENDING_CODES.has(result.error.code)
              ? ACCOUNT_SETUP_PENDING_MESSAGE
              : ACCOUNT_CONTEXT_UNAVAILABLE_MESSAGE,
          );
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setTenantHeader(TENANT_HEADER_FALLBACK);
          setCurrentRole(null);
          setCurrentWorkspaceContext(null);
          setAccountSetupMessage(ACCOUNT_CONTEXT_UNAVAILABLE_MESSAGE);
        }
      } finally {
        if (isMounted) {
          setIsLoadingWorkspaceContext(false);
        }
      }
    }

    loadWorkspaceContext();

    return () => {
      isMounted = false;
    };
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId || !currentWorkspaceContext) return;

    let isMounted = true;

    async function restoreRecentCsv() {
      setIsRestoringCsv(true);

      try {
        const [result, historyResult] = await Promise.all([
          loadRecentCsvUploadSnapshotsAction(),
          loadRecentCsvUploadHistoryAction(),
        ]);

        if (!isMounted) return;

        if (result.ok) {
          setSnapshots(result.data);
          setUploadHistory(() => buildUploadHistoryFromSnapshots(
            result.data,
            historyResult.ok ? historyResult.data : [],
          ));
          setExcludedUploadIds([]);
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
  }, [authUserId, currentWorkspaceContext]);

  const refreshStoredCsvState = async () => {
    const [snapshotsResult, historyResult] = await Promise.all([
      loadRecentCsvUploadSnapshotsAction(),
      loadRecentCsvUploadHistoryAction(),
    ]);

    if (!snapshotsResult.ok) {
      return false;
    }

    setSnapshots(snapshotsResult.data);
    setUploadHistory(() => buildUploadHistoryFromSnapshots(
      snapshotsResult.data,
      historyResult.ok ? historyResult.data : [],
    ));
    setExcludedUploadIds([]);
    setRestoreError("");

    return true;
  };

  useEffect(() => {
    try {
      localStorage.setItem("gugumo_checks", JSON.stringify(checkedState));
    } catch {
      // ignore
    }
  }, [checkedState]);

  useEffect(() => {
    if (!permanentDeleteDialog) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && deletingUploadId === null) {
        setPermanentDeleteDialog(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [permanentDeleteDialog, deletingUploadId]);

  useEffect(() => {
    try {
      const persisted = uploadHistory
        .filter((item) => item.contentHash && item.status !== "excluded")
        .map((item) => ({
          ...item,
          status: "active" as const,
        }));
      localStorage.setItem("gugumo_upload_history", JSON.stringify(persisted));
    } catch {
      // ignore
    }
  }, [uploadHistory]);

  const activeSnapshots = useMemo(() => {
    const historyById = new Map(uploadHistory.map((entry) => [entry.id, entry]));
    const selectedByDate = new Map<string, UploadSnapshot>();

    snapshots.forEach((snapshot) => {
      const historyId = getSnapshotHistoryId(snapshot);
      const history = historyById.get(historyId);

      if (excludedUploadIds.includes(historyId) || history?.status === "excluded") return;

      const current = selectedByDate.get(snapshot.dateKey);
      const snapshotUploadedAt = snapshot.uploadedAt ? new Date(snapshot.uploadedAt).getTime() : 0;
      const currentUploadedAt = current?.uploadedAt ? new Date(current.uploadedAt).getTime() : 0;

      if (!current || snapshotUploadedAt >= currentUploadedAt) {
        selectedByDate.set(snapshot.dateKey, snapshot);
      }
    });

    return Array.from(selectedByDate.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [snapshots, uploadHistory, excludedUploadIds]);
  const latestSnapshot = useMemo(() => getLatestSnapshot(activeSnapshots), [activeSnapshots]);
  const latestRows = useMemo(() => latestSnapshot?.rows ?? [], [latestSnapshot]);
  const latestSummary = latestSnapshot?.summary;
  const dayDiffs = useMemo(() => buildDayDiffs(activeSnapshots), [activeSnapshots]);
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
    if (!authUserId || !currentWorkspaceContext) {
      alert("ログイン状態を確認してから、もう一度お試しください。");
      return;
    }

    setIsReadingCsv(true);
    setCheckedState({});

    try {
      const selection = validateCsvSelection(fileList);
      if (!selection.ok) {
        alert(selection.message);
        return;
      }

      const csvFiles = selection.files;

      for (const file of csvFiles) {
        const validation = await validateCsvFile(file);
        if (!validation.ok) {
          alert(validation.message);
          return;
        }
      }

      const hashItems = await Promise.all(csvFiles.map(async (file) => ({
        fileName: file.name,
        contentHash: await buildCsvContentHash(file),
      })));
      const hashByFileName = new Map(hashItems.map((item) => [item.fileName, item.contentHash]));
      const duplicateResult = await checkDuplicateCsvUploadChecksumsAction({
        checksums: hashItems.map((item) => item.contentHash),
      });

      if (duplicateResult.ok && duplicateResult.data.length) {
        const previousByChecksum = new Map(duplicateResult.data.map((item) => [item.checksum, item]));
        const duplicateItems = hashItems
          .map((item) => {
            const previous = previousByChecksum.get(item.contentHash);
            return previous ? { ...item, previous } : null;
          })
          .filter((item): item is { fileName: string; contentHash: string; previous: { checksum: string; fileName: string; uploadedAt: string | null } } => Boolean(item));
        const message = [
          "同じ内容のCSVが既にアップロードされています。",
          "",
          ...duplicateItems.flatMap((item) => [
            `今回: ${item.fileName}`,
            `前回アップロード日時: ${formatUploadDate(item.previous.uploadedAt)}`,
            `前回ファイル名: ${item.previous.fileName}`,
            "",
          ]),
          "今回選択したCSVをまとめて保存しますか？",
          "キャンセルすると、このバッチ全体を保存せずに終了します。",
        ].join("\n");

        if (!window.confirm(message)) {
          alert("重複が確認されたため、今回選択したCSVは保存していません。");
          return;
        }
      } else if (!duplicateResult.ok) {
        console.error(duplicateResult.error);
      }

      const parsed = await buildUploadSnapshots(csvFiles);
      if (parsed.length !== csvFiles.length || parsed.some((snapshot) => snapshot.rows.length === 0)) {
        alert("CSVに有効なデータ行がありません。ファイルをご確認ください。");
        return;
      }

      const uploadRecords = buildCsvUploadRecords(parsed).map((record) => ({
        ...record,
        checksum: hashByFileName.get(record.file_name) ?? null,
      }));
      const saveResult = await saveCsvUploadRecordsAction(uploadRecords);

      if (!saveResult.ok) {
        console.error(saveResult.error);
        const [restoredResult, restoredHistoryResult] = await Promise.all([
          loadRecentCsvUploadSnapshotsAction(),
          loadRecentCsvUploadHistoryAction(),
        ]);

        if (restoredResult.ok) {
          setSnapshots(restoredResult.data);
          setUploadHistory(() => buildUploadHistoryFromSnapshots(
            restoredResult.data,
            restoredHistoryResult.ok ? restoredHistoryResult.data : [],
          ));
          setExcludedUploadIds([]);
          setRestoreError("");
        }

        const savedNames = saveResult.data.savedFileNames;
        const failedNames = saveResult.error.failedFileNames;
        alert([
          savedNames.length ? "一部のCSVを保存できませんでした。保存済みのCSVは履歴に反映しています。" : "CSVの保存に失敗しました。",
          savedNames.length ? `保存済み: ${savedNames.join("、")}` : "",
          `失敗: ${failedNames.join("、")}`,
          "失敗したCSVだけ、時間をおいて再度お試しください。",
        ].filter(Boolean).join("\n"));
        return;
      }

      const [restoredResult, restoredHistoryResult] = await Promise.all([
        loadRecentCsvUploadSnapshotsAction(),
        loadRecentCsvUploadHistoryAction(),
      ]);

      if (restoredResult.ok) {
        setSnapshots(restoredResult.data);
        setUploadHistory(() => buildUploadHistoryFromSnapshots(
          restoredResult.data,
          restoredHistoryResult.ok ? restoredHistoryResult.data : [],
        ));
      } else {
        setSnapshots(parsed);
        setUploadHistory((current) => [
          ...parsed.map((snapshot): UploadHistoryEntry => {
            return {
              id: getSnapshotHistoryId(snapshot),
              fileName: snapshot.fileName,
              dateKey: snapshot.dateKey,
              rowCount: snapshot.rows.length,
              uploadedAt: new Date().toISOString(),
              status: "active",
              contentHash: hashByFileName.get(snapshot.fileName),
              duplicateMetadata: EMPTY_DUPLICATE_METADATA,
            };
          }),
          ...current,
        ]);
        setExcludedUploadIds([]);
        setRestoreError("");
        alert("CSVは保存済みですが、履歴の再取得に失敗しました。画面を再読み込みしてください。");
        return;
      }
      setExcludedUploadIds([]);
      setRestoreError("");
      goto("home");
      alert(`CSVを読み込み、分析に反映しました。\n保存済み: ${saveResult.data.savedFileNames.join("、")}`);
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

  const excludeUpload = async (entry: UploadHistoryEntry) => {
    if (currentRole !== "owner" && currentRole !== "admin") return;
    if (!entry.databaseId || !authUserId) {
      alert("保存済みCSVを確認できませんでした。画面を再読み込みしてから再度お試しください。");
      return;
    }
    if (!window.confirm("このCSVを分析対象から除外しますか？\n同じファイル名の他のCSVには影響しません。")) return;

    const result = await updateCsvUploadStatusAction({
      uploadId: entry.databaseId,
      status: "excluded",
    });

    if (!result.ok) {
      alert(result.error.message);
      return;
    }

    setUploadHistory((current) => current.map((item) => item.id === entry.id ? {
      ...item,
      status: "excluded",
    } : item));
  };

  const activateUpload = async (entry: UploadHistoryEntry) => {
    if (currentRole !== "owner" && currentRole !== "admin") return;
    if (!entry.databaseId || !authUserId) {
      alert("保存済みCSVを確認できませんでした。画面を再読み込みしてから再度お試しください。");
      return;
    }
    if (!window.confirm("このCSVを有効に戻しますか？\n最新データ日付でない場合、分析対象にはなりません。")) return;

    const result = await updateCsvUploadStatusAction({
      uploadId: entry.databaseId,
      status: "active",
    });

    if (!result.ok) {
      alert(result.error.message);
      return;
    }

    setUploadHistory((current) => current.map((item) => item.id === entry.id ? {
      ...item,
      status: "active",
    } : item));
  };

  const openPermanentDeleteDialog = (entry: UploadHistoryEntry) => {
    if (!canShowCsvUploadPermanentDeleteAction({
      role: currentRole,
      status: entry.status,
      hasDatabaseId: Boolean(entry.databaseId),
    })) return;

    setPermanentDeleteDialog({
      entry,
      errorMessage: "",
    });
  };

  const closePermanentDeleteDialog = () => {
    if (deletingUploadId !== null) return;
    setPermanentDeleteDialog(null);
  };

  const permanentlyDeleteUpload = async () => {
    const entry = permanentDeleteDialog?.entry;
    if (!entry || !entry.databaseId || !authUserId) {
      setPermanentDeleteDialog((current) => current ? {
        ...current,
        errorMessage: "保存済みCSVを確認できませんでした。画面を再読み込みしてから再度お試しください。",
      } : current);
      return;
    }

    setDeletingUploadId(entry.databaseId);
    setPermanentDeleteDialog((current) => current ? {
      ...current,
      errorMessage: "",
    } : current);

    try {
      const result = await deleteExcludedCsvUploadAction({
        uploadId: entry.databaseId,
      });

      if (!result.ok) {
        setDeletingUploadId(null);
        setPermanentDeleteDialog((current) => current ? {
          ...current,
          errorMessage: result.error.message,
        } : current);
        return;
      }

      const refreshed = await refreshStoredCsvState();

      if (!refreshed) {
        setSnapshots((current) => current.filter((snapshot) => getSnapshotHistoryId(snapshot) !== entry.id));
        setUploadHistory((current) => current.filter((item) => item.id !== entry.id));
        setExcludedUploadIds((current) => current.filter((id) => id !== entry.id));
        setRestoreError("CSVは完全削除しましたが、履歴の再取得に失敗しました。画面を再読み込みしてください。");
      }

      setDeletingUploadId(null);
      setPermanentDeleteDialog(null);
    } catch {
      setDeletingUploadId(null);
      setPermanentDeleteDialog((current) => current ? {
        ...current,
        errorMessage: "CSVの完全削除に失敗しました。",
      } : current);
    }
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
  const analysisTargetUploadId = latestSnapshot ? getSnapshotHistoryId(latestSnapshot) : null;
  const visibleUploadHistory = uploadHistory.map((entry) => ({
    ...entry,
    status: excludedUploadIds.includes(entry.id) ? "excluded" : entry.status,
    isAnalysisTarget: entry.status !== "excluded" && !excludedUploadIds.includes(entry.id) && entry.id === analysisTargetUploadId,
  }));

  const topbarStatus = isRestoringCsv
    ? "保存済みデータを確認中"
    : latestSnapshot
      ? `${activeSnapshots.length}ファイル読み込み済み / 最終更新 ${latestSnapshot.dateLabel}`
      : "データ未読み込み";
  const permanentDeleteDuplicateMessage = permanentDeleteDialog
    ? duplicateDialogText(permanentDeleteDialog.entry.duplicateMetadata)
    : null;

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

  const handlePasswordReset = async (email: string) => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return {
        ok: false,
        message: "メールアドレスを入力してください。",
      };
    }

    try {
      const redirectTo = typeof window !== "undefined"
        ? `${window.location.origin}/?reset-password=1`
        : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (error) {
        console.error(error);
        return {
          ok: false,
          message: "再設定メールを送信できませんでした。時間をおいて再度お試しください。",
        };
      }

      return {
        ok: true,
        message: "パスワード再設定メールを送信しました。メールの案内に沿って設定してください。",
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        message: "再設定メールを送信できませんでした。時間をおいて再度お試しください。",
      };
    }
  };

  const handlePasswordUpdate = async (password: string) => {
    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error(error);
        return {
          ok: false,
          message: "パスワードを更新できませんでした。メールの有効期限をご確認ください。",
        };
      }

      setIsPasswordRecovery(false);

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      return {
        ok: true,
        message: "パスワード更新が完了しました。ログインしてご利用ください。",
      };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        message: "パスワードを更新できませんでした。時間をおいて再度お試しください。",
      };
    } finally {
      setIsUpdatingPassword(false);
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

  if (isPasswordRecovery) {
    return (
      <PasswordUpdateScreen
        isSubmitting={isUpdatingPassword}
        onUpdatePassword={handlePasswordUpdate}
        onBackToLogin={async () => {
          setIsPasswordRecovery(false);
          await handleLogout();
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onPasswordReset={handlePasswordReset}
        isSubmitting={isSigningIn}
        errorMessage={loginError}
      />
    );
  }

  if (accountSetupMessage) {
    return <AccountSetupIncompleteScreen message={accountSetupMessage} onLogout={handleLogout} />;
  }

  if (isLoadingWorkspaceContext || !currentWorkspaceContext) {
    return (
      <main className="login-page">
        <div className="login-loading-card">
          <LoadingState text="アカウント情報を確認しています..." />
        </div>
      </main>
    );
  }

  const [sidebarCompanyName, sidebarWorkspaceName = ""] = tenantHeader.tenantName.split("　");
  const pageDescription = PAGE_DESCRIPTIONS[activePage];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <button type="button" className="logo-button" onClick={() => goto("home")} aria-label="GUGUMO ホームへ戻る">
            <Image className="sidebar-logo" src="/gugumo-sidebar-logo.png" alt="GUGUMO" width={815} height={234} />
          </button>
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
          <div className={navClass(activePage, SETTINGS_NAV_ITEM.id, "settings-nav-item")} onClick={() => goto(SETTINGS_NAV_ITEM.id)}>
            <i className={`ti ${SETTINGS_NAV_ITEM.icon}`} />
            <span>{SETTINGS_NAV_ITEM.label}</span>
          </div>
        </nav>
        {activePage === "home" ? (
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
        ) : null}
        <div className="sidebar-footer">
          <div className="sidebar-legal">
            <div className="sidebar-product-name">{PRODUCT_META.productName}</div>
            <div className="sidebar-legal-links">
              {LEGAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="sidebar-legal-link"
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
          <div className="topbar-copy">
            <div className="topbar-title-row">
              <span className="page-title">{PAGE_TITLES[activePage]}</span>
              <span className={`status-pill${latestSnapshot ? " loaded" : ""}`}>{topbarStatus}</span>
            </div>
            <div className="page-description">{pageDescription}</div>
          </div>
          <div className="topbar-account">
            <div className="topbar-account-text">
              <div className="topbar-account-company">{sidebarCompanyName}</div>
              {sidebarWorkspaceName ? <div className="topbar-account-workspace">{sidebarWorkspaceName}</div> : null}
            </div>
            {tenantHeader.roleLabel ? <span className="topbar-account-role">{tenantHeader.roleLabel}</span> : null}
            <button type="button" className="topbar-logout" onClick={handleLogout}>
              <i className="ti ti-logout" />
              <span>ログアウト</span>
            </button>
          </div>
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
                  <QuickLink icon="ti-scale" label="オプション分析" description="見直し余地を確認" onClick={() => goto("optbal")} />
                  <QuickLink icon="ti-upload" label="CSVアップロード" description="新しい分析を開始" onClick={() => goto("upload")} />
                </div>
                {dashboard.savings.optimization.totalImprovementAmount > 0 && (
                  <div className="savings-banner">
                    <div className="savings-main">
                      <div className="savings-label"><i className="ti ti-sparkles" /> 月額の総合改善効果</div>
                      <div className="savings-amount">{formatMoney(dashboard.savings.optimization.totalImprovementAmount)}<small>/月</small></div>
                      <div className="savings-sub">枠削減と入れ替え最適化を合わせた改善余地です。</div>
                    </div>
                    <div className="savings-detail">
                      <div className="savings-stat"><div className="savings-stat-val">{formatMoney(dashboard.savings.optimization.capacitySavingsAmount)}</div><div className="savings-stat-lbl">枠削減による削減余地 /月</div></div>
                      <div className="savings-stat"><div className="savings-stat-val">{formatMoney(dashboard.savings.optimization.replacementOptimizationAmount)}</div><div className="savings-stat-lbl">入れ替えによる最適化額 /月</div></div>
                      <div className="savings-stat"><div className="savings-stat-val">{formatMoney(dashboard.savings.optimization.totalImprovementAmount)}</div><div className="savings-stat-lbl">月額総合改善効果</div></div>
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
                  <KpiCard label="一覧PV" value={latestWeek ? formatNumber(latestWeek.listPV) : "—"} sub={periodKpiSub(latestWeek, previousWeek, "listPV", "週次予測", "予測前週比", "前週比")} />
                  <KpiCard label="詳細PV" value={latestWeek ? formatNumber(latestWeek.detailPV) : "—"} sub={periodKpiSub(latestWeek, previousWeek, "detailPV", "週次予測", "予測前週比", "前週比")} />
                  <KpiCard label="問い合わせ" value={latestWeek ? formatNumber(latestWeek.inquiry) : "—"} unit="件" sub={periodKpiSub(latestWeek, previousWeek, "inquiry", "週次予測", "予測前週比", "前週比")} />
                  <KpiCard label="平均競合数" value={latestWeek ? latestWeek.avgCompetition.toFixed(1) : "—"} unit="件" sub={averageCompetitionSub(latestWeek, previousWeek, "前週比")} />
                </div>
                <div className="row2">
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-report-analytics" />経営サマリー</div></div>
                  <div className="summary-list">
                    <div><b>対象期間</b><span>{latestWeek!.label}</span></div>
                    <div><b>一覧PV</b><span>{formatNumber(latestWeek!.listPV)} PV</span></div>
                    <div><b>問い合わせ</b><span>{formatNumber(latestWeek!.inquiry)} 件</span></div>
                    <div><b>平均競合数</b><span>{latestWeek!.avgCompetition.toFixed(1)} 件</span></div>
                    {!latestWeek!.isComplete && latestWeek!.forecast ? <div><b>予測</b><span>週次予測 {formatNumber(latestWeek!.forecast.listPV)} PV / {formatDataDate(latestWeek!.latestDateKey)}時点</span></div> : null}
                  </div>
                  </div>
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-list-check" />改善ポイント・優先確認項目</div></div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <StatusNotice tone="critical" icon="ti-alert-triangle" title={`入替対象 ${analysis.lowPvRows.length}件`}>反響が弱い物件から優先確認します。</StatusNotice>
                    <StatusNotice tone="warning" icon="ti-adjustments" title={`オプション見直し ${analysis.optionBalance.totalWaste}件`}>オプション費用を抑えられる可能性があります。</StatusNotice>
                  </div>
                  </div>
                </div>
                <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />週次PV推移（木〜水締め）</div></div><div className="chart-wrap tall"><MiniBarChart data={weekly.map((week) => ({ label: week.label, value: week.listPV }))} /></div></div>
                <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>週</th><th>期間</th><th>一覧PV</th><th>比較</th><th>詳細PV</th><th>比較</th><th>問合せ</th><th>比較</th><th>平均競合数</th></tr></thead><tbody>{weekly.map((week, index) => { const prev = weekly[index - 1]; return <tr key={week.key}><td>{index === weekly.length - 1 ? "直近週" : `第${index + 1}週`}</td><td style={{ color: "var(--ink3)", fontSize: 10 }}>{week.label}</td><td className="num">{periodMetricCell(week, "listPV", "週次予測")}</td><td>{periodTrendCell(week, prev, "listPV", "予測前週比", "前週比")}</td><td className="num">{periodMetricCell(week, "detailPV", "週次予測")}</td><td>{periodTrendCell(week, prev, "detailPV", "予測前週比", "前週比")}</td><td className="num">{periodMetricCell(week, "inquiry", "週次予測")}</td><td>{periodTrendCell(week, prev, "inquiry", "予測前週比", "前週比")}</td><td className="num">{week.avgCompetition.toFixed(1)}</td></tr>; })}</tbody></table></div></div>
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
                  <KpiCard label="一覧PV" value={latestMonth ? formatNumber(latestMonth.listPV) : "—"} sub={periodKpiSub(latestMonth, previousMonth, "listPV", "月間予測", "予測前月比", "前月比")} />
                  <KpiCard label="詳細PV" value={latestMonth ? formatNumber(latestMonth.detailPV) : "—"} sub={periodKpiSub(latestMonth, previousMonth, "detailPV", "月間予測", "予測前月比", "前月比")} />
                  <KpiCard label="問い合わせ" value={latestMonth ? formatNumber(latestMonth.inquiry) : "—"} unit="件" sub={periodKpiSub(latestMonth, previousMonth, "inquiry", "月間予測", "予測前月比", "前月比")} />
                  <KpiCard label="平均競合数" value={latestMonth ? latestMonth.avgCompetition.toFixed(1) : "—"} unit="件" sub={averageCompetitionSub(latestMonth, previousMonth, "前月比")} />
                </div>
                <div className="row2">
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-report" />月次経営サマリー</div></div>
                  <div className="summary-list">
                    <div><b>対象月</b><span>{latestMonth!.label}</span></div>
                    <div><b>一覧PV</b><span>{formatNumber(latestMonth!.listPV)} PV</span></div>
                    <div><b>問い合わせ</b><span>{formatNumber(latestMonth!.inquiry)} 件</span></div>
                    <div><b>平均競合数</b><span>{latestMonth!.avgCompetition.toFixed(1)} 件</span></div>
                    {!latestMonth!.isComplete && latestMonth!.forecast ? <div><b>予測</b><span>月間予測 {formatNumber(latestMonth!.forecast.listPV)} PV / {formatDataDate(latestMonth!.latestDateKey)}時点</span></div> : null}
                  </div>
                  </div>
                  <div className="card">
                    <div className="card-head"><div className="card-title"><i className="ti ti-flag" />優先課題</div></div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <StatusNotice tone="critical" icon="ti-alert-triangle" title={`入替対象 ${analysis.lowPvRows.length}件`}>低反響物件を入替候補として確認します。</StatusNotice>
                    <StatusNotice tone="success" icon="ti-coin" title={analysis.optionBalance.totalWaste > 0 ? `月額削減余地 ${formatMoney(analysis.optionBalance.totalSaving)}` : "オプション見直し候補なし"}>オプション運用の見直し余地を確認できます。</StatusNotice>
                  </div>
                  </div>
                </div>
                <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />月次推移</div></div><div className="chart-wrap tall"><MiniBarChart data={monthly.map((month) => ({ label: month.label, value: month.listPV }))} /></div></div>
                <div className="card"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>月</th><th>一覧PV</th><th>比較</th><th>詳細PV</th><th>比較</th><th>問合せ</th><th>比較</th><th>平均競合数</th></tr></thead><tbody>{monthly.map((month, index) => { const prev = monthly[index - 1]; return <tr key={month.key}><td>{month.label}</td><td className="num">{periodMetricCell(month, "listPV", "月間予測")}</td><td>{periodTrendCell(month, prev, "listPV", "予測前月比", "前月比")}</td><td className="num">{periodMetricCell(month, "detailPV", "月間予測")}</td><td>{periodTrendCell(month, prev, "detailPV", "予測前月比", "前月比")}</td><td className="num">{periodMetricCell(month, "inquiry", "月間予測")}</td><td>{periodTrendCell(month, prev, "inquiry", "予測前月比", "前月比")}</td><td className="num">{month.avgCompetition.toFixed(1)}</td></tr>; })}</tbody></table></div></div>
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
                      <table className="tbl property-history-table"><thead><tr><th>日付</th><th className="num">一覧PV</th><th className="num">詳細PV</th><th className="num">問い合わせ</th><th className="num">競合数</th><th>変化</th></tr></thead><tbody>{property.entries.map((entry) => <tr key={`${property.key}-${entry.dateLabel}`}><td>{entry.dateLabel}</td><td className="num">{formatNumber(entry.dListPV)}</td><td className="num">{formatNumber(entry.dDetailPV)}</td><td className="num">{formatNumber(entry.dInquiry)}</td><td className="num">{formatNumber(entry.competition)}{entry.competitionDelta !== 0 ? <span className={`competition-delta ${entry.competitionDelta > 0 ? "up" : "down"}`}>{entry.competitionDelta > 0 ? "▲" : "▼"}{Math.abs(entry.competitionDelta)}</span> : null}</td><td className="change-cell">{entry.smapicChanged ? <span className="tag tag-amber">スマピク{entry.smapicNow ? "付与" : "削除"}</span> : <span className="no-change">—</span>}</td></tr>)}</tbody></table>
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
              description="掲載状況に対して、正式な4分類でオプション運用の対象を確認できます。"
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
                message="CSVを読み込むと、正式な4分類の対象がある場合だけ一覧で表示します。"
                onAction={() => goto("upload")}
              />
            ) : (
              <>
                <div className="opt-group remove">
                  <div className="opt-group-label"><i className="ti ti-circle-minus" />オプションを外す系</div>
                  {removeAllPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">全オプションを外す（スマピク以外）</div><ProgressActions tableId="t1" total={analysis.removeAllRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{removeAllPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t1" itemKey={row.key} checked={isChecked("t1", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {lowerToSecondPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">第2基準まで落とす</div><ProgressActions tableId="t2" total={analysis.lowerToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{lowerToSecondPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t2" itemKey={row.key} checked={isChecked("t2", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {!removeAllPropertyRows.length && !lowerToSecondPropertyRows.length ? <EmptyState title="オプションを外す系はありません" message="現在、オプションを外す系として表示する物件はありません。" /> : null}
                </div>
                <div className="opt-group add">
                  <div className="opt-group-label"><i className="ti ti-circle-plus" />オプションを付ける系</div>
                  {raiseToSecondPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">第2基準に上げる</div><ProgressActions tableId="t3" total={analysis.raiseToSecondRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{raiseToSecondPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t3" itemKey={row.key} checked={isChecked("t3", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {raiseToThirdPropertyRows.length ? <div className="card"><div className="card-head"><div className="card-title">第3基準に上げる</div><ProgressActions tableId="t4" total={analysis.raiseToThirdRows.length} checkedState={checkedState} onClear={clearChecks} /></div><div className="tbl-wrap"><table className="tbl"><thead><tr><th className="col-check" /><th>物件名</th><th>部屋番号</th><th>競合数</th></tr></thead><tbody>{raiseToThirdPropertyRows.slice(0, 200).map((row) => <CheckableRow key={row.key} tableId="t4" itemKey={row.key} checked={isChecked("t4", row.key)} onChange={toggleCheck}><td className="nm">{row.name}</td><td>{row.room}</td><td className="num">{row.total}</td></CheckableRow>)}</tbody></table></div></div> : null}
                  {!raiseToSecondPropertyRows.length && !raiseToThirdPropertyRows.length ? <EmptyState title="オプションを付ける系はありません" message="現在、オプションを付ける系として表示する物件はありません。" /> : null}
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
              description="現在のオプション利用状況を分析し、削減できる費用と、より効果的なオプション配置を確認できます。"
            >
              <button type="button" className="topbar-btn" onClick={() => goto("opt")}>運用候補を見る</button>
            </PageIntro>
            {!latestSnapshot ? (
              <EmptyActionPanel
                icon="ti-coin"
                title="CSV読み込み後に削減余地を表示します"
                message="実データがない状態では、削減余地やオプション別の収支表は表示しません。"
                onAction={() => goto("upload")}
              />
            ) : (
              <>
                {analysis.optionBalance.optimization.totalImprovementAmount > 0 ? (
                  <div className="savings-banner" style={{ marginBottom: 14 }}><div className="savings-main"><div className="savings-label"><i className="ti ti-coin" /> 月額総合改善効果</div><div className="savings-amount">{formatMoney(analysis.optionBalance.optimization.totalImprovementAmount)}<small>/月</small></div><div className="savings-sub">枠削減と入れ替え最適化を分けて確認できます。</div></div><div className="savings-detail"><div className="savings-stat"><div className="savings-stat-val">{formatMoney(analysis.optionBalance.optimization.capacitySavingsAmount)}</div><div className="savings-stat-lbl">枠削減による削減余地</div></div><div className="savings-stat"><div className="savings-stat-val">{formatMoney(analysis.optionBalance.optimization.replacementOptimizationAmount)}</div><div className="savings-stat-lbl">入れ替え最適化額</div></div><div className="savings-stat"><div className="savings-stat-val">{formatMoney(analysis.optionBalance.optimization.totalImprovementAmount)}</div><div className="savings-stat-lbl">月額総合改善効果</div></div></div></div>
                ) : (
                  <StatusNotice tone="success" icon="ti-circle-check" title="オプション費用の見直し候補はありません">掲載枠数に基づく基準件数の範囲内です。</StatusNotice>
                )}
                <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-scale" />枠削減による削減余地</div></div><div className="optbal-grid">{analysis.optionBalance.cards.map((card) => <div className="optbal-card" key={card.key}><div className="optbal-name"><i className={`ti ${card.icon}`} style={{ color: "var(--green)" }} />{card.name}</div><div className="optbal-row"><span>現在の付与</span><b>{formatOptionBalanceDisplayCount(card.current)}件</b></div><div className="optbal-row"><span>推奨付与件数</span><b>{formatOptionBalanceDisplayCount(card.recommended)}件</b></div><div className="optbal-row"><span>削減対象件数</span><b style={{ color: "var(--red)" }}>{formatOptionBalanceDisplayCount(card.waste)}件</b></div><div className="optbal-row"><span>単価</span><b>{formatMoney(card.price)}</b></div><div className={`optbal-verdict ${card.waste > 0 ? "verdict-cut" : "verdict-ok"}`}>{card.waste > 0 ? <>▼ {formatOptionBalanceDisplayCount(card.waste)}件 削減余地<br /><span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink3)" }}>{formatMoney(card.saving)} /月</span></> : "基準内"}</div></div>)}</div><div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6 }}>※掲載枠数の35%を50件単位で切り上げた基準件数をもとに、スマピクは独立、その他は優先順位順に最大2カテゴリだけを維持対象として表示しています。単価は設定画面で変更できます。</div></div>
                <div className="card"><div className="card-head"><div className="card-title"><i className="ti ti-repeat" />入れ替え最適化額</div></div><div className="savings-detail" style={{ justifyContent: "flex-start", color: "var(--ink)" }}><div className="savings-stat" style={{ textAlign: "left" }}><div className="savings-stat-val">{analysis.optionBalance.optimization.removalOptimizationCount}件 / {formatMoney(analysis.optionBalance.optimization.removalOptimizationAmount)}</div><div className="savings-stat-lbl">外す最適化</div></div><div className="savings-stat" style={{ textAlign: "left" }}><div className="savings-stat-val">{analysis.optionBalance.optimization.additionOptimizationCount}件 / {formatMoney(analysis.optionBalance.optimization.additionOptimizationAmount)}</div><div className="savings-stat-lbl">付ける最適化</div></div><div className="savings-stat" style={{ textAlign: "left" }}><div className="savings-stat-val">{analysis.optionBalance.optimization.replacementOptimizationCount}件 / {formatMoney(analysis.optionBalance.optimization.replacementOptimizationAmount)}</div><div className="savings-stat-lbl">入れ替え最適化額</div></div></div><div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 8 }}>※入れ替え最適化額は、外すオプション金額と新たに付けるオプション金額を合算した改善対象額です。純節約額ではありません。</div></div>
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
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 5 }}>SUUMO掲載CSV / Shift-JIS・UTF-8 対応 / 1ファイル6MB・合計8MBまで</div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" multiple style={{ display: "none" }} onChange={handleFileInput} />
              <div className="upload-history">
                <div className="upload-history-head">
                  <div>
                    <div className="upload-history-title">アップロード履歴</div>
                    <div className="upload-history-note">除外はアップロード履歴の1行単位で保存されます。同じファイル名の他のCSVには影響しません。</div>
                  </div>
                </div>
                {visibleUploadHistory.length ? (
                  <div className="tbl-wrap">
                    <table className="tbl upload-history-table">
                      <thead>
                        <tr>
                          <th>アップロード日時</th>
                          <th>データ日付</th>
                          <th>ファイル名</th>
                          <th className="num">件数</th>
                          <th>状態</th>
                          <th className="num">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleUploadHistory.map((entry) => {
                          const statusLabel = entry.status === "excluded" ? "除外" : entry.isAnalysisTarget ? "有効（分析対象）" : "有効";
                          const statusClass = entry.status === "excluded" ? "muted" : "success";
                          const hasDatabaseId = Boolean(entry.databaseId);
                          const showExclude = canShowCsvUploadExcludeAction({
                            role: currentRole,
                            status: entry.status,
                            hasDatabaseId,
                          });
                          const showActivate = canShowCsvUploadActivateAction({
                            role: currentRole,
                            status: entry.status,
                            hasDatabaseId,
                          });
                          const showPermanentDelete = canShowCsvUploadPermanentDeleteAction({
                            role: currentRole,
                            status: entry.status,
                            hasDatabaseId,
                          });
                          const isDeletingThisUpload = entry.databaseId === deletingUploadId;
                          const duplicateKind = getCsvUploadDuplicateDisplayKind(entry.duplicateMetadata);
                          const duplicateLabel = duplicateBadgeLabel(entry.duplicateMetadata);

                          return (
                            <tr key={entry.id} className={entry.status === "excluded" ? "muted-row" : ""}>
                              <td>{formatUploadDate(entry.uploadedAt)}</td>
                              <td>{formatDataDate(entry.dateKey)}</td>
                              <td className="nm">
                                <div className="upload-file-cell">
                                  <span className="upload-file-name">{entry.fileName}</span>
                                  {duplicateLabel ? (
                                    <span
                                      className={`upload-duplicate-badge ${duplicateKind === "identical" ? "identical" : "same-name"}`}
                                    >
                                      {duplicateLabel}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="num">{entry.rowCount.toLocaleString("ja-JP")}件</td>
                              <td><span className={`upload-status ${statusClass}`}>{statusLabel}</span></td>
                              <td className="num">
                                {showExclude || showActivate || showPermanentDelete ? (
                                  <div className="upload-action-group">
                                    {showActivate ? (
                                      <button type="button" className="mini-action-btn" onClick={() => activateUpload(entry)} disabled={isDeletingThisUpload}>
                                        有効に戻す
                                      </button>
                                    ) : null}
                                    {showExclude ? (
                                      <button type="button" className="mini-action-btn" onClick={() => excludeUpload(entry)}>
                                        分析から除外
                                      </button>
                                    ) : null}
                                    {showPermanentDelete ? (
                                      <button
                                        type="button"
                                        className="mini-action-btn danger"
                                        onClick={() => openPermanentDeleteDialog(entry)}
                                        disabled={isDeletingThisUpload}
                                      >
                                        {isDeletingThisUpload ? "削除中" : "完全削除"}
                                      </button>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--ink3)", fontSize: 10 }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="アップロード履歴はまだありません" message="CSVを読み込むと、ファイル名・件数・状態をここで確認できます。" />
                )}
              </div>
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
      {permanentDeleteDialog ? (
        <div
          className="delete-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePermanentDeleteDialog();
          }}
        >
          <div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <div className="delete-dialog-icon">
              <i className="ti ti-trash" />
            </div>
            <div className="delete-dialog-body">
              <div id="delete-dialog-title" className="delete-dialog-title">このCSVデータを完全に削除しますか？</div>
              <div className="delete-dialog-text">
                「{permanentDeleteDialog.entry.fileName}」をアップロード履歴と保存データから完全に削除します。
                <br />
                この操作は取り消せません。
              </div>
              {permanentDeleteDuplicateMessage ? (
                <div className="delete-dialog-note">{permanentDeleteDuplicateMessage}</div>
              ) : null}
              {permanentDeleteDialog.errorMessage ? (
                <div className="delete-dialog-error">{permanentDeleteDialog.errorMessage}</div>
              ) : null}
              <div className="delete-dialog-actions">
                <button type="button" className="mini-action-btn" onClick={closePermanentDeleteDialog} disabled={deletingUploadId !== null}>
                  キャンセル
                </button>
                <button
                  type="button"
                  className="mini-action-btn danger solid"
                  onClick={permanentlyDeleteUpload}
                  disabled={deletingUploadId !== null}
                >
                  {deletingUploadId !== null ? "削除中" : "完全に削除する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
