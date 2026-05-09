import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { User, Mail, Shield, Info, LogOut, Copy, Check } from "lucide-react";

function Settings() {
  const { user, onLogout } = useOutletContext();

  const rawName = user?.fullName || user?.displayName || user?.name || "—";
  const name = rawName.trim() || "—";
  const email = user?.email || "—";
  const status = user?.accessStatus || "Unknown";
  const role = user?.role || "Student";

  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-semibold mb-6">Settings</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <User className="h-5 w-5 text-brand-teal" />
              <h3 className="font-display text-lg font-semibold">Account Information</h3>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <Avatar className="h-14 w-14 ring-2 ring-background">
                <AvatarFallback className="bg-brand-orange text-white text-lg font-bold">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{name}</p>
                <span className="inline-block rounded-full bg-brand-mint px-2.5 py-0.5 text-xs font-semibold capitalize">{role}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                  <p className="text-sm font-medium mt-0.5">{email}</p>
                </div>
                <button onClick={copyEmail} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition">
                  {copied ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Status</span>
                <p className="text-sm font-medium mt-0.5 flex items-center gap-1">
                  {status === "active" ? "✅" : "⛔"} <span className="capitalize">{status}</span>
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Role</span>
                <p className="text-sm font-medium mt-0.5 capitalize">{role}</p>
              </div>
            </div>
          </div>

          {/* Session */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">Session</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Sign out of your current session.</p>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary transition">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* About */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Info className="h-5 w-5 text-brand-teal" />
              <h3 className="font-display text-lg font-semibold">About App</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">App Name</span><span className="font-medium">Nazamly</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">1.0.0</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Support</span><a href="mailto:support@nazamly.com" className="text-brand-teal hover:underline">support@nazamly.com</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
