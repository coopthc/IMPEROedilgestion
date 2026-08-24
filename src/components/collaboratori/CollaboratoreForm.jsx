import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const QUALIFICHE = [
  { value: "capo_cantiere", label: "Capo cantiere" },
  { value: "operaio", label: "Operaio" },
  { value: "tecnico", label: "Tecnico" },
  { value: "amministrazione", label: "Amministrazione" },
  { value: "altro", label: "Altro" },
];

const emptyForm = {
  nome: "",
  is_azienda: false,
  azienda: "",
  qualifica: "operaio",
  costo_orario: "",
  telefono: "",
  email: "",
  indirizzo: "",
  citta: "",
  cap: "",
  provincia: "",
  piva: "",
  codice_fiscale: "",
  attivo: true,
};

export default function CollaboratoreForm({ open, onOpenChange, collaboratore, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (collaboratore) {
      setForm({
        nome: collaboratore.nome || "",
        is_azienda: collaboratore.is_azienda || false,
        azienda: collaboratore.azienda || "",
        qualifica: collaboratore.qualifica || "operaio",
        costo_orario: collaboratore.costo_orario ?? "",
        telefono: collaboratore.telefono || "",
        email: collaboratore.email || "",
        indirizzo: collaboratore.indirizzo || "",
        citta: collaboratore.citta || "",
        cap: collaboratore.cap || "",
        provincia: collaboratore.provincia || "",
        piva: collaboratore.piva || "",
        codice_fiscale: collaboratore.codice_fiscale || "",
        attivo: collaboratore.attivo !== false,
      });
    } else {
      setForm(emptyForm);
    }
  }, [collaboratore, open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    const payload = {
      ...form,
      costo_orario: form.costo_orario === "" ? null : Number(form.costo_orario),
    };
    try {
      if (collaboratore) {
        await base44.entities.Collaboratore.update(collaboratore.id, payload);
      } else {
        await base44.entities.Collaboratore.create(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio collaboratore:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {collaboratore ? "Modifica collaboratore" : "Nuovo collaboratore"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Toggle azienda */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="cursor-pointer">È un'azienda</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Attiva per fornitori / ditte con ragione sociale
              </p>
            </div>
            <Switch
              checked={form.is_azienda}
              onCheckedChange={(v) => update("is_azienda", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nome">
              {form.is_azienda ? "Nome referente *" : "Nome *"}
            </Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="es. Mario Rossi"
              required
            />
          </div>

          {form.is_azienda && (
            <div className="space-y-1.5">
              <Label htmlFor="azienda">Ragione sociale</Label>
              <Input
                id="azienda"
                value={form.azienda}
                onChange={(e) => update("azienda", e.target.value)}
                placeholder="es. Rossi Costruzioni Srl"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Qualifica</Label>
              <Select
                value={form.qualifica}
                onValueChange={(v) => update("qualifica", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICHE.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costo_orario">Costo orario (€)</Label>
              <Input
                id="costo_orario"
                type="number"
                step="0.01"
                min="0"
                value={form.costo_orario}
                onChange={(e) => update("costo_orario", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => update("telefono", e.target.value)}
                placeholder="es. +39 333 1234567"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </div>

          {/* Sezione fatturazione */}
          <div className="pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 pb-1.5 border-b border-border">
              Dati di fatturazione
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="indirizzo">Indirizzo</Label>
                <Input
                  id="indirizzo"
                  value={form.indirizzo}
                  onChange={(e) => update("indirizzo", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="citta">Città</Label>
                  <Input
                    id="citta"
                    value={form.citta}
                    onChange={(e) => update("citta", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cap">CAP</Label>
                  <Input
                    id="cap"
                    value={form.cap}
                    onChange={(e) => update("cap", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provincia">Provincia</Label>
                  <Input
                    id="provincia"
                    value={form.provincia}
                    onChange={(e) => update("provincia", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="piva">Partita IVA</Label>
                  <Input
                    id="piva"
                    value={form.piva}
                    onChange={(e) => update("piva", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="codice_fiscale">Codice fiscale</Label>
                  <Input
                    id="codice_fiscale"
                    value={form.codice_fiscale}
                    onChange={(e) => update("codice_fiscale", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="attivo" className="cursor-pointer">
                Attivo
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disattiva per ex collaboratori
              </p>
            </div>
            <Switch
              id="attivo"
              checked={form.attivo}
              onCheckedChange={(v) => update("attivo", v)}
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
              {collaboratore ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}