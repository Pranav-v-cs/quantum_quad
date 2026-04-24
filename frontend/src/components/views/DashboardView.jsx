import React from "react";

export default function DashboardView() {
  return (
    <section className="view active" id="view-dashboard">
      <section className="page-header">
        <div>
          <h1 className="page-title" data-i18n="pageDashboard">Dashboard</h1>
          <div className="page-sub"><span data-i18n="lastUpdated">Last updated</span>: <strong id="lastUpdated">--:--:--</strong></div>
        </div>

        <div className="header-actions">
          <button className="chip-btn" onClick={() => window.downloadCSV?.()} data-i18n="exportCSV">Export CSV</button>
          <button className="chip-btn" onClick={() => window.downloadExcel?.()} data-i18n="exportExcel">Export Excel</button>
          <button className="chip-btn primary" onClick={() => window.generateReport?.()} data-i18n="dailyReport">Daily Report</button>
        </div>
      </section>

      <section className="summary-grid" id="summaryGrid"></section>

      <section>
        <div className="section-head">
          <div>
            <h2 className="section-title" data-i18n="liveReadings">Live readings</h2>
            <div className="section-sub" id="liveReadingMeta">No pond selected</div>
          </div>
          <div className="refresh-note">
            <span className="mini-dot"></span>
            <span><span id="refreshRate">10</span><span data-i18n="secondsRefresh">s refresh</span></span>
          </div>
        </div>

        <div className="readings-grid" id="readingsGrid"></div>
      </section>

      <section className="two-col">
        <div className="section-card">
          <div className="section-card-head">
            <div>
              <h3 className="section-title" style={{ fontSize: "26px" }} data-i18n="historicalTrends">Historical trends</h3>
              <div className="section-sub" id="trendSubtitle">No data available</div>
            </div>
            <div className="range-tabs">
              <button className="range-btn" data-range="1h">1h</button>
              <button className="range-btn active" data-range="24h">24h</button>
              <button className="range-btn" data-range="7d">7d</button>
            </div>
          </div>

          <div className="chart-shell">
            <canvas id="trendChart"></canvas>
          </div>

          <div className="stats-row">
            <span>Min: <strong id="statMin">--</strong></span>
            <span>Max: <strong id="statMax">--</strong></span>
            <span>Avg: <strong id="statAvg">--</strong></span>
            <span>Trend: <strong id="statTrend">--</strong></span>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head">
            <div>
              <h3 className="section-title" style={{ fontSize: "26px" }} data-i18n="recentAlerts">Recent alerts</h3>
              <div className="section-sub" data-i18n="alertsSub">Threshold and trend based events</div>
            </div>
            <button className="chip-btn" data-i18n="alertLog">Alert log</button>
          </div>
          <div className="alerts-list" id="alertsList"></div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <div>
            <h2 className="section-title" data-i18n="pondsTitle">Ponds</h2>
            <div className="section-sub" data-i18n="pondsSub">Species-aware overview for all monitored stations</div>
          </div>
          <button className="chip-btn" onClick={() => window.addPond?.()} data-i18n="addPond">+ Add pond</button>
        </div>
        <div className="ponds-grid" id="pondsGrid"></div>
      </section>

    </section>
  );
}
