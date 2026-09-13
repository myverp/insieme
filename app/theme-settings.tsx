"use client";

import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  const sync = () => { try { document.documentElement.dataset.theme = localStorage.getItem("insieme-theme") || "system"; } catch { /* Keep the current choice. */ } notify(); };
  window.addEventListener("storage", sync);
  window.addEventListener("insieme-theme-change", notify);
  return () => { window.removeEventListener("storage", sync); window.removeEventListener("insieme-theme-change", notify); };
}
function snapshot() { return document.documentElement.dataset.theme || "system"; }

export function ThemeSettings() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "system");
  function change(value: string) {
    try { if (value === "system") localStorage.removeItem("insieme-theme"); else localStorage.setItem("insieme-theme", value); } catch { /* Apply for this page when storage is unavailable. */ }
    document.documentElement.dataset.theme = value;
    window.dispatchEvent(new Event("insieme-theme-change"));
  }
  return <div className="theme-settings"><label htmlFor="theme">Appearance</label><select id="theme" value={theme} onChange={(event) => change(event.target.value)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>;
}
