import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Euro, Check } from "lucide-react";

const TIPI = [
  { value: "acconto", label: "Acconto" },
  { value: "avanzamento", label: "Avanzamento" },
  { value: "saldo", label: "Saldo" },
];

const STATI = [
  { value: "non_pagato", label: "Non pagato", color: "bg-red-500/15 text-red-400" },
  { value: "parziale", label: "Parziale", color: "bg-yellow-500/15 text-yellow-400" },
  { value: "pagato", label: "Pagato", color: "bg-green-500/15 text-green-400" },
];

const emptyForm = {
  titolo: "",
  tipo: "acconto",
  percentuale: "",
  importo: "",
  data_scadenza: "",
  stato: "non_pagato",
  note: "",
};

export default function CantierePagamenti({ cantiere }) {
  const { toast } = useToast();
  const [pagamenti, setPagamenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Pagamento.filter({
        cantiere_id: cantiere.id,
      });
      setPagamenti(data.sort((a, b) => (a.data_scadenza || "").localeCompare(b.data_scadenza || "")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cantiere.id]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      titolo: p.titolo || "",
      tipo: p.tipo || "acconto",
      percentuale: p.percentuale ?? "",
      importo: p.importo ?? "",
      data_scadenza: p.data_scadenza || "",
      stato: p.stato || "non_pagato",
      note: p.note || "",
    });
    setFormOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      cantiere_id: cantiere.id,
      cantiere_nome: cantiere.nome,
      percentuale: form.percentuale === "" ? null : Number(form.percentuale),
      importo: form.importo === "" ? null : Number(form.importo),
      data_pagamento: form.stato === "pagato" ? new Date().toISOString().split("T")[0] : null,
    };
    try {
      if (editing) {
        await base44.entities.Pagamento.update(editing.id, payload);
      } else {
        await base44.entities.Pagamento.create(payload);
      }
      setFormOpen(false);
      load();
      toast({ title: "Pagamento salvato" });
    } catch (err) {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const markPaid = async (p) => {
    await base44.entities.Pagamento.update(p.id, {
      stato: "pagato",
      data_pagamento: new Date().toISOString().split("T")[0],
    });
    load();
  };

  const handleDelete = async (p) => {
    if (!confirm(`Eliminare "${p.titolo}"?`)) return;
    await base44.entities.Pagamento.delete(p.id);
    load();
  };

  const totale = pagamenti.reduce((s, p) => s + (p.importo || 0), 0);
  const pagato = pagamenti
    .filter((p) => p.stato === "pagato")
    .reduce((s, p) => s + (p.importo || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            Totale: <strong className="text-foreground">€ {totale.toLocaleString("it-IT")}</strong>
          </span>
          <span className="text-muted-foreground">
            Pagato: <strong className="text-green-500">€ {pagato.toLocaleString("it-IT")}</strong>
          </span>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Nuovo pagamento
        </Button>
      </div>

      {pagamenti.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nessun pagamento registrato.
        </p>
      ) : (
        <div className="space-y-2">
          {pagamenti.map((p) => {
            const statoInfo = STATI.find((s) => s.value === p.stato) || STATI[0];
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
              >
                <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                  <Euro className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.titolo}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {TIPI.find((t) => t.value === p.tipo)?.label || p.tipo}
                    </span>
                    {p.importo != null && (
                      <span className="text-[10px] text-muted-foreground">
                        € {p.importo.toLocaleString("it-IT")}
                      </span>
                    )}
                    {p.percentuale != null && (
                      <span className="text-[10px] text-muted-foreground">
                        {p.percentuale}%
                      </span>
                    )}
                    {p.data_scadenza && (
                      <span className="text-[10px] text-muted-foreground">
                        scad. {new Date(p.data_scadenza).toLocaleDateString("it-IT")}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${statoInfo.color}`}>
                  {statoInfo.label}
                </span>
                {p.stato !== "pagato" && (
                  <button
                    onClick={() => markPaid(p)}
                    className="p-1.5 rounded hover:bg-green-500/15 text-green-500"
                    title="Segna pagato"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="p-1.5 rounded hover:bg-destructive/15 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica pagamento" : "Nuovo pagamento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="titolo">Titolo *</Label>
              <Input
                id="titolo"
                value={form.titolo}
                onChange={(e) => setForm((f) => ({ ...f, titolo: e.target.value }))}
                placeholder="es. Acconto iniziale"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
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
                  onValueChange={(v) => setForm((f) => ({ ...f, stato: v }))}
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
                <Label htmlFor="importo">Importo (€)</Label>
                <Input
                  id="importo"
                  type="number"
                  step="0.01"
                  value={form.importo}
                  onChange={(e) => setForm((f) => ({ ...f, importo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="percentuale">Percentuale (%)</Label>
                <Input
                  id="percentuale"
                  type="number"
                  value={form.percentuale}
                  onChange={(e) => setForm((f) => ({ ...f, percentuale: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scadenza">Data scadenza</Label>
              <Input
                id="scadenza"
                type="date"
                value={form.data_scadenza}
                onChange={(e) => setForm((f) => ({ ...f, data_scadenza: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Annulla
              </Button>
              <Button type="submit">Salva</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}