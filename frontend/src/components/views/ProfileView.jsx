import React from "react";

export default function ProfileView() {
  return (
    <section className="view" id="view-profile">
      <section className="page-header">
        <div>
          <h1 className="page-title" data-i18n="navProfile">Profile</h1>
          <div className="page-sub" data-i18n="profilePageSub">Farmer profile, preferences, language and reporting setup.</div>
        </div>
      </section>
      <section className="profile-grid">
        <div className="section-card">
          <div className="profile-hero">
            <div className="avatar">-</div>
            <div>
              <div className="profile-name" id="profilePageName">-</div>
              <div className="profile-email" id="profilePageEmail">-</div>
            </div>
          </div>
          <div className="profile-list">
            <div className="profile-item">
              <div className="k" data-i18n="preferredLanguage">Preferred language</div>
              <div className="v" id="profileLanguage">English</div>
            </div>
            <div className="profile-item">
              <div className="k" data-i18n="reportPreference">Report preference</div>
              <div className="v" data-i18n="dailyPdfEmail">Daily PDF and email alerts</div>
            </div>
            <div className="profile-item">
              <div className="k" data-i18n="farmLocation">Farm location</div>
              <div className="v" id="profileFarmLocation">-</div>
            </div>
          </div>
        </div>
        <div className="section-card">
          <div className="section-card-head">
            <div>
              <h3 className="section-title" style={{ fontSize: "26px" }} data-i18n="profileSettings">Profile settings</h3>
              <div className="section-sub" data-i18n="profileSettingsSub">Change language and review your current monitoring preferences.</div>
            </div>
          </div>
          <div className="profile-list">
            <div className="profile-item">
              <div className="k" data-i18n="activeStations">Active stations</div>
              <div className="v" id="profileActiveStations">0</div>
            </div>
            <div className="profile-item">
              <div className="k" data-i18n="alertMode">Alert mode</div>
              <div className="v" data-i18n="smsEmailPush">SMS, email, and push notifications</div>
            </div>
            <div className="profile-item">
              <div className="k" data-i18n="selectedSpecies">Selected species</div>
              <div className="v" id="profileSelectedSpecies">-</div>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
