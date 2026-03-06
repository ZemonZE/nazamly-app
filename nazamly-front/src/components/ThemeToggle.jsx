import { useState, useEffect } from "react";
import "../styles/ThemeToggle.css";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("nazamly-theme") === "dark";
  });

  useEffect(() => {
    const theme = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nazamly-theme", theme);
  }, [dark]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      <span className={`theme-icon ${dark ? "hidden" : "visible"}`}>🌙</span>
      <span className={`theme-icon ${dark ? "visible" : "hidden"}`}>☀️</span>
    </button>
  );
}
