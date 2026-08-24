import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  CalendarDays,
  Home,
  Download,
  Cloud,
  LogOut,
  HardHat,
} from "lucide-react";

// Voci di navigazione — replicate dal plugin WordPress
export const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", group: "gestionale", end: true },
  { to: "/cantieri", icon: Building2, label: "Cantieri", group: "gestionale" },
  { to: "/clienti", icon: Users, label: "Clienti", group: "gestionale" },
  { to: "/agenda", icon: Calendar, label: "Agenda", group: "gestionale" },
  { to: "/collaboratori", icon: HardHat, label: "Collaboratori", group: "gestionale" },
  { to: "/presenze", icon: CalendarDays, label: "Presenze", group: "gestionale" },
  { to: "/area-personale", icon: Home, label: "Area personale", group: "personale" },
  { to: "/esporta", icon: Download, label: "Esporta dati", group: "strumenti" },
  { to: "/storage", icon: Cloud, label: "Storage & Cloud", group: "strumenti" },
];

// Voci per la tab bar mobile (sottoinsieme principale)
export const MOBILE_TABS = [
  { to: "/", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/cantieri", icon: Building2, label: "Cantieri" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/clienti", icon: Users, label: "Clienti" },
  { to: "/area-personale", icon: Home, label: "Profilo" },
];

const GROUPS = ["gestionale", "personale", "strumenti"];
const GROUP_LABELS = {
  gestionale: "Gestionale",
  personale: "Personale",
  strumenti: "Strumenti",
};

export default function GestionaleLayout() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout(false);
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* Sidebar — solo desktop */}
      <aside className="hidden md:flex w-[210px] min-h-screen bg-card border-r border-border flex-col">
        {/* Avatar area */}
        <div className="px-4 pt-5 pb-4 text-center border-b border-border">
          <div className="w-[72px] h-[72px] mx-auto mb-2 rounded-full border-[3px] border-primary overflow-hidden bg-secondary flex items-center justify-center">
            {user?.full_name ? (
              <span className="text-xl font-bold text-primary">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Users className="w-8 h-8 text-primary" />
            )}
          </div>
          <div className="font-bold text-sm leading-tight">{user?.full_name || "Utente"}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 break-all">{user?.email}</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1 opacity-60">
                {GROUP_LABELS[group]}
              </div>
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-secondary text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Esci</span>
          </button>
        </div>
      </aside>

      {/* Main content — singolo Outlet, padding responsive */}
      <main className="flex-1 min-h-screen overflow-x-hidden pb-[70px] md:pb-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Tab bar mobile — fixed bottom, solo mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around items-center h-[62px] px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        {MOBILE_TABS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] leading-none transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground/60"
              }`
            }
          >
            <item.icon className="w-[22px] h-[22px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}