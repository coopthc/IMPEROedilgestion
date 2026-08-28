import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function ContattoForm({ open, onOpenChange, contatto, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [azienda, setAzienda] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (contatto) {
      setNome(contatto.nome || "");
      setAzienda(contatto.azienda || "");
      setTelefono(contatto.telefono || "");
      setEmail(contatto.email || "");
      setRuolo(contatto.ruolo || "");
      setNote(contatto.note || "");
    } else {
      setNome("");
      setAzienda("");
      setTelefono("");
      setEmail("");
      setRuolo("");
      setNote("");
    }
  }, [open, contatto]);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Inserisci il nome", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        azienda: azienda.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        ruolo: ruolo.trim() || undefined,
        note: note.trim() || undefined,
      };
      if (contatto) {
        await base44.entities.Contatto.update(contatto.id, payload);
        toast({ title: "Contatto aggiornato" });
      } else {
        // Nuovo contatto: eredita lo stato di condivisione della rubrica del proprietario
        await base44.entities.Contatto.create({
          ...payload,
          proprietario_nome: user?.full_name || user?.email || "",
          condivisa: !!user?.rubrica_condivisa,
        });
        toast({ title: "Contatto creato" });
      }
      onSaved?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{contatto ? "Modifica contatto" : "Nuovo contatto"}</DialogTitle>
          <DialogDescription>
            {contatto ? "Modifica i dati del contatto." : "Aggiungi un contatto alla tua rubrica."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Mario Rossi" />
          </div>
          <div className="space-y-1.5">
            <Label>Azienda</Label>
            <Input value={azienda} onChange={(e) => setAzienda(e.target.value)} placeholder="Rossi S.r.l." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+39 333..." />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario@email.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ruolo / Qualifica</Label>
            <Input value={ruolo} onChange={(e) => setRuolo(e.target.value)} placeholder="es. Fornitore, Geometra..." />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note libere..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {contatto ? "Salva" : "Aggiungi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}