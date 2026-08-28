import React, { useState } from "react";
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
import { invitaUtenteConRuolo } from "@/lib/invitaUtente";

const QUALIFICHE = [
  { value: "operaio", label: "Operaio", role: "mssg_operaio" },
  { value: "capo_cantiere", label: "Capocantiere", role: "mssg_capo" },
  { value: "supervisore", label: "Supervisore", role: "mssg_admin" },
  { value: "amministrazione", label: "Amministrazione", role: "mssg_admin" },
  { value: "amministratore", label: "Amministratore", role: "mssg_admin" },
  { value: "altro", label: "Altro", role: "mssg_operaio" },
];

export default function PromuoviContattoDialog({ open, onOpenChange, contatto, onSaved }) {
  const { toast } = useToast();
  const [qualifica, setQualifica] = useState("operaio");
  const [invita, setInvita] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open && contatto) {
      setQualifica("operaio");
      setInvita(true);
    }
  }, [open, contatto]);

  const handleSave = async () => {
    if (!contatto) return;
    setSaving(true);
    try {
      const q = QUALIFICHE.find((x) => x.value === qualifica);
      const coll = await base44.entities.Collaboratore.create({
        nome: contatto.nome,
        azienda: contatto.azienda || "",
        is_azienda: !!contatto.azienda,
        email: contatto.email || "",
        telefono: contatto.telefono || "",
        qualifica: qualifica,
        attivo: true,
      });

      if (invita && contatto.email) {
        try {
          const invitedUser = await invitaUtenteConRuolo(
            contatto.email,
            q.role,
            { collaboratore_id: coll.id },
            contatto.nome
          );
          if (invitedUser) {
            await base44.entities.Collaboratore.update(coll.id, {
              user_id: invitedUser.id,
            });
          }
          toast({
            title: "Contatto promosso",
            description: `Collaboratore ${q.label} creato e invito inviato a ${contatto.email}`,
          });
        } catch (err) {
          toast({
            title: "Collaboratore creato, invito non inviato",
            description: "Verifica l'email o reinvia più tardi.",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Contatto promosso", description: `Collaboratore ${q.label} creato` });
      }

      onSaved?.();
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
          <DialogTitle>Promuovi a collaboratore</DialogTitle>
          <DialogDescription>
            Trasforma questo contatto in un collaboratore aziendale. Potrai
            poi gestirlo dalla pagina Collaboratori.
          </DialogDescription>
        </DialogHeader>
        {contatto && (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Contatto:</p>
              <p className="font-medium">{contatto.nome}</p>
              {contatto.email && (
                <p className="text-xs text-muted-foreground">{contatto.email}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Qualifica</Label>
              <select
                value={qualifica}
                onChange={(e) => setQualifica(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {QUALIFICHE.map((q) => (
                  <option key={q.value} value={q.value} className="bg-card">
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
            {contatto.email && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="cursor-pointer">Invita come utente</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Invia email di accesso con il ruolo corrispondente
                  </p>
                </div>
                <Switch checked={invita} onCheckedChange={setInvita} />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || !contatto}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Promuovi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}