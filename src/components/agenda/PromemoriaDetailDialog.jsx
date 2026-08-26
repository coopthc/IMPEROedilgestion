import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Calendar, Clock, FileText, Trash2, Pencil, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function Field({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-muted-foreground text-xs">{label}: </span>
        <span>{children}</span>
      </div>
    </div>
  );
}

export default function PromemoriaDetailDialog({ prom, open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ titolo: "", data: "", ora: "", nota: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prom) {
      setEditMode(false);
      setForm({
        titolo: prom.titolo || "",
        data: prom.data || "",
        ora: prom.ora || "",
        nota: prom.nota || "",
      });
    }
  }, [prom]);

  if (!prom) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Promemoria.update(prom.id, {
        titolo: form.titolo,
        data: form.data,
        ora: form.ora || "",
        nota: form.nota || "",
      });
      toast({ title: "Promemoria aggiornato" });
      setEditMode(false);
      onSaved?.();
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Eliminare il promemoria "${prom.titolo}"?`)) return;
    try {
      await base44.entities.Promemoria.delete(prom.id);
      toast({ title: "Promemoria eliminato" });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleDone = async () => {
    try {
      await base44.entities.Promemoria.update(prom.id, { completato: !prom.completato });
      toast({ title: prom.completato ? "Riattivato" : "Completato" });
      onSaved?.();
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            {editMode ? "Modifica promemoria" : prom.titolo}
          </DialogTitle>
          <DialogDescription>
            {editMode ? "Modifica i campi e salva" : "Dettaglio promemoria"}
          </DialogDescription>
        </DialogHeader>

        {editMode ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Titolo</label>
              <Input
                value={form.titolo}
                onChange={(e) => setForm((f) => ({ ...f, titolo: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Data</label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Ora</label>
                <Input
                  type="time"
                  value={form.ora}
                  onChange={(e) => setForm((f) => ({ ...f, ora: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nota</label>
              <Textarea
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Salva
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Annulla
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              <Field icon={Calendar} label="Data">
                {prom.data
                  ? new Date(prom.data + "T00:00").toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </Field>
              {prom.ora && (
                <Field icon={Clock} label="Ora">{prom.ora}</Field>
              )}
              {prom.nota && (
                <Field icon={FileText} label="Nota">{prom.nota}</Field>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Check className={`w-4 h-4 ${prom.completato ? "text-green-500" : "text-muted-foreground"}`} />
                <span className="text-muted-foreground text-xs">Stato: </span>
                <span className={prom.completato ? "text-green-500" : "text-amber-500"}>
                  {prom.completato ? "Completato" : "Da fare"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica
              </Button>
              <Button variant="outline" size="sm" onClick={handleToggleDone}>
                <Check className="w-3.5 h-3.5 mr-1" />
                {prom.completato ? "Riattiva" : "Completa"}
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive ml-auto" onClick={handleDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}