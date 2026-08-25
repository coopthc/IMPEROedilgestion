import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Pencil, Mail } from "lucide-react";

const CATEGORIE = [
  { value: "cliente", label: "Cliente", color: "bg-primary/15 text-primary" },
  { value: "collaboratore", label: "Collaboratore", color: "bg-blue-500/15 text-blue-400" },
  { value: "sistema", label: "Sistema", color: "bg-yellow-500/15 text-yellow-400" },
];

export default function ModelliEmail() {
  const { toast } = useToast();
  const [modelli, setModelli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroCat, setFiltroCat] = useState("tutte");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ oggetto: "", corpo: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ModelloEmail.list();
      setModelli(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (m) => {
    setEditing(m);
    setForm({ oggetto: m.oggetto || "", corpo: m.corpo || "" });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.ModelloEmail.update(editing.id, form);
      setEditing(null);
      load();
      toast({ title: "Modello salvato" });
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtrati = modelli.filter((m) => {
    const matchCat = filtroCat === "tutte" || m.categoria === filtroCat;
    const q = search.toLowerCase();
    const matchSearch = !q || m.nome?.toLowerCase().includes(q) || m.oggetto?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca modello..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFiltroCat("tutte")}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${filtroCat === "tutte" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Tutte
          </button>
          {CATEGORIE.map((c) => (
            <button
              key={c.value}
              onClick={() => setFiltroCat(c.value)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${filtroCat === c.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtrati.map((m) => {
          const cat = CATEGORIE.find((c) => c.value === m.categoria) || CATEGORIE[0];
          return (
            <div key={m.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{m.nome}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${cat.color}`}>{cat.label}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  Oggetto: {m.oggetto || "—"}
                </div>
                {m.variabili && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">Variabili: {m.variabili}</div>
                )}
              </div>
              <button
                onClick={() => openEdit(m)}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground flex-shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {filtrati.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nessun modello trovato.</p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.nome}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Oggetto</Label>
              <Input
                value={form.oggetto}
                onChange={(e) => setForm((f) => ({ ...f, oggetto: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Corpo email</Label>
              <Textarea
                rows={10}
                value={form.corpo}
                onChange={(e) => setForm((f) => ({ ...f, corpo: e.target.value }))}
              />
            </div>
            {editing?.variabili && (
              <div className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-2.5">
                <strong>Variabili disponibili:</strong> {editing.variabili}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              La firma con logo e dati fatturazione azienda viene aggiunta automaticamente in fondo a ogni email.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salva
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}