import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/NotificationBell";
import VoiceCommandButton from "@/components/VoiceCommandButton";
import { applyTema, TEMA_DARK, TEMA_CHIARO } from "@/lib/tema";
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  CalendarDays,
  Download,
  Cloud,
  LogOut,
  HardHat,
  Settings,
  UserCog,
} from "lucide-react";

// Voci di navigazione — replicate dal plugin WordPress
export const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", group: "gestionale", end: true },
  { to: "/cantieri", icon: Building2, label: "Cantieri", group: "gestionale" },
  { to: "/clienti", icon: Users, label: "Clienti", group: "gestionale" },
  { to: "/agenda", icon: Calendar, label: "Agenda", group: "gestionale" },
  { to: "/collaboratori", icon: HardHat, label: "Collaboratori", group: "gestionale" },
  { to: "/presenze", icon: CalendarDays, label: "Presenze", group: "gestionale" },
  { to: "/esporta", icon: Download, label: "Esporta dati", group: "strumenti" },
  { to: "/backup-cloud", icon: Cloud, label: "Backup e Cloud", group: "strumenti" },
  { to: "/utenti", icon: UserCog, label: "Utenti", group: "strumenti", roles: ["admin"] },
  { to: "/impostazioni", icon: Settings, label: "Impostazioni", group: "strumenti" },
];

// Voci per la tab bar mobile (sottoinsieme principale)
export const MOBILE_TABS = [
  { to: "/", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/cantieri", icon: Building2, label: "Cantieri" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/clienti", icon: Users, label: "Clienti" },
  { to: "/impostazioni", icon: Settings, label: "Impost." },
];

const GROUPS = ["gestionale", "strumenti"];
const GROUP_LABELS = {
  gestionale: "Gestionale",
  strumenti: "Strumenti",
};

export default function GestionaleLayout() {
  const { user, logout } = useAuth();
  const [azienda, setAzienda] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ImpostazioneApp.list();
        if (list.length > 0) {
          setAzienda(list[0]);
          if (list[0].tema_json) {
            const tema = JSON.parse(list[0].tema_json);
            const preset = tema.mode === "light" ? TEMA_CHIARO : TEMA_DARK;
            applyTema({ ...preset, ...(tema.colors || {}) });
          }
        }
      } catch {
        /* ignora */
      }
    })();
  }, []);

  const handleLogout = () => {
    logout(false);
    window.location.href = "/login";
  };

  const logoNome = azienda?.ragione_sociale;
  const logoEmail = azienda?.email_azienda;
  const logoUrl = azienda?.logo_url;

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* Sidebar — solo desktop */}
      <aside className="hidden md:flex w-[210px] min-h-screen bg-card border-r border-border flex-col">
        {/* Logo / Azienda area */}
        <div className="px-4 pt-5 pb-4 text-center border-b border-border">
          <div className="w-[72px] h-[72px] mx-auto mb-2 rounded-full border-[3px] border-primary overflow-hidden bg-secondary flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-primary" />
            )}
          </div>
          <div className="font-bold text-sm leading-tight">{logoNome || user?.full_name || "EdilGestion"}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 break-all">{logoEmail || user?.email}</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1 opacity-60">
                {GROUP_LABELS[group]}
              </div>
              {NAV_ITEMS.filter((item) => item.group === group && (!item.roles || item.roles.includes(user?.role))).map((item) => (
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
        <div className="flex justify-end px-4 md:px-6 lg:px-8 pt-4 md:pt-5">
          <NotificationBell />
        </div>
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      <VoiceCommandButton />

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