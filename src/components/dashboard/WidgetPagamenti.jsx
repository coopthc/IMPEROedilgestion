import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, Loader2 } from "lucide-react";

export default function WidgetPagamenti() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const pagamenti = await base44.entities.Pagamento.list();
        const nonPagati = pagamenti.filter((p) => p.stato === "non_pagato");
        const pagati = pagamenti.filter((p) => p.stato === "pagato");
        const importoAtteso = pagamenti.reduce((s, p) => s + (Number(p.importo) || 0), 0);
        const importoRicevuto = pagati.reduce((s, p) => s + (Number(p.importo) || 0), 0);
        setData({ total: pagamenti.length, nonPagati: nonPagati.length, pagati: pagati.length, importoAtteso, importoRicevuto });
      } catch { setData({ total: 0, nonPagati: 0, pagati: 0, importoAtteso: 0, importoRicevuto: 0 }); }
    })();
  }, []);
  if (!data) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-semibold">Pagamenti</h3>
      </div>
      <div className="text-3xl font-bold">€ {data.importoRicevuto.toLocaleString("it-IT")}</div>
      <div className="text-xs text-muted-foreground mt-1">incassato / € {data.importoAtteso.toLocaleString("it-IT")} atteso</div>
      <div className="flex gap-3 mt-3 text-xs">
        <span className="text-green-500">{data.pagati} pagati</span>
        <span className="text-yellow-500">{data.nonPagati} in attesa</span>
      </div>
    </div>
  );
}