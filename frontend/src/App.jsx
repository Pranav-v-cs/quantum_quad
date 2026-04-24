import React, { useEffect } from "react";
import "./dashboard.css";
import { initDashboard } from "./dashboardInit";
import AuthShell from "./components/AuthShell";
import AppShell from "./components/AppShell";

export default function App() {
  useEffect(() => {
    const cleanup = initDashboard();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <>
      <AuthShell />
      <AppShell />
    </>
  );
  // fgjhsdfjk
}
