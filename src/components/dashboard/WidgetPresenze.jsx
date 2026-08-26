import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isOperaio } from "@/lib/ruoli";

export default function WidgetPresenze() {
  const { user } = useAuth();
  const operaio = isOperaio(user?.role);
  const mioCollabId = user?.collaboratore_id;
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const presenze = await base44.entities.Presenza.list();
        const oggi = new Date().toISOString().split("T")[0];
        const oggiList = presenze.filter((p) => p.data === oggi && (!operaio || !mioCollabId || p.collaboratore_id === mioCollabId));
        const oreTotali = oggiList.reduce((s, p) => s + (Number(p.ore_totali) || 0), 0);
        const straord = oggiList.reduce((s, p) => s + (Number(p.ore_straordinarie) || 0), 0);
        setData({ count: oggiList.length, oreTotali, straord });
      } catch { setData({ count: 0, oreTotali: 0, straord: 0 }); }
    })();
  }, []);
  if (!data) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold">Presenze oggi</h3>
      </div>
      <div className="text-3xl font-bold">{data.count}</div>
      <div className="text-xs text-muted-foreground mt-1">{operaio ? "presenze registrate oggi" : "collaboratori presenti"}</div>
      <div className="flex gap-3 mt-3 text-xs">
        <span className="text-muted-foreground">{data.oreTotali.toFixed(1)} ore totali</span>
        {data.straord > 0 && <span className="text-orange-500">{data.straord.toFixed(1)} str.</span>}
      </div>
      <Link to="/presenze" className="text-[11px] text-primary hover:underline mt-3 block">Vedi presenze →</Link>
    </div>
  );
}