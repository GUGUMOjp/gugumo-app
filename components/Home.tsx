<div className={pageClass(activePage, "home")}>
{analysis.optionBalance.totalSaving > 0 && (
  <div className="savings-banner">
    <div className="savings-main">
      <div className="savings-label"><i className="ti ti-sparkles" /> GUGUMOで削減できた無駄オプション費用（月額）</div>
      <div className="savings-amount">{formatMoney(analysis.optionBalance.totalSaving)}<small>/月</small></div>
      <div className="savings-sub">無駄オプション {analysis.optionBalance.totalWaste}件を特定（年間 {formatMoney(analysis.optionBalance.totalSaving * 12)} の削減効果）</div>
    </div>
    <div className="savings-detail">
      <div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.waste.smapic}</div><div className="savings-stat-lbl">スマピク無駄</div></div>
      <div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.waste.panorama}</div><div className="savings-stat-lbl">パノラマ無駄</div></div>
      <div className="savings-stat"><div className="savings-stat-val">{analysis.optionBalance.waste.misepic}</div><div className="savings-stat-lbl">店ピク無駄</div></div>
    </div>
  </div>
)}

<div className="metrics">
  <div className="metric"><div className="metric-label">掲載物件数</div><div className="metric-value">{latestSummary ? formatNumber(latestSummary.listedRows) : "—"}</div><div className="metric-sub">件</div></div>
  <div className="metric"><div className="metric-label">総問い合わせ</div><div className="metric-value">{latestSummary ? formatNumber(latestSummary.totalInquiry) : "—"}</div><div className="metric-sub">件</div></div>
  <div className="metric"><div className="metric-label">スマピク適用</div><div className="metric-value">{latestSummary ? formatNumber(latestSummary.smapicRows) : "—"}</div><div className="metric-sub">件</div></div>
  <div className="metric danger"><div className="metric-label">入替対象</div><div className="metric-value">{analysis.lowPvRows.length || "—"}</div><div className="metric-sub">件</div></div>
</div>

<div className="row3">
  <div className="card">
    <div className="card-head"><div className="card-title"><i className="ti ti-chart-bar" />週次PV推移</div></div>
    <div className="chart-wrap"><MiniBarChart data={weekly.map((week, index) => ({ label: `W${index + 1}`, value: week.listPV }))} /></div>
  </div>
  <div className="card">
    <div className="card-head"><div className="card-title"><i className="ti ti-alert-triangle" />要対応アラート</div></div>
    {!latestSnapshot ? <div className="empty">データを読み込んでください</div> : (
      <div style={{ display: "grid", gap: 10 }}>
        <div
          className="notice"
          style={{
            background: "#FCEBEB",
            border: "1px solid #F4B8B8",
            color: "#A32D2D",
            borderRadius: 10,
            padding: "12px 14px",
            fontWeight: 700,
          }}
        >
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "#A32D2D" }} />
          <span>入替対象 {analysis.lowPvRows.length}件</span>
        </div>
        <div
          className="notice"
          style={{
            background: "#FAEEDA",
            border: "1px solid #E8C58E",
            color: "#854F0B",
            borderRadius: 10,
            padding: "12px 14px",
            fontWeight: 700,
          }}
        >
          <i className="ti ti-adjustments" style={{ fontSize: 16, color: "#854F0B" }} />
          <span>
            オプション見直し {analysis.removeAllRows.length + analysis.lowerToSecondRows.length + analysis.raiseToSecondRows.length + analysis.raiseToThirdRows.length}件
          </span>
        </div>
        <div
          className="notice"
          style={{
            background: "#E6F1FB",
            border: "1px solid #B8D8F1",
            color: "#185FA5",
            borderRadius: 10,
            padding: "12px 14px",
            fontWeight: 700,
          }}
        >
          <i className="ti ti-star" style={{ fontSize: 16, color: "#185FA5" }} />
          <span>スマピク付与推奨 {analysis.smapicAdd.length}件 / 削除推奨 {analysis.smapicRemove.length}件</span>
        </div>
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
        )) : <EmptyRow colSpan={6} text="比較用に2日分以上のCSVを読み込んでください" />}
      </tbody>
    </table>
  </div>
</div>
</div>
