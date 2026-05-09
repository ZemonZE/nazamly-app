import { ChevronDown, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";

export function TopHeader({ user }) {
  const name = user?.displayName || user?.fullName || "Student";
  const avatar = (name || "").trim().substring(0, 2).toUpperCase();

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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="md:hidden" />



      {/* Theme toggle */}
      <button
        onClick={() => setDark((d) => !d)}
        className="ml-auto flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* CGPA badge */}
      {user?.cgpa != null && (
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-brand-mint px-3 py-1.5 text-sm font-semibold text-foreground">
          CGPA: {user.cgpa}
        </div>
      )}

      {/* User avatar */}
      <button className="flex items-center gap-2 rounded-full px-2 py-1 text-sm hover:bg-secondary/60">
        <Avatar className="h-9 w-9 ring-2 ring-background">
          <AvatarFallback className="bg-brand-orange text-white text-sm font-semibold">{avatar}</AvatarFallback>
        </Avatar>
        <span className="hidden font-medium md:inline">{name}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 md:inline" />
      </button>
    </header>
  );
}
