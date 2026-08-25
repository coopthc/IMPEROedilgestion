import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  Building2,
  Users,
  Calendar,
  HardHat,
  Briefcase,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

// Saluto in base all'ora (replica mssg_get_greeting)
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

// Badge ruolo colorato (replica mssg-role-badge)
const ROLE_STYLES = {
  administrator: "bg-orange-500/15 text-orange-500",
  mssg_admin: "bg-orange-500/15 text-orange-500",
  mssg_capo: "bg-blue-500/15 text-blue-500",
  mssg_operaio: "bg-green-500/15 text-green-500",
  mssg_cliente: "bg-purple-500/15 text-purple-500",
};

const ROLE_LABELS = {
  administrator: "Admin",
  mssg_admin: "Admin",
  mssg_capo: "Capo Cantiere",
  mssg_operaio: "Operaio",
  mssg_cliente: "Cliente",
};

function getRoleLabel(role) {
  return ROLE_LABELS[role] || "Utente";
}

function getRoleStyle(role) {
  return ROLE_STYLES[role] || "bg-muted text-muted-foreground";
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    cantieri: 0,
    cantieriAttivi: 0,
    clienti: 0,
    collaboratori: 0,
    appuntamentiOggi: 0,
    presenzeOggi: 0,
  });
  const [loading, setLoading] = useState(true);
  const [appuntamenti, setAppuntamenti] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [cantieri, clienti, collaboratori, appuntamenti, presenze] = await Promise.all([
        base44.entities.Cantiere.list(),
        base44.entities.Cliente.list(),
        base44.entities.Collaboratore.list(),
        base44.entities.Appuntamento.list(),
        base44.entities.Presenza.list(),
      ]);

      const oggi = new Date().toISOString().split("T")[0];
      const cantieriAttivi = cantieri.filter((c) => c.stato === "attivo" && !c.archiviato).length;
      const appuntamentiOggi = appuntamenti.filter(
        (a) => a.data === oggi && a.stato === "programmato"
      );
      const presenzeOggi = presenze.filter((p) => p.data === oggi);

      setStats({
        cantieri: cantieri.length,
        cantieriAttivi,
        clienti: clienti.length,
        collaboratori: collaboratori.length,
        appuntamentiOggi: appuntamentiOggi.length,
        presenzeOggi: presenzeOggi.length,
      });
      setAppuntamenti(appuntamentiOggi.slice(0, 5));
    } catch (err) {
      console.error("Errore caricamento statistiche:", err);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      label: "Cantieri attivi",
      value: stats.cantieriAttivi,
      total: stats.cantieri,
      icon: Building2,
      color: "text-blue-500",
      onClick: () => navigate("/cantieri"),
    },
    {
      label: "Clienti",
      value: stats.clienti,
      icon: Users,
      color: "text-purple-500",
      onClick: () => navigate("/clienti"),
    },
    {
      label: "Collaboratori",
      value: stats.collaboratori,
      icon: HardHat,
      color: "text-green-500",
      onClick: () => navigate("/collaboratori"),
    },
    {
      label: "Appuntamenti oggi",
      value: stats.appuntamentiOggi,
      icon: Calendar,
      color: "text-primary",
      onClick: () => navigate("/agenda"),
    },
    {
      label: "Presenze oggi",
      value: stats.presenzeOggi,
      icon: Clock,
      color: "text-orange-500",
      onClick: () => navigate("/presenze"),
    },
  ];

  return (
    <div>
      {/* Header dashboard */}
      <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 flex-wrap">
            {getGreeting()}, {user?.full_name?.split(" ")[0] || "Utente"}
            <span
              className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${getRoleStyle(
                user?.role
              )}`}
            >
              {getRoleLabel(user?.role)}
            </span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Ecco una panoramica della tua attività
          </p>
        </div>
      </div>

      {/* KPI widgets */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-[10px] p-3.5 animate-pulse"
            >
              <div className="w-4 h-4 bg-muted rounded mb-2"></div>
              <div className="h-5 bg-muted rounded mb-1.5 w-2/3"></div>
              <div className="h-3 bg-muted/50 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-6">
          {kpiCards.map((kpi) => (
            <button
              key={kpi.label}
              onClick={kpi.onClick}
              className="bg-card border border-border rounded-[10px] p-3.5 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <kpi.icon className={`w-[18px] h-[18px] mb-2 opacity-60 ${kpi.color}`} />
              <div className="text-[22px] font-bold leading-none mb-1">{kpi.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Appuntamenti di oggi */}
      <div className="bg-card border border-border rounded-[14px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Appuntamenti di oggi
          </h2>
          <button
            onClick={() => navigate("/agenda")}
            className="text-xs text-primary hover:underline"
          >
            Vedi agenda →
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : appuntamenti.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun appuntamento per oggi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appuntamenti.map((app) => (
              <div
                key={app.id}
                className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border"
              >
                <div className="w-12 text-center">
                  <div className="text-sm font-bold text-primary">{app.ora}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {app.durata_minuti || 60}min
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{app.titolo}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {app.cantiere_nome ? (
                      <Link
                        to={`/cantieri/${app.cantiere_id}`}
                        className="text-primary hover:underline"
                      >
                        {app.cantiere_nome}
                      </Link>
                    ) : (
                      app.cliente_nome || "—"
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    app.tipo === "confermato"
                      ? "bg-green-500/15 text-green-500"
                      : app.tipo === "richiesta"
                      ? "bg-yellow-500/15 text-yellow-500"
                      : "bg-blue-500/15 text-blue-500"
                  }`}
                >
                  {app.tipo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}