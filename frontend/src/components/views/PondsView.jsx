import React from "react";

export default function PondsView() {
  return (
    <section className="view" id="view-ponds">
      <section className="page-header">
        <div>
          <h1 className="page-title" data-i18n="pondsTitle">Ponds</h1>
          <div className="page-sub" data-i18n="pondsPageSub">Overview of all monitored ponds and station details.</div>
        </div>
      </section>
      <section className="section-card">
        <div className="section-card-head">
          <div>
            <h3 className="section-title" style={{ fontSize: "26px" }} data-i18n="pondsTitle">Ponds</h3>
            <div className="section-sub" data-i18n="pondsSub">Species-aware overview for all monitored stations</div>
          </div>
        </div>
        <div className="ponds-grid" id="pondsGridPage"></div>
      </section>
    </section>
  );
}
