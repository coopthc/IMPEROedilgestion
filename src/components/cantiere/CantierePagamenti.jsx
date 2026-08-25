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
  { value: "acconto", label: "Acconto", icon: "💶" },
  { value: "avanzamento", label: "Avanzamento SAL", icon: "📊" },
  { value: "saldo", label: "Saldo finale", icon: "✅" },
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
  data_pagamento: "",
  stato: "non_pagato",
  note: "",
};

export default function CantierePagamenti({ cantiere, isCliente = false }) {
  const { toast } = useToast();
  const [pagamenti, setPagamenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const budget = cantiere.budget || 0;

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Pagamento.filter({ cantiere_id: cantiere.id });
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
      data_pagamento: p.data_pagamento || "",
      stato: p.stato || "non_pagato",
      note: p.note || "",
    });
    setFormOpen(true);
  };

  // Auto-calc importo from percentuale based on budget
  const onPctChange = (val) => {
    setForm((f) => {
      const pct = val === "" ? "" : Number(val);
      const importoCalc = budget > 0 && pct !== "" ? (budget * pct / 100).toFixed(2) : f.importo;
      return { ...f, percentuale: val, importo: importoCalc };
    });
  };

  const onImportoChange = (val) => {
    setForm((f) => {
      const imp = val === "" ? "" : Number(val);
      const pctCalc = budget > 0 && imp !== "" ? (imp / budget * 100).toFixed(0) : f.percentuale;
      return { ...f, importo: val, percentuale: pctCalc };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      cantiere_id: cantiere.id,
      cantiere_nome: cantiere.nome,
      percentuale: form.percentuale === "" ? null : Number(form.percentuale),
      importo: form.importo === "" ? null : Number(form.importo),
      data_pagamento: form.stato === "pagato" && !form.data_pagamento
        ? new Date().toISOString().split("T")[0]
        : form.data_pagamento || null,
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
  const percPagata = budget > 0 ? Math.min(100, Math.round(pagato / budget * 100)) : (totale > 0 ? Math.round(pagato / totale * 100) : 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra progressione pagamenti */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Avanzamento pagamenti</div>
            {budget > 0 && (
              <div className="text-xs text-muted-foreground mt-0.5">
                Budget: <strong className="text-foreground">€ {budget.toLocaleString("it-IT")}</strong>
              </div>
            )}
          </div>
          <div className={`text-2xl font-bold ${percPagata >= 100 ? "text-green-500" : "text-primary"}`}>
            {percPagata}%
          </div>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${percPagata >= 100 ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${percPagata}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-muted-foreground">
            Pagato: <strong className="text-green-500">€ {pagato.toLocaleString("it-IT")}</strong>
          </span>
          <span className="text-muted-foreground">
            Totale: <strong className="text-foreground">€ {totale.toLocaleString("it-IT")}</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{pagamenti.length} milestone</span>
        {!isCliente && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" />
            Nuovo pagamento
          </Button>
        )}
      </div>

      {pagamenti.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nessun pagamento registrato.
        </p>
      ) : (
        <div className="space-y-2">
          {pagamenti.map((p) => {
            const statoInfo = STATI.find((s) => s.value === p.stato) || STATI[0];
            const tipoInfo = TIPI.find((t) => t.value === p.tipo) || TIPI[0];
            const importoCalc = p.importo != null
              ? p.importo
              : (budget > 0 && p.percentuale != null ? (budget * p.percentuale / 100) : null);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 bg-card border border-border rounded-lg p-3 ${
                  p.stato === "pagato" ? "border-l-2 border-l-green-500" : ""
                }`}
              >
                {p.stato !== "pagato" ? (
                  isCliente ? (
                    <span className="w-5 h-5 rounded border-2 border-border flex-shrink-0" />
                  ) : (
                    <button
                      onClick={() => markPaid(p)}
                      className="w-5 h-5 rounded border-2 border-border hover:border-green-500 flex-shrink-0"
                      title="Segna pagato"
                    />
                  )
                ) : (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                <span className="text-lg flex-shrink-0">{tipoInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.titolo}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{tipoInfo.label}</span>
                    {p.percentuale != null && (
                      <span className="text-[10px] text-muted-foreground">{p.percentuale}%</span>
                    )}
                    {importoCalc != null && importoCalc > 0 && (
                      <span className="text-[10px] text-primary font-semibold">
                        € {importoCalc.toLocaleString("it-IT")}
                      </span>
                    )}
                    {p.stato === "pagato" && p.data_pagamento && (
                      <span className="text-[10px] text-green-500">
                        ✓ {new Date(p.data_pagamento).toLocaleDateString("it-IT")}
                      </span>
                    )}
                    {p.data_scadenza && p.stato !== "pagato" && (
                      <span className="text-[10px] text-muted-foreground">
                        scad. {new Date(p.data_scadenza).toLocaleDateString("it-IT")}
                      </span>
                    )}
                    {p.note && (
                      <span className="text-[10px] text-muted-foreground italic truncate">{p.note}</span>
                    )}
                  </div>
                </div>
                {!isCliente && (
                  <>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground flex-shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1.5 rounded hover:bg-destructive/15 text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica pagamento" : "Nuovo pagamento"}</DialogTitle>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPI.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATI.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="percentuale">% sul totale</Label>
                <Input
                  id="percentuale"
                  type="number"
                  min="1"
                  max="100"
                  value={form.percentuale}
                  onChange={(e) => onPctChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="importo">Importo (€)</Label>
                <Input
                  id="importo"
                  type="number"
                  step="0.01"
                  value={form.importo}
                  onChange={(e) => onImportoChange(e.target.value)}
                />
              </div>
            </div>
            {budget > 0 && (
              <p className="text-[10px] text-muted-foreground -mt-1">
                Compila uno dei due campi: l'altro si aggiorna in base al budget (€ {budget.toLocaleString("it-IT")}).
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="scadenza">Data scadenza</Label>
                <Input
                  id="scadenza"
                  type="date"
                  value={form.data_scadenza}
                  onChange={(e) => setForm((f) => ({ ...f, data_scadenza: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="datapag">Data pagamento</Label>
                <Input
                  id="datapag"
                  type="date"
                  value={form.data_pagamento}
                  onChange={(e) => setForm((f) => ({ ...f, data_pagamento: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Note interne..."
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