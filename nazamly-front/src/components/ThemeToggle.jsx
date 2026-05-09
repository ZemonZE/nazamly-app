import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("nazamly-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("nazamly-theme", "light");
    }
  }, [dark]);

  return (
    <button
      className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light Mode" : "Dark Mode"}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
