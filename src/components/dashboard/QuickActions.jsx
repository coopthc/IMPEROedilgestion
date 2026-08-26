import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, HardHat, Users, Calendar, Cloud, Plus, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export const ACTION_CONFIG = {
  promemoria: { icon: Bell, label: "Promemoria" },
  appuntamento: { icon: Calendar, label: "Appuntamento", to: "/agenda" },
  cliente: { icon: Users, label: "Cliente", to: "/clienti" },
  collaboratore: { icon: HardHat, label: "Collaboratore", to: "/collaboratori" },
  backup: { icon: Cloud, label: "Backup", to: "/backup-cloud" },
};

export const ALL_ACTION_TYPES = Object.keys(ACTION_CONFIG);

export default function QuickActions({ visibleActions, editMode, onRemove, onAdd, onMove }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [promOpen, setPromOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
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

  const handleClick = (type) => {
    if (editMode) return;
    const cfg = ACTION_CONFIG[type];
    if (type === "promemoria") {
      setPromOpen(true);
    } else if (cfg?.to) {
      navigate(cfg.to);
    }
  };

  const hiddenActions = ALL_ACTION_TYPES.filter((t) => !visibleActions.includes(t));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {visibleActions.map((type, idx) => {
          const cfg = ACTION_CONFIG[type];
          if (!cfg) return null;
          return (
            <div key={type} className="relative">
              <button
                onClick={() => handleClick(type)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary hover:bg-primary/5 transition-colors text-xs font-medium"
              >
                <Plus className="w-3 h-3 text-primary" />
                <cfg.icon className="w-3.5 h-3.5 text-muted-foreground" />
                {cfg.label}
              </button>
              {editMode && (
                <div className="absolute -top-2 -right-2 flex items-center gap-0.5 z-10">
                  <button
                    onClick={() => onMove(idx, -1)}
                    disabled={idx === 0}
                    className="w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground flex items-center justify-center hover:bg-secondary/70 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onMove(idx, 1)}
                    disabled={idx === visibleActions.length - 1}
                    className="w-5 h-5 rounded-full bg-secondary border border-border text-muted-foreground flex items-center justify-center hover:bg-secondary/70 disabled:opacity-30"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemove(type)}
                    className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {editMode && hiddenActions.length > 0 && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-border hover:border-primary hover:text-primary transition-colors text-xs font-medium text-muted-foreground"
          >
            <Plus className="w-3 h-3" />
            Aggiungi
          </button>
        )}
      </div>

      {/* Dialog promemoria */}
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

      {/* Dialog aggiungi azione */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-primary" /> Aggiungi azione rapida
            </DialogTitle>
            <DialogDescription>Scegli un'azione da aggiungere alla barra</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2">
            {hiddenActions.map((type) => {
              const cfg = ACTION_CONFIG[type];
              return (
                <button
                  key={type}
                  onClick={() => { onAdd(type); setAddOpen(false); }}
                  className="flex items-center gap-2.5 p-3 bg-card border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <cfg.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}