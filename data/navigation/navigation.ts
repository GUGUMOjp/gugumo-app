import type { PageId } from "@/types/page";

type NavigationBadge = "weeklyCount" | "optionReviewCount" | "lowPvCount";

type NavigationItem = {
  id: PageId;
  label: string;
  icon: string;
  extraClass?: string;
  badge?: NavigationBadge;
  badgeClass?: string;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: "分析",
    items: [
      { id: "home", label: "ホーム", icon: "ti-home" },
      { id: "weekly", label: "週次レポート", icon: "ti-calendar-week", badge: "weeklyCount" },
      { id: "monthly", label: "月次レポート", icon: "ti-calendar-month" },
      { id: "props", label: "物件別推移", icon: "ti-building" },
    ],
  },
  {
    label: "最適化",
    items: [
      { id: "opt", label: "オプション管理", icon: "ti-adjustments", badge: "optionReviewCount" },
      { id: "smapic", label: "スマピク最適化", icon: "ti-star" },
      { id: "lowpv", label: "入替対象", icon: "ti-alert-triangle", extraClass: "alert", badge: "lowPvCount", badgeClass: "hot" },
    ],
  },
  {
    label: "収支・エリア",
    items: [
      { id: "optbal", label: "オプション収支", icon: "ti-coin" },
      { id: "area", label: "エリア配分", icon: "ti-map-2" },
    ],
  },
  {
    label: "データ",
    items: [
      { id: "upload", label: "CSVアップロード", icon: "ti-upload" },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavigationItem = {
  id: "settings",
  label: "設定・契約枠",
  icon: "ti-settings",
};
