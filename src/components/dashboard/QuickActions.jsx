import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, HardHat, Users, Calendar, Cloud, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function QuickActions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [promOpen, setPromOpen] = useState(false);
  const [nuovo, setNuovo] = useState({ titolo: "", data: "", ora: "" });
  const [saving, setSaving] = useState(false);

  const addPromemoria = async (e) => {
    e.preventDefault();
    if (!nuovo.titolo.trim() || !nuovo.data) return;
    setSaving(true);
    try {
      await base44.entities.Promemoria.create({
        titolo: nuovo.titolo,
        data: nuovo.data,
        ora: nuovo.ora || "",
      });
      setNuovo({ titolo: "", data: "", ora: "" });
      setPromOpen(false);
      toast({ title: "Promemoria aggiunto" });
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const actions = [
    { icon: Bell, label: "Promemoria", onClick: () => setPromOpen(true) },
    { icon: Calendar, label: "Appuntamento", onClick: () => navigate("/agenda") },
    { icon: Users, label: "Cliente", onClick: () => navigate("/clienti") },
    { icon: HardHat, label: "Collaboratore", onClick: () => navigate("/collaboratori") },
    { icon: Cloud, label: "Backup", onClick: () => navigate("/backup-cloud") },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary hover:bg-primary/5 transition-colors text-xs font-medium"
          >
            <Plus className="w-3 h-3 text-primary" />
            <a.icon className="w-3.5 h-3.5 text-muted-foreground" />
            {a.label}
          </button>
        ))}
      </div>

      <Dialog open={promOpen} onOpenChange={setPromOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4 text-primary" /> Nuovo promemoria
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={addPromemoria} className="space-y-3">
            <Input
              value={nuovo.titolo}
              onChange={(e) => setNuovo((f) => ({ ...f, titolo: e.target.value }))}
              placeholder="es. Chiama avvocato"
              required
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={nuovo.data}
                onChange={(e) => setNuovo((f) => ({ ...f, data: e.target.value }))}
                required
                className="flex-1"
              />
              <Input
                type="time"
                value={nuovo.ora}
                onChange={(e) => setNuovo((f) => ({ ...f, ora: e.target.value }))}
                className="w-auto"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setPromOpen(false)}>Annulla</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Aggiungi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}