import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock } from "lucide-react";

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

export default function TimeSlotPicker({ data, ora, onChange }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noAvailability, setNoAvailability] = useState(false);

  useEffect(() => {
    if (!data) {
      setSlots([]);
      setNoAvailability(false);
      return;
    }
    setLoading(true);
    base44.entities.Disponibilita
      .list()
      .then((all) => {
        const dayOfWeek = new Date(data + "T00:00").getDay();
        const daySlots = all.filter(
          (s) => s.giorno_settimana === dayOfWeek && s.attivo
        );
        if (daySlots.length === 0) {
          setNoAvailability(true);
          setSlots(generaSlot("08:00", "18:00", 30));
        } else {
          setNoAvailability(false);
          const allSlots = daySlots.flatMap((s) =>
            generaSlot(s.ora_inizio, s.ora_fine, s.durata_slot || 60)
          );
          const unique = [...new Set(allSlots)].sort();
          setSlots(unique);
        }
      })
      .catch(() => {
        setNoAvailability(true);
        setSlots(generaSlot("08:00", "18:00", 30));
      })
      .finally(() => setLoading(false));
  }, [data]);

  if (!data) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        Seleziona prima una data per vedere gli orari disponibili.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground py-2">Caricamento orari...</p>
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
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                ora === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}