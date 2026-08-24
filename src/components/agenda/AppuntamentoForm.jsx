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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const TIPI = [
  { value: "interno", label: "Interno" },
  { value: "richiesta", label: "Richiesta" },
  { value: "confermato", label: "Confermato" },
  { value: "admin_fissato", label: "Fissato da admin" },
];

const STATI = [
  { value: "programmato", label: "Programmato" },
  { value: "completato", label: "Completato" },
  { value: "annullato", label: "Annullato" },
];

const emptyForm = {
  titolo: "",
  data: "",
  ora: "",
  durata_minuti: 60,
  tipo: "interno",
  cliente_id: "",
  cantiere_id: "",
  note: "",
  stato: "programmato",
};

export default function AppuntamentoForm({
  open,
  onOpenChange,
  appuntamento,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [cantieri, setCantieri] = useState([]);

  useEffect(() => {
    if (appuntamento) {
      setForm({
        titolo: appuntamento.titolo || "",
        data: appuntamento.data || "",
        ora: appuntamento.ora || "",
        durata_minuti: appuntamento.durata_minuti ?? 60,
        tipo: appuntamento.tipo || "interno",
        cliente_id: appuntamento.cliente_id || "",
        cantiere_id: appuntamento.cantiere_id || "",
        note: appuntamento.note || "",
        stato: appuntamento.stato || "programmato",
      });
    } else {
      setForm(emptyForm);
    }
  }, [appuntamento, open]);

  useEffect(() => {
    if (open) {
      base44.entities.Cliente.list().then(setClienti).catch(() => {});
      base44.entities.Cantiere
        .filter({ archiviato: false })
        .then(setCantieri)
        .catch(() => {});
    }
  }, [open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titolo.trim() || !form.data || !form.ora) return;
    setLoading(true);

    const cliente = clienti.find((c) => c.id === form.cliente_id);
    const cantiere = cantieri.find((c) => c.id === form.cantiere_id);
    const payload = {
      ...form,
      durata_minuti: Number(form.durata_minuti) || 60,
      cliente_nome: cliente?.nome || "",
      cantiere_nome: cantiere?.nome || "",
    };

    try {
      if (appuntamento) {
        await base44.entities.Appuntamento.update(appuntamento.id, payload);
      } else {
        await base44.entities.Appuntamento.create(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio appuntamento:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appuntamento ? "Modifica appuntamento" : "Nuovo appuntamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="titolo">Titolo *</Label>
            <Input
              id="titolo"
              value={form.titolo}
              onChange={(e) => update("titolo", e.target.value)}
              placeholder="es. sopralluogo cantiere"
              required
            />
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
              <Label htmlFor="ora">Ora *</Label>
              <Input
                id="ora"
                type="time"
                value={form.ora}
                onChange={(e) => update("ora", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durata">Durata (min)</Label>
              <Input
                id="durata"
                type="number"
                min="5"
                step="5"
                value={form.durata_minuti}
                onChange={(e) => update("durata_minuti", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => update("tipo", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPI.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select
                value={form.stato}
                onValueChange={(v) => update("stato", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id || "__none__"}
                onValueChange={(v) =>
                  update("cliente_id", v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {clienti.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cantiere</Label>
              <Select
                value={form.cantiere_id || "__none__"}
                onValueChange={(v) =>
                  update("cantiere_id", v === "__none__" ? "" : v)
                }
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
              {appuntamento ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}