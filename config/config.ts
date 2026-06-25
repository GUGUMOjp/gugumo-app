// GUGUMO 全体設定

export const GUGUMO_CONFIG = {
    // オプション判定
    DETAIL_PV_REMOVE: 0.15,
    DETAIL_PV_RECOMMEND: 0.5,
    DETAIL_PV_PRIORITY: 1.0,
  
    // 新着・長期判定
    NEW_PROPERTY_DAYS: 14,
    LONG_PROPERTY_DAYS: 7,
  
    // 推奨件数
    SMARTPIC_RATE: 0.4,
    OTHER_OPTION_RATE: 0.35,
  } as const;