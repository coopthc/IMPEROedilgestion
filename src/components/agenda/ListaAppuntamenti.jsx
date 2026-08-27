import React, { useMemo, useState } from "react";
import { Calendar, MapPin, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const STATO_COLORS = {
  in_attesa: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
  programmato: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  proposto: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  completato: "bg-green-500/15 text-green-400 border-green-500/30",
  annullato: "bg-red-500/15 text-red-400 border-red-500/30 line-through opacity-60",
};

const CATEGORIA_PERSONALE = "bg-teal-500/15 text-teal-400 border-teal-500/40";

const STATO_LABEL = {
  in_attesa: "In attesa",
  programmato: "Programmato",
  proposto: "Proposto",
  completato: "Completato",
  annullato: "Annullato",
};

export default function ListaAppuntamenti({ appuntamenti, onAppuntamentoClick, isCliente = false, onConfermaCliente }) {
  const [filtro, setFiltro] = useState("tutti");

  const filtrati = useMemo(() => {
    let result = [...appuntamenti];
    if (filtro !== "tutti") {
      if (filtro === "personale") {
        result = result.filter((a) => a.categoria === "personale");
      } else if (filtro === "lavorativo") {
        result = result.filter((a) => a.categoria !== "personale");
      } else {
        result = result.filter((a) => a.stato === filtro);
      }
    }
    return result.sort((a, b) => {
      const dCompare = (a.data || "").localeCompare(b.data || "");
      if (dCompare !== 0) return dCompare;
      return (a.ora || "").localeCompare(b.ora || "");
    });
  }, [appuntamenti, filtro]);

  const grouped = useMemo(() => {
    const map = {};
    filtrati.forEach((a) => {
      const key = a.data || "Senza data";
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrati]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Tutti gli appuntamenti
          <span className="text-[10px] text-muted-foreground font-normal">
            ({filtrati.length})
          </span>
        </h3>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="h-8 px-2 text-xs rounded-md border border-input bg-transparent cursor-pointer"
        >
          <option value="tutti">Tutti</option>
          <optgroup label="Categoria">
            <option value="lavorativo">Lavorativo</option>
            <option value="personale">Personale</option>
          </optgroup>
          <optgroup label="Stato">
            <option value="in_attesa">In attesa</option>
            <option value="programmato">Programmato</option>
            <option value="proposto">Proposto</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
          </optgroup>
        </select>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          Nessun appuntamento
        </p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {grouped.map(([data, apps]) => (
            <div key={data}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 sticky top-0 bg-card py-1 z-10">
                {new Date(data + "T00:00").toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <div className="space-y-1.5">
                {apps.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2 p-2.5 rounded-md border text-left text-sm ${
                      a.categoria === "personale"
                        ? CATEGORIA_PERSONALE
                        : STATO_COLORS[a.stato] || STATO_COLORS.programmato
                    }`}
                  >
                    <button
                      onClick={() => onAppuntamentoClick(a)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-1.5 font-semibold flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {a.ora || "—"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.titolo}</div>
                        <div className="text-[10px] opacity-70 truncate flex items-center gap-1">
                          {a.cantiere_nome ? (
                            <>
                              <MapPin className="w-2.5 h-2.5" />
                              {a.cantiere_nome}
                            </>
                          ) : (
                            a.cliente_nome || ""
                          )}
                        </div>
                        {a.stato === "annullato" && a.motivo && (
                          <div className="text-[10px] text-red-400 truncate flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            {a.motivo}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] opacity-70 whitespace-nowrap">
                        {a.categoria === "personale"
                          ? "Personale"
                          : STATO_LABEL[a.stato] || a.stato}
                      </span>
                    </button>
                    {isCliente && a.stato === "proposto" && onConfermaCliente && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onConfermaCliente(a); }}
                        title="Conferma appuntamento"
                        className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}