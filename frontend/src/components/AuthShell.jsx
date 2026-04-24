import React from "react";
import BrandMark from "./BrandMark";

export default function AuthShell() {
  return (
    <section className="auth-shell" id="authShell">
      <div className="auth-card">
        <div className="auth-head">
          <BrandMark />
          <div>
            <div className="auth-title" data-i18n="loginTitle">Sign in</div>
            <div className="auth-sub" data-i18n="loginSub">Access your pond dashboard and live water quality updates.</div>
          </div>
        </div>

        <form className="auth-form" id="loginForm">
          <div className="auth-field">
            <label htmlFor="loginEmail" data-i18n="emailLabel">Email</label>
            <input className="auth-input" id="loginEmail" type="email" data-i18n-placeholder="emailPlaceholder" placeholder="name@example.com" required />
          </div>
          <div className="auth-field">
            <label htmlFor="loginPassword" data-i18n="passwordLabel">Password</label>
            <input className="auth-input" id="loginPassword" type="password" data-i18n-placeholder="passwordPlaceholder" placeholder="Enter password" required />
          </div>
          <button className="auth-btn" type="submit" data-i18n="signIn">Sign in</button>
        </form>
        <div className="auth-lang">
          <select className="lang-select" id="authLanguageSelect" aria-label="Select language">
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
            <option value="hi">हिन्दी</option>
            <option value="kn">ಕನ್ನಡ</option>
          </select>
        </div>
        <div className="auth-meta" data-i18n="demoHint">Use your account email and password to continue.</div>
        <div className="auth-error" id="loginError"></div>
      </div>
    </section>
  );
}
