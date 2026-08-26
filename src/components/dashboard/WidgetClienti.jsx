import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function WidgetClienti() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Cliente.list();
        const aziende = list.filter((c) => c.is_azienda).length;
        setCount({ total: list.length, aziende, privati: list.length - aziende });
      } catch { setCount({ total: 0, aziende: 0, privati: 0 }); }
    })();
  }, []);
  if (!count) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold">Clienti</h3>
      </div>
      <div className="text-3xl font-bold">{count.total}</div>
      <div className="text-xs text-muted-foreground mt-1">clienti totali</div>
      <div className="flex gap-3 mt-3 text-xs">
        <span className="text-muted-foreground">{count.aziende} aziende</span>
        <span className="text-muted-foreground">{count.privati} privati</span>
      </div>
      <Link to="/clienti" className="text-[11px] text-primary hover:underline mt-3 block">Vedi tutti →</Link>
    </div>
  );
}