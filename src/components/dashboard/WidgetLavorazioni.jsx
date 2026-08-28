import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function WidgetLavorazioni() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Lavorazione.list();
        const daFare = list.filter((l) => l.stato === "da_fare").length;
        const inCorso = list.filter((l) => l.stato === "in_corso").length;
        const completate = list.filter((l) => l.stato === "completata").length;
        const bloccate = list.filter((l) => l.stato === "bloccata").length;
        // Avanzamento medio: media del completamento effettivo per cantiere
        // (stessa formula ponderata del dettaglio cantiere: somma(completata/100 * prevista) per cantiere)
        const byCantiere = {};
        list.forEach((l) => {
          const cid = l.cantiere_id || "_senza";
          if (!byCantiere[cid]) byCantiere[cid] = 0;
          byCantiere[cid] += (Number(l.percentuale_completata) || 0) / 100 * (Number(l.percentuale_prevista) || 0);
        });
        const cantiereVals = Object.values(byCantiere);
        const avg = cantiereVals.length > 0 ? cantiereVals.reduce((s, v) => s + v, 0) / cantiereVals.length : 0;
        setData({ total: list.length, daFare, inCorso, completate, bloccate, avg });
      } catch { setData({ total: 0, daFare: 0, inCorso: 0, completate: 0, bloccate: 0, avg: 0 }); }
    })();
  }, []);
  if (!data) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold">Lavorazioni</h3>
      </div>
      <div className="text-3xl font-bold">{data.avg.toFixed(0)}%</div>
      <div className="text-xs text-muted-foreground mt-1">avanzamento medio ({data.total} lavorazioni)</div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {data.daFare > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{data.daFare} da fare</span>}
        {data.inCorso > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">{data.inCorso} in corso</span>}
        {data.bloccate > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500">{data.bloccate} bloccate</span>}
        {data.completate > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-500">{data.completate} completate</span>}
      </div>
      <Link to="/cantieri" className="text-[11px] text-primary hover:underline mt-3 block">Vedi cantieri →</Link>
    </div>
  );
}