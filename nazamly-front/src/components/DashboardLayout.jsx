import { Outlet, useOutletContext } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";
import VerificationBanner from "./VerificationBanner";

/**
 * DashboardLayout — Spline design system layout.
 * Uses SidebarProvider → AppSidebar + TopHeader + <Outlet />.
 * Passes user + setUser to all child routes via useOutletContext().
 */
export default function DashboardLayout({ user, setUser, onLogout }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopHeader user={user} />
          <VerificationBanner user={user} setUser={setUser} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet context={{ user, setUser, onLogout }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
