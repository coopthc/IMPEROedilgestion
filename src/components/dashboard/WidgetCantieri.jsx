import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function WidgetCantieri() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const cantieri = await base44.entities.Cantiere.list();
        setData({
          total: cantieri.length,
          attivi: cantieri.filter((c) => c.stato === "attivo" && !c.archiviato).length,
          sospesi: cantieri.filter((c) => c.stato === "sospeso").length,
          completati: cantieri.filter((c) => c.stato === "completato").length,
          bozza: cantieri.filter((c) => c.stato === "bozza").length,
        });
      } catch { setData({ total: 0, attivi: 0, sospesi: 0, completati: 0, bozza: 0 }); }
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
      <div className="flex flex-wrap gap-1.5 mt-3">
        {data.bozza > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{data.bozza} bozza</span>}
        {data.sospesi > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">{data.sospesi} sospesi</span>}
        {data.completati > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-500">{data.completati} completati</span>}
      </div>
      <Link to="/cantieri" className="text-[11px] text-primary hover:underline mt-3 block">Vedi tutti →</Link>
    </div>
  );
}