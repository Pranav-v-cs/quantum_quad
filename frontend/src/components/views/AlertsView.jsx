import React from "react";

export default function AlertsView() {
  return (
    <section className="view" id="view-alerts">
      <section className="page-header">
        <div>
          <h1 className="page-title" data-i18n="navAlerts">Alerts</h1>
          <div className="page-sub" data-i18n="alertsPageSub">Track warning and critical events across all ponds.</div>
        </div>
      </section>
      <section className="section-card">
        <div className="section-card-head">
          <div>
            <h3 className="section-title" style={{ fontSize: "26px" }} data-i18n="recentAlerts">Recent alerts</h3>
            <div className="section-sub" data-i18n="alertsSub">Threshold and trend based events</div>
          </div>
        </div>
        <div className="alerts-list" id="alertsListPage"></div>
      </section>
    </section>
  );
}
