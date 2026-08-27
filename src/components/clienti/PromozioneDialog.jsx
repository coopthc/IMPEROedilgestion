import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const RUOLI = [
  { value: "mssg_admin", label: "Supervisore" },
  { value: "mssg_capo", label: "Capocantiere" },
  { value: "mssg_operaio", label: "Operaio" },
];

const LABEL = {
  mssg_admin: "Supervisore",
  mssg_capo: "Capocantiere",
  mssg_operaio: "Operaio",
};

export default function PromozioneDialog({ open, onOpenChange, cliente, onSaved }) {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("mssg_admin");
  const [supPagamenti, setSupPagamenti] = useState(false);
  const [supChat, setSupChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !cliente) return;
    setLoading(true);
    base44.functions
      .invoke("getUtenteGestionale", { user_id: cliente.user_id, cliente_id: cliente.id })
      .then((u) => {
        setUser(u || null);
        if (u) {
          const r = ["mssg_admin", "mssg_capo", "mssg_operaio"].includes(u.role)
            ? u.role
            : "mssg_admin";
          setRole(r);
          setSupPagamenti(!!u.supervisore_pagamenti);
          setSupChat(!!u.supervisore_chat);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [open, cliente]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (role === "mssg_admin") {
        await base44.functions.invoke("aggiornaUtenteGestionale", { user_id: user.id, data: { role, supervisore_pagamenti: supPagamenti, supervisore_chat: supChat } });
      } else {
        const coll = await base44.entities.Collaboratore.create({
          nome: cliente.nome,
          email: cliente.email,
          telefono: cliente.telefono,
          indirizzo: cliente.indirizzo,
          citta: cliente.citta,
          cap: cliente.cap,
          provincia: cliente.provincia,
          piva: cliente.piva,
          codice_fiscale: cliente.codice_fiscale,
          qualifica: role === "mssg_capo" ? "capo_cantiere" : "operaio",
          attivo: true,
          user_id: user.id,
        });
        await base44.functions.invoke("aggiornaUtenteGestionale", { user_id: user.id, data: { role, collaboratore_id: coll.id } });
      }
      toast({
        title: "Utente promosso",
        description: `Ora è ${LABEL[role]}`,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Errore promozione", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Promuovi cliente</DialogTitle>
          <DialogDescription>
            Cambia il livello di accesso dell'utente collegato a questo cliente.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <p className="text-sm text-muted-foreground py-4">
            Questo cliente non ha un account utente collegato. Inserisci un'email
            nel cliente per abilitarlo, poi potrai promuoverlo.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Utente:</p>
              <p className="font-medium">{user.full_name || user.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nuovo livello</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {RUOLI.map((r) => (
                  <option key={r.value} value={r.value} className="bg-card">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {role === "mssg_admin" && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-secondary/30">
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
              </div>
            )}
            {role !== "mssg_admin" && (
              <p className="text-[11px] text-muted-foreground">
                Verrà creato un collaboratore con i dati del cliente e l'utente
                sarà spostato tra i collaboratori.
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || !user}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Promuovi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}