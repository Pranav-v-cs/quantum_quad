import React from "react";

export default function CameraStreamModal() {
  return (
    <div className="camera-modal" id="cameraModal" aria-hidden="true">
      <div className="camera-modal-backdrop" id="cameraModalBackdrop"></div>
      <section className="camera-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cameraModalTitle">
        <header className="camera-modal-head">
          <div>
            <h3 id="cameraModalTitle">Live Pond Camera</h3>
            <p id="cameraModalMeta">Waiting for stream...</p>
          </div>
          <button type="button" className="camera-close-btn" id="cameraModalClose" aria-label="Close camera stream">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12"></path>
              <path d="M18 6L6 18"></path>
            </svg>
          </button>
        </header>

        <div className="camera-modal-body" id="cameraModalBody">
          <img id="cameraStreamImage" alt="Live pond stream" loading="lazy" />
          <div className="camera-stream-fallback" id="cameraStreamFallback">
            Stream unavailable. Check ESP32-CAM power, Wi-Fi, and stream URL.
          </div>
        </div>
      </section>
    </div>
  );
}
