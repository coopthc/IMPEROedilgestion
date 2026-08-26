import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Loader2, MapPin } from "lucide-react";

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

const CATEGORIA_PERSONALE = "bg-teal-500/15 text-teal-400 border-teal-500/40";

export default function SettimanaView({ appuntamenti, loading, onDayClick, onAppuntamentoClick }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => toISODate(new Date()));

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
    appuntamenti.forEach((a) => {
      if (!map[a.data]) map[a.data] = [];
      map[a.data].push(a);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.ora || "").localeCompare(b.ora || ""))
    );
    return map;
  }, [appuntamenti]);

  const weekLabel = `${days[0].getDate()} ${MESI[days[0].getMonth()]} – ${days[6].getDate()} ${MESI[days[6].getMonth()]} ${days[6].getFullYear()}`;

  const goToWeek = (offset) => {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + offset * 7);
      const monday = getMonday(n);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today >= monday && today <= sunday) {
        setSelectedDay(toISODate(today));
      } else {
        setSelectedDay(toISODate(monday));
      }
      return n;
    });
  };

  const prevWeek = () => goToWeek(-1);
  const nextWeek = () => goToWeek(1);
  const goToday = () => {
    setWeekStart(getMonday(new Date()));
    setSelectedDay(toISODate(new Date()));
  };

  const selectedApps = appuntamentiPerGiorno[selectedDay] || [];
  const selectedDate = new Date(selectedDay + "T00:00");
  const selectedDayName = GIORNI[(selectedDate.getDay() + 6) % 7];

  return (
    <div>
      {/* Navigazione settimana — visibile su tutti i viewport */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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

      {/* Selettore giorni — desktop: griglia 7 colonne */}
      <div className="hidden md:grid grid-cols-7 gap-1.5 mb-3">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === todayISO;
          const isSelected = iso === selectedDay;
          const apps = appuntamentiPerGiorno[iso] || [];
          return (
            <button
              key={iso}
              onClick={() => setSelectedDay(iso)}
              className={`text-center py-2 rounded-md transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-primary/15 hover:bg-primary/20"
                  : "bg-secondary/50 hover:bg-secondary"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-80">{GIORNI[i]}</div>
              <div className="text-sm font-bold">{d.getDate()}</div>
              {apps.length > 0 && (
                <div className={`text-[9px] mt-0.5 ${isSelected ? "opacity-90" : "text-primary"}`}>
                  {apps.length} app.
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selettore giorni — mobile: scroll orizzontale */}
      <div className="md:hidden flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === todayISO;
          const isSelected = iso === selectedDay;
          const apps = appuntamentiPerGiorno[iso] || [];
          return (
            <button
              key={iso}
              onClick={() => setSelectedDay(iso)}
              className={`flex-shrink-0 w-14 py-2 rounded-md text-center transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-primary/15 border border-primary/40"
                  : "bg-secondary/50"
              }`}
            >
              <div className="text-[9px] uppercase tracking-wider opacity-80">{GIORNI[i]}</div>
              <div className="text-sm font-bold">{d.getDate()}</div>
              {apps.length > 0 && (
                <div className={`text-[8px] mt-0.5 ${isSelected ? "opacity-90" : "text-primary"}`}>
                  {apps.length}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Dettaglio giorno selezionato */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold capitalize flex items-center gap-2">
            {selectedDayName} {selectedDate.getDate()} {MESI[selectedDate.getMonth()]}
            {selectedDay === todayISO && (
              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">oggi</span>
            )}
          </h3>
          <Button variant="outline" size="sm" onClick={() => onDayClick(selectedDay)}>
            <Plus className="w-3.5 h-3.5" /> Aggiungi
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : selectedApps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nessun appuntamento per questo giorno
          </p>
        ) : (
          <div className="space-y-2">
            {selectedApps.map((a) => (
              <button
                key={a.id}
                onClick={() => onAppuntamentoClick(a)}
                className={`w-full flex items-start gap-3 p-3 rounded-md border text-left ${
                  a.categoria === "personale"
                    ? CATEGORIA_PERSONALE
                    : STATO_COLORS[a.stato] || STATO_COLORS.programmato
                }`}
              >
                <div className="flex flex-col items-center flex-shrink-0 min-w-[40px]">
                  <span className="text-sm font-bold">{a.ora || "—"}</span>
                  <span className="text-[10px] opacity-60">{a.durata_minuti || 60}min</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.titolo}</div>
                  {a.cliente_nome && (
                    <div className="text-xs opacity-70 truncate">{a.cliente_nome}</div>
                  )}
                  {a.cantiere_nome && (
                    <div className="text-xs opacity-70 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {a.cantiere_nome}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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