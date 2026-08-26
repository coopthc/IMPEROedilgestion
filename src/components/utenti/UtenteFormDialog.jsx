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

// Livelli di accesso -> role
const LIVELLI = [
  { value: "admin", label: "Amministratore" },
  { value: "mssg_admin", label: "Supervisore" },
  { value: "mssg_capo", label: "Capocantiere" },
  { value: "mssg_operaio", label: "Operaio" },
  { value: "mssg_cliente", label: "Cliente" },
];

const LIVELLO_LABEL = LIVELLI.reduce((acc, l) => {
  acc[l.value] = l.label;
  return acc;
}, {});

export default function UtenteFormDialog({ open, onOpenChange, utente, onSaved }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("mssg_capo");
  const [ruoloPersonalizzato, setRuoloPersonalizzato] = useState("");
  const [supPagamenti, setSupPagamenti] = useState(false);
  const [supChat, setSupChat] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [collaboratoreId, setCollaboratoreId] = useState("");
  const [clienti, setClienti] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (utente) {
      setEmail(utente.email || "");
      setRole(utente.role || "mssg_capo");
      setRuoloPersonalizzato(utente.ruolo_personalizzato || "");
      setSupPagamenti(!!utente.supervisore_pagamenti);
      setSupChat(!!utente.supervisore_chat);
      setClienteId(utente.cliente_id || "");
      setCollaboratoreId(utente.collaboratore_id || "");
    } else {
      setEmail("");
      setRole("mssg_capo");
      setRuoloPersonalizzato("");
      setSupPagamenti(false);
      setSupChat(false);
      setClienteId("");
      setCollaboratoreId("");
    }
  }, [open, utente]);

  useEffect(() => {
    if (!open) return;
    base44.entities.Cliente.list().then(setClienti).catch(() => {});
    base44.entities.Collaboratore.list().then(setCollaboratori).catch(() => {});
  }, [open]);

  const isSupervisore = role === "mssg_admin";
  const isCliente = role === "mssg_cliente";
  const isInterno = role === "mssg_capo" || role === "mssg_operaio";

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
        cliente_id: isCliente ? clienteId || undefined : undefined,
        collaboratore_id: isInterno ? collaboratoreId || undefined : undefined,
      };

      if (utente) {
        await base44.entities.User.update(utente.id, { role, ...dataExtra });
        toast({ title: "Utente aggiornato" });
      } else {
        await base44.users.inviteUser(email.trim(), role);
        // Aggiorna i dati extra sul record utente appena creato
        try {
          const users = await base44.entities.User.list();
          const nu = users.find(
            (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
          );
          if (nu) {
            await base44.entities.User.update(nu.id, dataExtra);
          }
        } catch {
          /* l'invito è comunque partito */
        }
        toast({
          title: "Invito inviato",
          description: email.trim(),
        });
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
      await base44.users.inviteUser(utente.email, utente.role);
      toast({ title: "Email re-inviata", description: utente.email });
    } catch (err) {
      toast({ title: "Errore invio email", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{utente ? "Modifica utente" : "Nuovo utente"}</DialogTitle>
          <DialogDescription>
            {utente
              ? "Modifica livello di accesso e permessi del supervisore."
              : "Invita un nuovo utente e assegnagli un livello di accesso."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
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

          {/* Livello di accesso */}
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

          {/* Etichetta personalizzata */}
          <div className="space-y-1.5">
            <Label>Etichetta personalizzata (opzionale)</Label>
            <Input
              value={ruoloPersonalizzato}
              onChange={(e) => setRuoloPersonalizzato(e.target.value)}
              placeholder="es. Tecnico esterno, Geometra, Caposquadra..."
            />
            <p className="text-[11px] text-muted-foreground">
              Sovrascrive l'etichetta del ruolo nell'interfaccia.
            </p>
          </div>

          {/* Toggles supervisore */}
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
                Se attivi, il supervisore può vedere, scrivere nella chat e saldare
                i pagamenti come un amministratore.
              </p>
            </div>
          )}

          {/* Collegamento cliente */}
          {isCliente && (
            <div className="space-y-1.5">
              <Label>Cliente collegato</Label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" className="bg-card">
                  — Seleziona cliente —
                </option>
                {clienti.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card">
                    {c.nome} {c.azienda ? `(${c.azienda})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collegamento collaboratore */}
          {isInterno && (
            <div className="space-y-1.5">
              <Label>Collaboratore collegato (opzionale)</Label>
              <select
                value={collaboratoreId}
                onChange={(e) => setCollaboratoreId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" className="bg-card">
                  — Nessuno —
                </option>
                {collaboratori.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card">
                    {c.nome}
                  </option>
                ))}
              </select>
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