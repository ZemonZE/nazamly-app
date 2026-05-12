import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Calculator, Target, BookOpen, HelpCircle, CalendarDays,
  Code2, User, Settings as SettingsIcon, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import logo from "../assets/logo.jpg";

const items = [
  { title: "Dashboard",      url: "/dashboard",                icon: Home },
  { title: "GPA Calculator", url: "/dashboard/gpa-calculator", icon: Calculator },
  { title: "GPA Planner",    url: "/dashboard/gpa-planner",    icon: Target },
  { title: "Materials",      url: "/dashboard/materials",      icon: BookOpen },
  { title: "Questions",      url: "/dashboard/questions",      icon: HelpCircle },
  { title: "Schedule",       url: "/dashboard/generator",      icon: CalendarDays },
  { title: "Coding",         url: "/dashboard/coding",         icon: Code2 },
  { title: "Profile",        url: "/dashboard/profile",        icon: User },
  { title: "Settings",       url: "/dashboard/settings",       icon: SettingsIcon },
];

export function AppSidebar({ onLogout }) {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const pathname = location.pathname;

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo + brand */}
      <SidebarHeader className="py-5">
        <NavLink to="/dashboard" className="flex items-center gap-2 px-2" onClick={handleNavClick}>
          <img src={logo} alt="Nazamly" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
          {!collapsed && (
            <span className="font-display text-lg font-semibold tracking-tight">Nazamly</span>
          )}
        </NavLink>
      </SidebarHeader>

      {/* Navigation items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink to={item.url} className="flex items-center gap-3" onClick={handleNavClick}>
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: collapse toggle + logout */}
      <SidebarFooter className="pb-4 space-y-1">
        <SidebarMenu>
          {/* Collapse / Expand toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={collapsed ? "Expand" : "Collapse"}
              onClick={toggleSidebar}
              className="hidden md:flex"
            >
              {collapsed
                ? <ChevronRight className="h-5 w-5" />
                : <ChevronLeft className="h-5 w-5" />
              }
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Logout */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              onClick={() => {
                onLogout();
                handleNavClick();
              }}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
