import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Loader2 } from "lucide-react";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function parseTimeToHours(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

export default function WidgetSettimana() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [apps, disponibilita] = await Promise.all([
          base44.entities.Appuntamento.list(),
          base44.entities.Disponibilita.list(),
        ]);

        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const todayStr = today.toISOString().split("T")[0];

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          const dateStr = date.toISOString().split("T")[0];
          const giornoSettimana = date.getDay();

          const disp = disponibilita.find((d) => d.giorno_settimana === giornoSettimana && d.attivo !== false);
          const availableHours = disp ? (parseTimeToHours(disp.ora_fine) - parseTimeToHours(disp.ora_inizio)) : 0;

          const dayApps = apps.filter((a) => a.data === dateStr && a.stato !== "annullato");

          let workMinutes = 0, personalMinutes = 0;
          for (const app of dayApps) {
            const durata = app.durata_minuti || 60;
            if (disp) {
              const appHour = parseTimeToHours(app.ora);
              if (appHour >= parseTimeToHours(disp.ora_inizio) && appHour < parseTimeToHours(disp.ora_fine)) {
                workMinutes += durata;
              } else {
                personalMinutes += durata;
              }
            } else {
              personalMinutes += durata;
            }
          }

          const maxHours = availableHours > 0 ? availableHours : 10;
          const workPct = availableHours > 0 ? Math.min((workMinutes / 60) / availableHours * 100, 100) : 0;
          const personalPct = Math.min((personalMinutes / 60) / maxHours * 100, 100);

          weekDays.push({
            dateStr,
            dayName: DAY_NAMES[i],
            isToday: dateStr === todayStr,
            workPct,
            personalPct,
            count: dayApps.length,
          });
        }

        setData({ weekDays });
      } catch { setData({ weekDays: [] }); }
    })();
  }, []);

  if (!data) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Pienezza settimana</h3>
      </div>
      <div className="flex items-end justify-between gap-1.5">
        {data.weekDays.map((day) => {
          const total = day.workPct + day.personalPct;
          const capped = Math.min(total, 100);
          const workH = total > 0 ? (day.workPct / total) * capped : 0;
          const personalH = total > 0 ? (day.personalPct / total) * capped : 0;
          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[9px] font-medium">{Math.round(capped)}%</div>
              <div className={`relative w-full h-16 bg-secondary/30 rounded-md overflow-hidden flex flex-col justify-end border ${day.isToday ? "border-primary" : "border-transparent"}`}>
                {personalH > 0 && (
                  <div className="bg-purple-500/60 w-full" style={{ height: `${personalH}%` }} title="Personale" />
                )}
                {workH > 0 && (
                  <div className="bg-primary w-full" style={{ height: `${workH}%` }} title="Lavoro" />
                )}
              </div>
              <span className={`text-[9px] ${day.isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{day.dayName}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary" /> Lavoro</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/60" /> Personale</span>
      </div>
    </div>
  );
}