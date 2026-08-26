import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { HardHat, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function WidgetCollaboratori() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Collaboratore.list();
        setData({
          total: list.length,
          attivi: list.filter((c) => c.attivo !== false).length,
          capi: list.filter((c) => c.qualifica === "capo_cantiere").length,
          operai: list.filter((c) => c.qualifica === "operaio").length,
        });
      } catch { setData({ total: 0, attivi: 0, capi: 0, operai: 0 }); }
    })();
  }, []);
  if (!data) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <HardHat className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-semibold">Collaboratori</h3>
      </div>
      <div className="text-3xl font-bold">{data.attivi}<span className="text-base text-muted-foreground font-normal">/{data.total}</span></div>
      <div className="text-xs text-muted-foreground mt-1">attivi</div>
      <div className="flex gap-3 mt-3 text-xs">
        <span className="text-muted-foreground">{data.capi} capi</span>
        <span className="text-muted-foreground">{data.operai} operai</span>
      </div>
      <Link to="/collaboratori" className="text-[11px] text-primary hover:underline mt-3 block">Vedi tutti →</Link>
    </div>
  );
}