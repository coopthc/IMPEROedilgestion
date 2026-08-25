import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Gauge } from "lucide-react";

export default function CantiereAvanzamentoRiepilogo({ cantiere }) {
  const [lavorazioni, setLavorazioni] = useState([]);
  const [loading, setLoading] = useState(true);

  const modalita = cantiere.modalita_avanzamento || "manuale";
  const percentuale = cantiere.avanzamento_percentuale || 0;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const lavs = await base44.entities.Lavorazione.filter({ cantiere_id: cantiere.id });
        if (active) setLavorazioni(lavs.sort((a, b) => (a.ordine || 0) - (b.ordine || 0)));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [cantiere.id]);

  const pronosticoTotale = lavorazioni.reduce((sum, l) => sum + (l.percentuale_prevista || 0), 0);
  const effettivoPct = lavorazioni.reduce(
    (sum, l) => sum + ((l.percentuale_completata || 0) / 100) * (l.percentuale_prevista || 0),
    0
  );

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-[14px] p-5">
        <div className="h-4 w-32 bg-secondary/50 rounded animate-pulse mb-3" />
        <div className="h-3 w-full bg-secondary/50 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[14px] p-5">
      <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Avanzamento
      </h2>

      {modalita === "manuale" ? (
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold">{percentuale}%</span>
            <span className="text-xs text-muted-foreground">Modalità manuale</span>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(percentuale, 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium text-muted-foreground">Pronostico (fasi previste)</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-2xl font-bold">{pronosticoTotale}%</span>
              {pronosticoTotale > 100 && (
                <Badge className="bg-yellow-500/15 text-yellow-400 text-[10px]">
                  +{pronosticoTotale - 100}% extra
                </Badge>
              )}
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(pronosticoTotale, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs font-medium text-muted-foreground">Effettivo (completamento reale)</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-2xl font-bold">{Math.round(effettivoPct)}%</span>
              <span className="text-xs text-muted-foreground">su {pronosticoTotale}% previsto</span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${Math.min(effettivoPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}