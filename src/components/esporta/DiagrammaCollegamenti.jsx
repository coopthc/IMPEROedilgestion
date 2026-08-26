import React, { useMemo } from "react";
import { Building2, User, HardHat } from "lucide-react";

export default function DiagrammaCollegamenti({ cantieri, clienti, collaboratori }) {
  const rows = useMemo(() => {
    return cantieri
      .filter((c) => !c.archiviato)
      .map((c) => {
        const cliente = clienti.find((cl) => cl.id === c.cliente_id);
        const collabIds = (c.collaboratori_ids || "").split(",").filter(Boolean);
        const collabs = collabIds
          .map((id) => collaboratori.find((co) => co.id === id))
          .filter(Boolean);
        const responsabile = collaboratori.find((co) => co.id === c.responsabile_id);
        return { cantiere: c, cliente, collabs, responsabile };
      });
  }, [cantieri, clienti, collaboratori]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nessun cantiere da visualizzare.
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-x-auto pb-2">
      {rows.map(({ cantiere, cliente, collabs, responsabile }) => (
        <div
          key={cantiere.id}
          className="flex items-stretch gap-0 min-w-[700px]"
        >
          {/* Cliente */}
          <div className="w-[180px] flex-shrink-0 flex items-center">
            <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                  Cliente
                </span>
              </div>
              <div className="text-xs font-medium truncate">
                {cliente
                  ? cliente.is_azienda
                    ? cliente.azienda || cliente.nome
                    : cliente.nome
                  : "—"}
              </div>
            </div>
          </div>

          {/* Linea sinistra */}
          <div className="flex items-center flex-shrink-0">
            <div className="w-6 h-px bg-border" />
            <div className="w-2 h-2 rounded-full bg-border" />
          </div>

          {/* Cantiere (centro) */}
          <div className="w-[200px] flex-shrink-0 flex items-center">
            <div className="flex-1 bg-primary/10 border-2 border-primary/40 rounded-lg p-3 text-center">
              <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
              <div className="text-sm font-bold truncate">{cantiere.nome}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {cantiere.citta || "—"}
              </div>
              {responsabile && (
                <div className="text-[10px] text-primary mt-1 flex items-center justify-center gap-1">
                  <HardHat className="w-3 h-3" />
                  {responsabile.nome}
                </div>
              )}
            </div>
          </div>

          {/* Linea destra */}
          <div className="flex items-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-border" />
            <div className="w-6 h-px bg-border" />
          </div>

          {/* Collaboratori */}
          <div className="flex-1 flex items-center">
            {collabs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {collabs.map((c) => (
                  <div
                    key={c.id}
                    className="bg-green-500/10 border border-green-500/30 rounded-full px-2.5 py-1 flex items-center gap-1"
                  >
                    <HardHat className="w-3 h-3 text-green-400" />
                    <span className="text-[11px] font-medium">{c.nome}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground italic">
                Nessun collaboratore
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 pt-3 mt-3 border-t border-border text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/40" />
          Cliente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary/30 border border-primary/40" />
          Cantiere
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500/40" />
          Collaboratore
        </span>
      </div>
    </div>
  );
}