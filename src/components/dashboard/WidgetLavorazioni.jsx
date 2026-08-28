import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const STATO_COLOR = {
  da_fare: "bg-gray-500/15 text-gray-400",
  in_corso: "bg-yellow-500/15 text-yellow-400",
  completata: "bg-green-500/15 text-green-400",
  bloccata: "bg-red-500/15 text-red-400",
  annullata: "bg-muted/30 text-muted-foreground",
};
const STATO_LABEL = {
  da_fare: "Da fare",
  in_corso: "In corso",
  completata: "Completata",
  bloccata: "Bloccata",
  annullata: "Annullata",
};

export default function WidgetLavorazioni() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Lavorazione.list("-updated_date", 50);
        const daFare = list.filter((l) => l.stato === "da_fare").length;
        const inCorso = list.filter((l) => l.stato === "in_corso").length;
        const completate = list.filter((l) => l.stato === "completata").length;
        const bloccate = list.filter((l) => l.stato === "bloccata").length;
        const byCantiere = {};
        list.forEach((l) => {
          const cid = l.cantiere_id || "_senza";
          if (!byCantiere[cid]) byCantiere[cid] = 0;
          byCantiere[cid] += (Number(l.percentuale_completata) || 0) / 100 * (Number(l.percentuale_prevista) || 0);
        });
        const cantiereVals = Object.values(byCantiere);
        const avg = cantiereVals.length > 0 ? cantiereVals.reduce((s, v) => s + v, 0) / cantiereVals.length : 0;
        setData({ total: list.length, daFare, inCorso, completate, bloccate, avg });
        setRecent(list.slice(0, 8));
      } catch { setData({ total: 0, daFare: 0, inCorso: 0, completate: 0, bloccate: 0, avg: 0 }); setRecent([]); }
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

      {recent.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Ultime lavorazioni</p>
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {recent.map((l) => (
              <button
                key={l.id}
                onClick={() => l.cantiere_id && navigate(`/cantieri/${l.cantiere_id}?tab=avanzamento`)}
                className="w-full flex items-center gap-2 p-1.5 bg-secondary/30 rounded-lg hover:bg-secondary/60 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{l.titolo}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{l.cantiere_nome || "—"}</div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATO_COLOR[l.stato] || STATO_COLOR.da_fare}`}>
                  {STATO_LABEL[l.stato] || l.stato}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">{l.percentuale_completata || 0}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Link to="/cantieri" className="text-[11px] text-primary hover:underline mt-3 block">Vedi cantieri →</Link>
    </div>
  );
}