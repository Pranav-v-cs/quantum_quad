import React from "react";
import BrandMark from "./BrandMark";

export default function SidebarNav() {
  return (
    <aside className="sidebar" id="mobileSidebar">
      <div className="sidebar-brand">
        <BrandMark />
        <div>
          <div className="brand-title">QuantumQuad</div>
          <div className="brand-sub">Real-Time Aquaculture Monitoring</div>
        </div>
      </div>

      <nav className="nav">
        <button className="nav-btn active" data-view="dashboard">
          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>
          <span data-i18n="navDashboard">Dashboard</span>
        </button>
        <button className="nav-btn" data-view="ponds">
          <svg viewBox="0 0 24 24"><path d="M6 18c0-2.2 1.8-4 4-4"></path><path d="M18 18c0-3.3-2.7-6-6-6"></path><path d="M6 7h.01"></path><path d="M10 10c1.7 0 3-1.3 3-3"></path><path d="M18 7c0 2.8-2.2 5-5 5"></path><path d="M16 16c1.1 0 2-.9 2-2"></path></svg>
          <span data-i18n="navPonds">Ponds</span>
        </button>
        <button className="nav-btn" data-view="alerts">
          <svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v2.2c0 .7-.2 1.4-.6 2l-1.2 1.8A1.5 1.5 0 0 0 7.5 15h9a1.5 1.5 0 0 0 1.3-2.3l-1.2-1.8a3.7 3.7 0 0 1-.6-2V7a4 4 0 0 0-4-4Z"></path><path d="M10 19a2 2 0 0 0 4 0"></path></svg>
          <span data-i18n="navAlerts">Alerts</span>
        </button>
        <button className="nav-btn" data-view="profile">
          <svg viewBox="0 0 24 24"><path d="M18 21a6 6 0 0 0-12 0"></path><circle cx="12" cy="8" r="4"></circle></svg>
          <span data-i18n="navProfile">Profile</span>
        </button>
      </nav>
    </aside>
  );
}
