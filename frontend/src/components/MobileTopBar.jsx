import React from "react";
import BrandMark from "./BrandMark";

export default function MobileTopBar() {
  return (
    <div className="mobile-top">
      <div className="mobile-brand">
        <BrandMark />
        <div className="mobile-brand-name">QuantumQuad</div>
      </div>
      <button
        className="chip-btn"
        id="mobileMenuBtn"
        type="button"
        aria-label="Open navigation menu"
        aria-controls="mobileSidebar"
        aria-expanded="false"
      >
        Menu
      </button>
    </div>
  );
}
