import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2, Bell } from "lucide-react";
import { Link } from "react-router-dom";

export default function WidgetCantieri() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const [cantieri, aggiornamenti] = await Promise.all([
          base44.entities.Cantiere.list(),
          base44.entities.Aggiornamento.list("-created_date", 5),
        ]);
        setData({
          total: cantieri.length,
          attivi: cantieri.filter((c) => c.stato === "attivo" && !c.archiviato).length,
          sospesi: cantieri.filter((c) => c.stato === "sospeso").length,
          completati: cantieri.filter((c) => c.stato === "completato").length,
          bozza: cantieri.filter((c) => c.stato === "bozza").length,
          ultimiMov: aggiornamenti.slice(0, 2),
        });
      } catch { setData({ total: 0, attivi: 0, sospesi: 0, completati: 0, bozza: 0, ultimiMov: [] }); }
    })();
  }, []);
  if (!data) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold">Cantieri</h3>
      </div>
      <div className="text-3xl font-bold">{data.attivi}<span className="text-base text-muted-foreground font-normal">/{data.total}</span></div>
      <div className="text-xs text-muted-foreground mt-1">cantieri attivi</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {data.bozza > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{data.bozza} bozza</span>}
        {data.sospesi > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">{data.sospesi} sospesi</span>}
        {data.completati > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-500">{data.completati} completati</span>}
      </div>
      {data.ultimiMov.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Bell className="w-3 h-3" /> Ultimi movimenti
          </div>
          <div className="space-y-1">
            {data.ultimiMov.map((a) => (
              <div key={a.id} className="text-[11px] flex items-start gap-1.5">
                <span className="text-muted-foreground flex-shrink-0">{new Date(a.created_date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}</span>
                <div className="min-w-0">
                  <span className="font-medium truncate">{a.titolo}</span>
                  {a.cantiere_nome && <span className="text-muted-foreground"> · {a.cantiere_nome}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link to="/cantieri" className="text-[11px] text-primary hover:underline mt-3 block">Vedi tutti →</Link>
    </div>
  );
}