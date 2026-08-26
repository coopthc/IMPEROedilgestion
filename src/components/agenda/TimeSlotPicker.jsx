import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Ban, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function generaSlot(oraInizio, oraFine, durataMinuti) {
  const slot = [];
  const [hi, mi] = oraInizio.split(":").map(Number);
  const [hf, mf] = oraFine.split(":").map(Number);
  let totalMin = hi * 60 + mi;
  const endMin = hf * 60 + mf;
  while (totalMin + durataMinuti <= endMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    slot.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    totalMin += durataMinuti;
  }
  return slot;
}

export default function TimeSlotPicker({
  data,
  ora,
  onChange,
  excludeId,
  isAdmin,
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noAvailability, setNoAvailability] = useState(false);
  const [giornoBloccato, setGiornoBloccato] = useState(null);
  const [forceMode, setForceMode] = useState(false);

  useEffect(() => {
    setForceMode(false);
    if (!data) {
      setSlots([]);
      setNoAvailability(false);
      setGiornoBloccato(null);
      return;
    }
    setLoading(true);
    Promise.all([
      base44.entities.Disponibilita.list(),
      base44.entities.Appuntamento.filter({ data }),
      base44.entities.GiornoBloccato.filter({ data }),
      base44.entities.ImpostazioneApp.list(),
    ])
      .then(([allDisp, existingApps, bloccati, impostazioni]) => {
        // Check if day is manually blocked
        if (bloccati.length > 0) {
          setGiornoBloccato(bloccati[0]);
          setSlots([]);
          return;
        }
        setGiornoBloccato(null);

        const dayOfWeek = new Date(data + "T00:00").getDay();
        const daySlots = allDisp.filter(
          (s) => s.giorno_settimana === dayOfWeek && s.attivo
        );

        // Always use 30-min grid for alignment with variable appointment durations
        const SLOT_STEP = 30;
        let rawSlots = [];
        if (daySlots.length === 0) {
          setNoAvailability(true);
          rawSlots = generaSlot("08:00", "18:00", SLOT_STEP);
        } else {
          setNoAvailability(false);
          rawSlots = [
            ...new Set(
              daySlots.flatMap((s) =>
                generaSlot(s.ora_inizio, s.ora_fine, SLOT_STEP)
              )
            ),
          ].sort();
        }

        // Capacity from settings (default 1 = working alone)
        const capacity =
          impostazioni.length > 0 &&
          impostazioni[0].appuntamenti_contemporanei
            ? impostazioni[0].appuntamenti_contemporanei
            : 1;

        // Build slot list with blocked status
        const slotsWithStatus = rawSlots.map((slot) => {
          const slotStart = timeToMinutes(slot);
          const slotEnd = slotStart + SLOT_STEP;
          const overlapping = existingApps.filter((a) => {
            if (a.stato === "annullato") return false;
            if (excludeId && a.id === excludeId) return false;
            const appStart = timeToMinutes(a.ora);
            const appEnd = appStart + (a.durata_minuti || 60);
            return appStart < slotEnd && slotStart < appEnd;
          });
          return { time: slot, blocked: overlapping.length >= capacity };
        });

        setSlots(slotsWithStatus);
      })
      .catch(() => {
        setNoAvailability(true);
        setSlots(
          generaSlot("08:00", "18:00", 30).map((t) => ({
            time: t,
            blocked: false,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [data, excludeId]);

  if (!data) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        Seleziona prima una data per vedere gli orari disponibili.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Caricamento orari...
      </p>
    );
  }

  if (giornoBloccato) {
    if (isAdmin && forceMode) {
      return (
        <div>
          <p className="text-xs text-destructive mb-1.5 flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5" />
            Giorno bloccato — forzato dall'admin
          </p>
          <Input type="time" value={ora} onChange={(e) => onChange(e.target.value)} />
          <button
            type="button"
            onClick={() => { setForceMode(false); onChange(""); }}
            className="text-[10px] text-muted-foreground hover:text-foreground mt-1.5"
          >
            Annulla forzatura
          </button>
        </div>
      );
    }
    return (
      <div>
        <p className="text-xs text-destructive py-1 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5" />
          Giorno bloccato{giornoBloccato.motivo ? `: ${giornoBloccato.motivo}` : ""}
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setForceMode(true)}
            className="text-[11px] text-primary hover:underline"
          >
            Forza appuntamento su giorno bloccato
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {noAvailability && (
        <p className="text-[10px] text-yellow-500 mb-1.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Nessuna disponibilità definita per questo giorno — orari di default.
        </p>
      )}
      {slots.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          Nessun orario disponibile.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {slots.map((s) => (
            <button
              key={s.time}
              type="button"
              onClick={() => {
                if (s.blocked) {
                  if (
                    !confirm(
                      "Questo orario risulta già occupato. Forzare la prenotazione comunque?"
                    )
                  )
                    return;
                }
                onChange(s.time);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                s.blocked
                  ? ora === s.time
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-destructive/10 text-destructive/60 line-through hover:bg-destructive/20 hover:text-destructive"
                  : ora === s.time
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/70"
              }`}
            >
              {s.time}
            </button>
          ))}
        </div>
      )}
      {slots.some((s) => s.blocked) && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Gli orari barrati sono occupati — clicca per forzare la prenotazione.
        </p>
      )}
    </div>
  );
}