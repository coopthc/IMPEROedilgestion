import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail } from "lucide-react";
import { invitaUtenteConRuolo } from "@/lib/invitaUtente";

// Solo amministratori: clienti e collaboratori si creano dalle rispettive sezioni.
const LIVELLI = [
  { value: "admin", label: "Amministratore" },
  { value: "mssg_admin", label: "Supervisore" },
];

const LIVELLO_LABEL = LIVELLI.reduce((acc, l) => {
  acc[l.value] = l.label;
  return acc;
}, {});

export default function UtenteFormDialog({ open, onOpenChange, utente, onSaved }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("mssg_admin");
  const [ruoloPersonalizzato, setRuoloPersonalizzato] = useState("");
  const [supPagamenti, setSupPagamenti] = useState(false);
  const [supChat, setSupChat] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (utente) {
      setEmail(utente.email || "");
      setRole(utente.role === "admin" ? "admin" : "mssg_admin");
      setRuoloPersonalizzato(utente.ruolo_personalizzato || "");
      setSupPagamenti(!!utente.supervisore_pagamenti);
      setSupChat(!!utente.supervisore_chat);
    } else {
      setEmail("");
      setRole("mssg_admin");
      setRuoloPersonalizzato("");
      setSupPagamenti(false);
      setSupChat(false);
    }
  }, [open, utente]);

  const isSupervisore = role === "mssg_admin";

  const handleSave = async () => {
    if (!utente && !email.trim()) {
      toast({ title: "Inserisci l'email", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const dataExtra = {
        ruolo_personalizzato: ruoloPersonalizzato.trim() || undefined,
        supervisore_pagamenti: isSupervisore ? supPagamenti : false,
        supervisore_chat: isSupervisore ? supChat : false,
      };

      if (utente) {
        await base44.entities.User.update(utente.id, { role, ...dataExtra });
        toast({ title: "Amministratore aggiornato" });
      } else {
        await invitaUtenteConRuolo(email.trim(), role, dataExtra);
        toast({ title: "Invito inviato", description: email.trim() });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Errore",
        description: err?.message || "Operazione non riuscita",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const reinvita = async () => {
    if (!utente?.email) return;
    try {
      await invitaUtenteConRuolo(utente.email, utente.role);
      toast({ title: "Email re-inviata", description: utente.email });
    } catch (err) {
      toast({ title: "Errore invio email", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {utente ? "Modifica amministratore" : "Nuovo amministratore"}
          </DialogTitle>
          <DialogDescription>
            {utente
              ? "Modifica livello di accesso e permessi."
              : "Invita un nuovo amministratore o supervisore. Clienti e collaboratori si creano dalle rispettive sezioni."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!utente}
              placeholder="nome@email.com"
            />
            {utente && (
              <button
                onClick={reinvita}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="w-3 h-3" /> Re-invia invito
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Livello di accesso</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {LIVELLI.map((l) => (
                <option key={l.value} value={l.value} className="bg-card">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Etichetta personalizzata (opzionale)</Label>
            <Input
              value={ruoloPersonalizzato}
              onChange={(e) => setRuoloPersonalizzato(e.target.value)}
              placeholder="es. Direttore, Capoarea..."
            />
          </div>

          {isSupervisore && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-secondary/30">
              <p className="text-xs font-semibold text-primary">
                Permessi supervisore
              </p>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal cursor-pointer">
                  Pagamenti visibili
                </Label>
                <Switch checked={supPagamenti} onCheckedChange={setSupPagamenti} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal cursor-pointer">
                  Chat cliente visibili
                </Label>
                <Switch checked={supChat} onCheckedChange={setSupChat} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Se attivi, il supervisore può vedere, scrivere nella chat e
                saldare i pagamenti come un amministratore.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {utente ? "Salva" : "Invita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { LIVELLO_LABEL };