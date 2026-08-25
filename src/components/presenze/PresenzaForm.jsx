import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  HardHat,
  Building2,
} from "lucide-react";

const emptyForm = {
  collaboratore_id: "",
  cantiere_id: "",
  lavorazione_id: "",
  data: new Date().toISOString().split("T")[0],
  ora_ingresso: "08:00",
  ora_uscita: "17:00",
  ore_straordinarie: 0,
  note: "",
};

// Calcola ore tra due orari HH:MM
function calcOre(ingresso, uscita) {
  if (!ingresso || !uscita) return 0;
  const [hi, mi] = ingresso.split(":").map(Number);
  const [hu, mu] = uscita.split(":").map(Number);
  let diff = hu * 60 + mu - (hi * 60 + mi);
  if (diff < 0) diff += 24 * 60; // attraversa mezzanotte
  return Math.round((diff / 60) * 100) / 100;
}

export default function PresenzaForm({ open, onOpenChange, presenza, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [collaboratori, setCollaboratori] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [lavorazioni, setLavorazioni] = useState([]);

  useEffect(() => {
    if (presenza) {
      setForm({
        collaboratore_id: presenza.collaboratore_id || "",
        cantiere_id: presenza.cantiere_id || "",
        lavorazione_id: presenza.lavorazione_id || "",
        data: presenza.data || new Date().toISOString().split("T")[0],
        ora_ingresso: presenza.ora_ingresso || "08:00",
        ora_uscita: presenza.ora_uscita || "17:00",
        ore_straordinarie: presenza.ore_straordinarie ?? 0,
        note: presenza.note || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [presenza, open]);

  useEffect(() => {
    if (open) {
      base44.entities.Collaboratore.list().then(setCollaboratori).catch(() => {});
      base44.entities.Cantiere
        .filter({ archiviato: false })
        .then(setCantieri)
        .catch(() => {});
    }
  }, [open]);

  // Carica lavorazioni del cantiere selezionato
  useEffect(() => {
    if (!form.cantiere_id) {
      setLavorazioni([]);
      return;
    }
    base44.entities.Lavorazione
      .filter({ cantiere_id: form.cantiere_id })
      .then(setLavorazioni)
      .catch(() => {});
  }, [form.cantiere_id]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const oreTotali = useMemo(
    () => calcOre(form.ora_ingresso, form.ora_uscita),
    [form.ora_ingresso, form.ora_uscita]
  );

  // Filtra collaboratori assegnati al cantiere selezionato
  const collaboratoriFiltrati = useMemo(() => {
    if (!form.cantiere_id) return collaboratori;
    const cantiere = cantieri.find((c) => c.id === form.cantiere_id);
    if (!cantiere || !cantiere.collaboratori_ids) return collaboratori;
    const ids = cantiere.collaboratori_ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const filtered = collaboratori.filter((c) => ids.includes(c.id));
    // Include currently selected even if not in cantiere team (editing)
    if (
      form.collaboratore_id &&
      !filtered.find((c) => c.id === form.collaboratore_id)
    ) {
      const sel = collaboratori.find((c) => c.id === form.collaboratore_id);
      if (sel) filtered.unshift(sel);
    }
    return filtered;
  }, [collaboratori, cantieri, form.cantiere_id, form.collaboratore_id]);

  const lavSelezionata = useMemo(
    () => lavorazioni.find((l) => l.id === form.lavorazione_id),
    [lavorazioni, form.lavorazione_id]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.collaboratore_id || !form.data) return;
    setLoading(true);

    const collab = collaboratori.find((c) => c.id === form.collaboratore_id);
    const cantiere = cantieri.find((c) => c.id === form.cantiere_id);
    const lav = lavorazioni.find((l) => l.id === form.lavorazione_id);

    const payload = {
      ...form,
      ore_totali: oreTotali,
      ore_straordinarie: Number(form.ore_straordinarie) || 0,
      collaboratore_nome: collab?.nome || "",
      cantiere_nome: cantiere?.nome || "",
      lavorazione_nome: lav?.titolo || "",
    };

    try {
      if (presenza) {
        await base44.entities.Presenza.update(presenza.id, payload);
      } else {
        await base44.entities.Presenza.create(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio presenza:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {presenza ? "Modifica presenza" : "Registra presenza"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Collaboratore *</Label>
            <Select
              value={form.collaboratore_id || "__none__"}
              onValueChange={(v) =>
                update("collaboratore_id", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {collaboratoriFiltrati.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantiere</Label>
              <Select
                value={form.cantiere_id || "__none__"}
                onValueChange={(v) => {
                  update("cantiere_id", v === "__none__" ? "" : v);
                  update("lavorazione_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {cantieri.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lavorazione</Label>
              <Select
                value={form.lavorazione_id || "__none__"}
                onValueChange={(v) => {
                  const lavId = v === "__none__" ? "" : v;
                  update("lavorazione_id", lavId);
                  // Auto-fill uscita based on lavorazione ore_previste
                  if (lavId) {
                    const lav = lavorazioni.find((l) => l.id === lavId);
                    if (lav && lav.ore_previste && form.ora_ingresso) {
                      const [hi, mi] = form.ora_ingresso
                        .split(":")
                        .map(Number);
                      const totalMin = hi * 60 + mi + lav.ore_previste * 60;
                      const hu = Math.floor(totalMin / 60) % 24;
                      const mu = totalMin % 60;
                      update(
                        "ora_uscita",
                        `${String(hu).padStart(2, "0")}:${String(
                          mu
                        ).padStart(2, "0")}`
                      );
                    }
                  }
                }}
                disabled={!form.cantiere_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {lavorazioni.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.titolo}
                      {l.ore_previste ? ` · ${l.ore_previste}h prev.` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={form.data}
                onChange={(e) => update("data", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ingresso">Ingresso</Label>
              <Input
                id="ingresso"
                type="time"
                value={form.ora_ingresso}
                onChange={(e) => update("ora_ingresso", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uscita">Uscita</Label>
              <Input
                id="uscita"
                type="time"
                value={form.ora_uscita}
                onChange={(e) => update("ora_uscita", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
            <span className="text-sm text-muted-foreground">Ore totali calcolate</span>
            <span className="text-lg font-bold text-primary">{oreTotali} h</span>
          </div>

          {lavSelezionata && (
            <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-3 border border-border/50">
              <div className="text-sm text-muted-foreground">
                Ore previste lavorazione:{" "}
                <span className="font-medium text-foreground">
                  {lavSelezionata.ore_previste || 0} h
                </span>
              </div>
              <div className="text-sm font-medium">
                {oreTotali === (lavSelezionata.ore_previste || 0) ? (
                  <span className="text-green-500">✓ Coincide</span>
                ) : (
                  <span className="text-yellow-500">
                    Diff:{" "}
                    {(
                      oreTotali - (lavSelezionata.ore_previste || 0)
                    ).toFixed(2)}
                    h
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="straord">Ore straordinarie</Label>
              <Input
                id="straord"
                type="number"
                min="0"
                step="0.5"
                value={form.ore_straordinarie}
                onChange={(e) => update("ore_straordinarie", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              rows={2}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {presenza ? "Salva" : "Registra"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}