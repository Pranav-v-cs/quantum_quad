import React from "react";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="live-badge">
        <span className="live-dot-wrap"><span className="live-dot"></span></span>
        <span data-i18n="liveReadings">Live Readings</span>
      </div>

      <div className="topbar-actions">
        <select className="lang-select" id="languageSelect" aria-label="Select language">
          <option value="en">English</option>
          <option value="ta">தமிழ்</option>
          <option value="hi">हिन्दी</option>
          <option value="kn">ಕನ್ನಡ</option>
        </select>
        <button className="chip-btn" id="logoutBtn" data-i18n="logout">Logout</button>

        <div className="profile">
          <div className="profile-text">
            <div className="profile-name" id="topProfileName">Demo Farmer</div>
            <div className="profile-email" id="topProfileEmail">farmer@quantumquad.com</div>
          </div>
          <div className="avatar">D</div>
        </div>
      </div>
    </header>
  );
}
