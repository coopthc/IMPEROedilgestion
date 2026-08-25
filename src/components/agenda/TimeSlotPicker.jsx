import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Ban, Loader2 } from "lucide-react";

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
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noAvailability, setNoAvailability] = useState(false);
  const [giornoBloccato, setGiornoBloccato] = useState(null);

  useEffect(() => {
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

        let rawSlots = [];
        let slotDuration = 60;
        if (daySlots.length === 0) {
          setNoAvailability(true);
          rawSlots = generaSlot("08:00", "18:00", 30);
          slotDuration = 30;
        } else {
          setNoAvailability(false);
          rawSlots = [
            ...new Set(
              daySlots.flatMap((s) =>
                generaSlot(s.ora_inizio, s.ora_fine, s.durata_slot || 60)
              )
            ),
          ].sort();
          slotDuration = daySlots[0].durata_slot || 60;
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
          const slotEnd = slotStart + slotDuration;
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
    return (
      <p className="text-xs text-destructive py-2 flex items-center gap-1.5">
        <Ban className="w-3.5 h-3.5" />
        Giorno bloccato{giornoBloccato.motivo ? `: ${giornoBloccato.motivo}` : ""}
      </p>
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
              disabled={s.blocked}
              onClick={() => onChange(s.time)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                s.blocked
                  ? "bg-destructive/10 text-destructive/50 line-through cursor-not-allowed"
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
          Gli orari barrati sono già occupati.
        </p>
      )}
    </div>
  );
}