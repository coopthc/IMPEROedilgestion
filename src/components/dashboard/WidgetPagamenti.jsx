import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, Loader2 } from "lucide-react";

export default function WidgetPagamenti() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const pagamenti = await base44.entities.Pagamento.list();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        const incassatoMese = pagamenti
          .filter((p) => p.stato === "pagato" && p.data_pagamento && p.data_pagamento >= startOfMonth && p.data_pagamento <= endOfMonth)
          .reduce((s, p) => s + (Number(p.importo) || 0), 0);

        const daIncassareMese = pagamenti
          .filter((p) => p.stato === "non_pagato" && p.data_scadenza && p.data_scadenza >= startOfMonth && p.data_scadenza <= endOfMonth)
          .reduce((s, p) => s + (Number(p.importo) || 0), 0);

        const countMese = pagamenti.filter((p) =>
          (p.data_pagamento && p.data_pagamento >= startOfMonth && p.data_pagamento <= endOfMonth) ||
          (p.data_scadenza && p.data_scadenza >= startOfMonth && p.data_scadenza <= endOfMonth)
        ).length;

        setData({ incassatoMese, daIncassareMese, countMese, mese: now.toLocaleDateString("it-IT", { month: "long" }) });
      } catch { setData({ incassatoMese: 0, daIncassareMese: 0, countMese: 0, mese: "" }); }
    })();
  }, []);
  if (!data) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-semibold">Pagamenti</h3>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Questo mese ({data.mese})</div>
      <div className="text-2xl font-bold text-green-500">€ {data.incassatoMese.toLocaleString("it-IT")}</div>
      <div className="text-xs text-muted-foreground mt-0.5">incassato</div>
      <div className="flex items-center gap-2 mt-2 text-xs">
        <span className="text-yellow-500">€ {data.daIncassareMese.toLocaleString("it-IT")} da incassare</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{data.countMese} movimenti questo mese</div>
    </div>
  );
}