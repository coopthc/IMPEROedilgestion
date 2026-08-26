import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, Loader2 } from "lucide-react";

const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATO_COLORS = {
  in_attesa: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
  programmato: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  proposto: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  completato: "bg-green-500/15 text-green-400 border-green-500/30",
  annullato: "bg-red-500/15 text-red-400 border-red-500/30 line-through opacity-60",
};

const TIPO_DOT = {
  interno: "bg-muted-foreground",
  richiesta: "bg-yellow-500",
  confermato: "bg-green-500",
  admin_fissato: "bg-primary",
};

const CATEGORIA_PERSONALE = "bg-teal-500/15 text-teal-400 border-teal-500/40";

export default function SettimanaView({ appuntamenti, loading, onDayClick, onAppuntamentoClick }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const todayISO = toISODate(new Date());

  const appuntamentiPerGiorno = useMemo(() => {
    const map = {};
    days.forEach((d) => { map[toISODate(d)] = []; });
    appuntamenti.forEach((a) => {
      if (map[a.data]) map[a.data].push(a);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.ora || "").localeCompare(b.ora || ""))
    );
    return map;
  }, [days, appuntamenti]);

  const weekLabel = `${days[0].getDate()} ${MESI[days[0].getMonth()]} – ${days[6].getDate()} ${MESI[days[6].getMonth()]} ${days[6].getFullYear()}`;

  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday = () => setWeekStart(getMonday(new Date()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>Oggi</Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h3 className="text-sm font-semibold">{weekLabel}</h3>
      </div>

      {/* Header giorni */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === todayISO;
          return (
            <div key={iso} className={`text-center py-1.5 rounded-md ${isToday ? "bg-primary/15" : "bg-secondary/50"}`}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{GIORNI[i]}</div>
              <div className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Griglia settimana */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const iso = toISODate(d);
            const apps = appuntamentiPerGiorno[iso] || [];
            const isToday = iso === todayISO;
            const isPast = iso < todayISO;
            return (
              <div
                key={iso}
                className={`rounded-lg border md:min-h-[140px] ${isToday ? "border-primary" : "border-border"} bg-card`}
              >
                <div className="md:hidden px-3 py-2 border-b border-border flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{GIORNI[i]}</span>
                    <span className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</span>
                    {isPast && <span className="text-[9px] text-muted-foreground/60">passato</span>}
                  </div>
                  <button onClick={() => onDayClick(iso)} className="p-1 rounded-md hover:bg-secondary/70">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
                <div className="hidden md:block p-1.5">
                  {apps.length === 0 ? (
                    <button
                      onClick={() => onDayClick(iso)}
                      className="w-full h-full min-h-[120px] flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 opacity-30" />
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {apps.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => onAppuntamentoClick(a)}
                          className={`w-full text-left p-1.5 rounded border text-xs ${a.categoria === "personale" ? CATEGORIA_PERSONALE : (STATO_COLORS[a.stato] || STATO_COLORS.programmato)}`}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIPO_DOT[a.tipo] || "bg-muted-foreground"}`} />
                            {a.ora || "—"}
                          </div>
                          <div className="truncate mt-0.5">{a.titolo}</div>
                          {a.cliente_nome && (
                            <div className="truncate text-[10px] opacity-70">{a.cliente_nome}</div>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => onDayClick(iso)}
                        className="w-full text-center py-0.5 text-[10px] text-muted-foreground hover:text-primary"
                      >
                        + aggiungi
                      </button>
                    </div>
                  )}
                </div>
                {/* Mobile list */}
                <div className="md:hidden p-2 space-y-1.5">
                  {apps.length === 0 ? (
                    <button
                      onClick={() => onDayClick(iso)}
                      className="w-full text-[11px] text-muted-foreground hover:text-primary py-2 text-center"
                    >
                      + aggiungi appuntamento
                    </button>
                  ) : (
                    apps.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onAppuntamentoClick(a)}
                        className={`w-full flex items-start gap-2 p-2 rounded-md border text-left ${a.categoria === "personale" ? CATEGORIA_PERSONALE : (STATO_COLORS[a.stato] || STATO_COLORS.programmato)}`}
                      >
                        <div className="flex flex-col items-center flex-shrink-0 min-w-[34px]">
                          <span className="text-xs font-bold">{a.ora || "—"}</span>
                          <span className="text-[9px] opacity-60">{a.durata_minuti || 60}min</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{a.titolo}</div>
                          {a.cliente_nome && (
                            <div className="text-[10px] opacity-70 truncate">{a.cliente_nome}</div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mt-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> In attesa</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Programmato</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Proposto</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Completato</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Annullato</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Personale</span>
      </div>
    </div>
  );
}