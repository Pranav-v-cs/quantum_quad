import React from "react";
import MobileTopBar from "./MobileTopBar";
import SidebarNav from "./SidebarNav";
import Topbar from "./Topbar";
import CameraStreamModal from "./CameraStreamModal";
import DashboardView from "./views/DashboardView";
import PondsView from "./views/PondsView";
import AlertsView from "./views/AlertsView";
import ProfileView from "./views/ProfileView";

export default function AppShell() {
  return (
    <div className="app-shell" id="appShell">
      <MobileTopBar />
      <div className="mobile-overlay" id="mobileOverlay" aria-hidden="true"></div>

      <div className="shell">
        <SidebarNav />
        <div className="sidebar-resizer" id="sidebarResizer" aria-hidden="true"></div>

        <main className="content">
          <Topbar />

          <div className="page">
            <DashboardView />
            <PondsView />
            <AlertsView />
            <ProfileView />
          </div>
          <CameraStreamModal />
        </main>
      </div>
    </div>
  );
}
