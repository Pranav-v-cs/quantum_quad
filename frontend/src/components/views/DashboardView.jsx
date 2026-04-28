import React from "react";

export default function DashboardView() {
  return (
    <section className="view active" id="view-dashboard">
      <div className="toast-stack" id="toastStack"></div>
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
        <div className="left-col-stack">
          <div className="section-card">
            <div className="section-card-head">
              <div>
                <h3 className="section-title" style={{ fontSize: "26px" }} data-i18n="historicalTrends">Historical trends</h3>
                <div className="section-sub" id="trendSubtitle">No data available</div>
              </div>
              <div className="trend-controls">
                <div className="prediction-control trend-metric-control">
                  <label htmlFor="trendMetricSelect">Metric</label>
                  <select id="trendMetricSelect"></select>
                </div>
                <div className="range-tabs">
                <button className="range-btn" data-range="1h">1h</button>
                <button className="range-btn active" data-range="24h">24h</button>
                <button className="range-btn" data-range="7d">7d</button>
                </div>
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

          <div className="section-card proximity-panel-card">
            <div className="trend-context">
              <div className="proximity-card">
                <div className="proximity-head">
                  <span>Threshold proximity</span>
                  <strong id="proximityLabel">--</strong>
                </div>
                <div className="proximity-scale">
                  <span id="proximityMin">--</span>
                  <div className="proximity-track">
                    <div id="proximityMarker" className="proximity-marker"></div>
                  </div>
                  <span id="proximityMax">--</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-col-stack">
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

          <div className="section-card threshold-panel-card">
            <div className="threshold-config">
              <div className="threshold-config-head">
                <strong>Threshold settings</strong>
                <label className="threshold-toggle">
                  <input type="checkbox" id="thresholdOverrideToggle" />
                  <span>Use custom thresholds</span>
                </label>
              </div>
              <div className="thresholds-grid" id="thresholdsGrid"></div>
              <div className="threshold-actions">
                <button className="chip-btn" id="saveThresholdsBtn" type="button">Save thresholds</button>
                <button className="chip-btn" id="resetThresholdsBtn" type="button">Reset defaults</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="predictions-section">
        <div className="section-card">
          <div className="section-card-head">
            <div>
              <h3 className="section-title" style={{ fontSize: "26px" }} data-i18n="predictionsTitle">Predictions</h3>
              <div className="section-sub" id="predictionsMeta" data-i18n="predictionsSub">Forecast generated from historical sensor data</div>
            </div>
            <div className="predictions-controls">
              <div className="prediction-control">
                <label htmlFor="predictionTargetSelect" data-i18n="predictionTargetLabel">Predict metric</label>
                <select id="predictionTargetSelect"></select>
              </div>
              <div className="prediction-control">
                <label htmlFor="predictionHorizonSelect" data-i18n="predictionHorizonLabel">Forecast points</label>
                <select id="predictionHorizonSelect"></select>
              </div>
              <div className="prediction-control">
                <label htmlFor="predictionHistorySelect" data-i18n="predictionHistoryLabel">Past points</label>
                <select id="predictionHistorySelect"></select>
              </div>
            </div>
          </div>

          <div className="chart-shell">
            <canvas id="predictionsChart"></canvas>
          </div>

          <div className="predictions-grid" id="predictionsStats">
            <div className="prediction-stat">
              <span className="k" data-i18n="predictionsSelected">Selected value</span>
              <strong id="predStatSelected">--</strong>
            </div>
            <div className="prediction-stat">
              <span className="k" data-i18n="min">Min</span>
              <strong id="predStatMin">--</strong>
            </div>
            <div className="prediction-stat">
              <span className="k" data-i18n="max">Max</span>
              <strong id="predStatMax">--</strong>
            </div>
            <div className="prediction-stat">
              <span className="k" data-i18n="avg">Avg</span>
              <strong id="predStatAvg">--</strong>
            </div>
            <div className="prediction-stat">
              <span className="k" data-i18n="predictionsAnomalies">Anomalies</span>
              <strong id="predStatAnomalies">--</strong>
            </div>
          </div>
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
