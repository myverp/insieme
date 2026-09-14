"use client";

export function ThemeToggle() {
  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === "dark"
      || (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("insieme-theme", theme); } catch { /* The theme still works when storage is unavailable. */ }
  }

  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Switch color theme"><span className="theme-to-dark">Dark theme</span><span className="theme-to-light">Light theme</span></button>;
}
