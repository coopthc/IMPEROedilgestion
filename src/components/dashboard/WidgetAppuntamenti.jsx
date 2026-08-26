import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Loader2, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import AppuntamentoDetailDialog from "./AppuntamentoDetailDialog";

export default function WidgetAppuntamenti({ offset = 0, title = "Appuntamenti oggi" }) {
  const [apps, setApps] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await base44.entities.Appuntamento.list();
        const target = new Date();
        target.setDate(target.getDate() + (offset || 0));
        const targetStr = target.toISOString().split("T")[0];
        const dayApps = all
          .filter((a) => a.data === targetStr && a.stato !== "annullato")
          .sort((a, b) => (a.ora || "").localeCompare(b.ora || ""));
        setApps(dayApps);
      } catch { setApps([]); }
    })();
  }, [offset]);

  if (!apps) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Link to="/agenda" className="text-[11px] text-primary hover:underline">Agenda →</Link>
      </div>
      {apps.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4 text-center">Nessun appuntamento</p>
      ) : (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => setSelected(app)}
              className="w-full flex items-center gap-2 p-2 bg-secondary/40 rounded-lg hover:bg-secondary/70 transition-colors text-left"
            >
              <div className="text-center w-10 flex-shrink-0">
                <div className="text-xs font-bold text-primary flex items-center justify-center gap-1">
                  {app.ora}
                  {app.categoria === "personale" && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                </div>
                <div className="text-[9px] text-muted-foreground">{app.durata_minuti || 60}min</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{app.titolo}</div>
                <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                  {app.cantiere_nome ? <><MapPin className="w-2.5 h-2.5" />{app.cantiere_nome}</> : app.cliente_nome || "—"}
                </div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                app.tipo === "confermato" ? "bg-green-500/15 text-green-500" :
                app.tipo === "richiesta" ? "bg-yellow-500/15 text-yellow-500" : "bg-blue-500/15 text-blue-500"
              }`}>{app.tipo}</span>
            </button>
          ))}
        </div>
      )}
      <AppuntamentoDetailDialog app={selected} open={!!selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}