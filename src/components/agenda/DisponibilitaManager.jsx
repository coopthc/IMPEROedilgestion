import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const GIORNI = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
  { value: 0, label: "Domenica" },
];

export default function DisponibilitaManager() {
  const { toast } = useToast();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuovo, setNuovo] = useState({
    giorno_settimana: "1",
    ora_inizio: "09:00",
    ora_fine: "18:00",
    durata_slot: 60,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Disponibilita.list();
      setSlots(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!nuovo.ora_inizio || !nuovo.ora_fine) return;
    try {
      await base44.entities.Disponibilita.create({
        giorno_settimana: Number(nuovo.giorno_settimana),
        ora_inizio: nuovo.ora_inizio,
        ora_fine: nuovo.ora_fine,
        durata_slot: Number(nuovo.durata_slot) || 60,
        attivo: true,
      });
      load();
      toast({ title: "Disponibilità aggiunta" });
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const toggle = async (slot) => {
    await base44.entities.Disponibilita.update(slot.id, { attivo: !slot.attivo });
    load();
  };

  const remove = async (slot) => {
    if (!confirm("Eliminare questa fascia di disponibilità?")) return;
    await base44.entities.Disponibilita.delete(slot.id);
    setSlots((prev) => prev.filter((s) => s.id !== slot.id));
  };

  const grouped = GIORNI.map((g) => ({
    ...g,
    slots: slots
      .filter((s) => s.giorno_settimana === g.value)
      .sort((a, b) => (a.ora_inizio || "").localeCompare(b.ora_inizio || "")),
  }));

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Aggiungi fascia di disponibilità
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Definisci gli orari in cui sei disponibile a ricevere appuntamenti.
          Questi slot verranno condivisi con clienti e collaboratori per le prenotazioni.
        </p>
        <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select
            value={nuovo.giorno_settimana}
            onValueChange={(v) => setNuovo((f) => ({ ...f, giorno_settimana: v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GIORNI.map((g) => (
                <SelectItem key={g.value} value={String(g.value)}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="time"
            value={nuovo.ora_inizio}
            onChange={(e) => setNuovo((f) => ({ ...f, ora_inizio: e.target.value }))}
          />
          <Input
            type="time"
            value={nuovo.ora_fine}
            onChange={(e) => setNuovo((f) => ({ ...f, ora_fine: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="15"
              step="15"
              value={nuovo.durata_slot}
              onChange={(e) => setNuovo((f) => ({ ...f, durata_slot: e.target.value }))}
              className="w-24"
              title="Durata di ogni singolo slot prenotabile (minuti)"
            />
            <Button type="submit" size="icon"><Plus className="w-4 h-4" /></Button>
          </div>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2">
          Durata slot = durata di ogni singolo appuntamento prenotabile (es. 60 = un appuntamento ogni ora).
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {grouped.map((g) => (
          <div key={g.value} className="bg-card border border-border rounded-lg p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {g.label}
            </h4>
            {g.slots.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Non disponibile</p>
            ) : (
              g.slots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Switch checked={s.attivo} onCheckedChange={() => toggle(s)} />
                    <span className={`text-sm ${s.attivo ? "" : "line-through text-muted-foreground"}`}>
                      {s.ora_inizio} – {s.ora_fine}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{s.durata_slot}min</span>
                  </div>
                  <button
                    onClick={() => remove(s)}
                    className="p-1 rounded hover:bg-destructive/15 text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}