import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  Clock,
  Loader2,
  Ban,
  CalendarX,
} from "lucide-react";
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
  const [giorniBloccati, setGiorniBloccati] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nuovo, setNuovo] = useState({
    giorno_settimana: "1",
    ora_inizio: "09:00",
    ora_fine: "18:00",
    durata_slot: 60,
  });
  const [nuovoBlocco, setNuovoBlocco] = useState({ data_inizio: "", data_fine: "", motivo: "" });
  const [savingBlocco, setSavingBlocco] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, bloccati] = await Promise.all([
        base44.entities.Disponibilita.list(),
        base44.entities.GiornoBloccato.list("-data"),
      ]);
      setSlots(data);
      setGiorniBloccati(bloccati);
    } catch (err) {
      toast({
        title: "Errore caricamento",
        description: err.message || "Impossibile caricare",
        variant: "destructive",
      });
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
    setSaving(true);
    try {
      await base44.entities.Disponibilita.create({
        giorno_settimana: Number(nuovo.giorno_settimana),
        ora_inizio: nuovo.ora_inizio,
        ora_fine: nuovo.ora_fine,
        durata_slot: Number(nuovo.durata_slot) || 60,
        attivo: true,
      });
      await load();
      toast({ title: "Disponibilità aggiunta" });
    } catch (err) {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (slot) => {
    try {
      await base44.entities.Disponibilita.update(slot.id, {
        attivo: !slot.attivo,
      });
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, attivo: !s.attivo } : s))
      );
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (slot) => {
    if (!confirm("Eliminare questa fascia di disponibilità?")) return;
    try {
      await base44.entities.Disponibilita.delete(slot.id);
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
      toast({ title: "Fascia eliminata" });
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const addBlocco = async (e) => {
    e.preventDefault();
    if (!nuovoBlocco.data_inizio) return;
    setSavingBlocco(true);
    try {
      const dates = [];
      if (nuovoBlocco.data_fine && nuovoBlocco.data_fine >= nuovoBlocco.data_inizio) {
        const start = new Date(nuovoBlocco.data_inizio + "T00:00");
        const end = new Date(nuovoBlocco.data_fine + "T00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          dates.push(`${y}-${m}-${day}`);
        }
      } else {
        dates.push(nuovoBlocco.data_inizio);
      }

      const existing = new Set(giorniBloccati.map((g) => g.data));
      const newDates = dates.filter((d) => !existing.has(d));

      if (newDates.length === 0) {
        toast({ title: "Tutte le date sono già bloccate" });
        return;
      }

      await base44.entities.GiornoBloccato.bulkCreate(
        newDates.map((d) => ({ data: d, motivo: nuovoBlocco.motivo || "" }))
      );
      setNuovoBlocco({ data_inizio: "", data_fine: "", motivo: "" });
      await load();
      toast({ title: `${newDates.length} ${newDates.length === 1 ? "giornata bloccata" : "giornate bloccate"}` });
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setSavingBlocco(false);
    }
  };

  const removeBlocco = async (g) => {
    try {
      await base44.entities.GiornoBloccato.delete(g.id);
      setGiorniBloccati((prev) => prev.filter((x) => x.id !== g.id));
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const grouped = GIORNI.map((g) => ({
    ...g,
    slots: slots
      .filter((s) => s.giorno_settimana === g.value)
      .sort((a, b) => (a.ora_inizio || "").localeCompare(b.ora_inizio || "")),
  }));

  let bloccoCount = 0;
  if (nuovoBlocco.data_inizio && nuovoBlocco.data_fine && nuovoBlocco.data_fine >= nuovoBlocco.data_inizio) {
    const start = new Date(nuovoBlocco.data_inizio + "T00:00");
    const end = new Date(nuovoBlocco.data_fine + "T00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) bloccoCount++;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disponibilità settimanale */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Disponibilità settimanale
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Definisci gli orari in cui sei disponibile. Gli slot generati verranno
          usati nel form appuntamento, escludendo quelli già occupati.
        </p>
        <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select
            value={nuovo.giorno_settimana}
            onValueChange={(v) =>
              setNuovo((f) => ({ ...f, giorno_settimana: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GIORNI.map((g) => (
                <SelectItem key={g.value} value={String(g.value)}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="time"
            value={nuovo.ora_inizio}
            onChange={(e) =>
              setNuovo((f) => ({ ...f, ora_inizio: e.target.value }))
            }
          />
          <Input
            type="time"
            value={nuovo.ora_fine}
            onChange={(e) =>
              setNuovo((f) => ({ ...f, ora_fine: e.target.value }))
            }
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="15"
              step="15"
              value={nuovo.durata_slot}
              onChange={(e) =>
                setNuovo((f) => ({ ...f, durata_slot: e.target.value }))
              }
              className="w-24"
              title="Durata di ogni singolo slot prenotabile (minuti)"
            />
            <Button type="submit" size="icon" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
        <p className="text-[10px] text-muted-foreground mt-2">
          Durata slot = durata di ogni singolo appuntamento prenotabile (es. 60
          = un appuntamento ogni ora).
        </p>
      </div>

      {/* Griglia giorni */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {grouped.map((g) => (
          <div
            key={g.value}
            className="bg-card border border-border rounded-lg p-3"
          >
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
                    <Switch
                      checked={s.attivo}
                      onCheckedChange={() => toggle(s)}
                    />
                    <span
                      className={`text-sm ${
                        s.attivo ? "" : "line-through text-muted-foreground"
                      }`}
                    >
                      {s.ora_inizio} – {s.ora_fine}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.durata_slot}min
                    </span>
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

      {/* Blocca giornate specifiche */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Ban className="w-4 h-4 text-destructive" /> Blocca giornate specifiche
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Blocca date per ferie, festività o impegni: in quei giorni non sarà
          possibile prenotare appuntamenti. Inserisci una data fine per bloccare
          un intero periodo (es. una settimana di ferie).
        </p>
        <form onSubmit={addBlocco} className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1.5 flex-1 min-w-[130px]">
            <Label className="text-xs">Data inizio</Label>
            <Input
              type="date"
              value={nuovoBlocco.data_inizio}
              onChange={(e) =>
                setNuovoBlocco((f) => ({ ...f, data_inizio: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[130px]">
            <Label className="text-xs">Data fine (opzionale)</Label>
            <Input
              type="date"
              value={nuovoBlocco.data_fine}
              min={nuovoBlocco.data_inizio || undefined}
              onChange={(e) =>
                setNuovoBlocco((f) => ({ ...f, data_fine: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[160px]">
            <Label className="text-xs">Motivo (opzionale)</Label>
            <Input
              value={nuovoBlocco.motivo}
              onChange={(e) =>
                setNuovoBlocco((f) => ({ ...f, motivo: e.target.value }))
              }
              placeholder="es. Ferie, Festività..."
            />
          </div>
          <Button type="submit" size="sm" disabled={savingBlocco}>
            {savingBlocco ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Ban className="w-3.5 h-3.5" />
            )}
            Blocca
          </Button>
        </form>
        {bloccoCount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Verranno bloccate {bloccoCount} giornate
          </p>
        )}

        {giorniBloccati.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {giorniBloccati.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20"
              >
                <div className="flex items-center gap-2">
                  <CalendarX className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-sm font-medium">
                    {new Date(g.data + "T00:00").toLocaleDateString("it-IT", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  {g.motivo && (
                    <span className="text-xs text-muted-foreground">
                      — {g.motivo}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeBlocco(g)}
                  className="p-1 rounded hover:bg-destructive/20 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}