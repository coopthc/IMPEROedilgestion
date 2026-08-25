import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const QUALIFICHE = [
  { value: "capo_cantiere", label: "Capo cantiere" },
  { value: "operaio", label: "Operaio" },
  { value: "tecnico", label: "Tecnico" },
  { value: "amministrazione", label: "Amministrazione" },
  { value: "altro", label: "Altro" },
];

const RUOLO_MAP = {
  capo_cantiere: "mssg_capo",
  operaio: "mssg_operaio",
  tecnico: "mssg_operaio",
  amministrazione: "mssg_admin",
  altro: "mssg_operaio",
};

const emptyForm = {
  nome: "",
  is_azienda: false,
  azienda: "",
  qualifica: "operaio",
  costo_orario: "",
  telefono: "",
  email: "",
  indirizzo: "",
  citta: "",
  cap: "",
  provincia: "",
  piva: "",
  codice_fiscale: "",
  attivo: true,
  cantiere_id: "",
  invita_utente: true,
};

export default function CollaboratoreForm({ open, onOpenChange, collaboratore, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [cantieri, setCantieri] = useState([]);
  const [invited, setInvited] = useState(false);

  useEffect(() => {
    if (collaboratore) {
      setForm({
        nome: collaboratore.nome || "",
        is_azienda: collaboratore.is_azienda || false,
        azienda: collaboratore.azienda || "",
        qualifica: collaboratore.qualifica || "operaio",
        costo_orario: collaboratore.costo_orario ?? "",
        telefono: collaboratore.telefono || "",
        email: collaboratore.email || "",
        indirizzo: collaboratore.indirizzo || "",
        citta: collaboratore.citta || "",
        cap: collaboratore.cap || "",
        provincia: collaboratore.provincia || "",
        piva: collaboratore.piva || "",
        codice_fiscale: collaboratore.codice_fiscale || "",
        attivo: collaboratore.attivo !== false,
        cantiere_id: "",
        invita_utente: false,
      });
      setInvited(!!collaboratore.user_id);
    } else {
      setForm(emptyForm);
      setInvited(false);
    }
  }, [collaboratore, open]);

  useEffect(() => {
    if (open) {
      base44.entities.Cantiere.filter({ stato: "attivo" }).then(setCantieri).catch(() => {});
    }
  }, [open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const invitaUtente = async (email, qualifica) => {
    const ruolo = RUOLO_MAP[qualifica] || "mssg_operaio";
    try {
      await base44.users.inviteUser(email, ruolo);
      return true;
    } catch (err) {
      // Se l'utente esiste già, non è un errore bloccante
      console.error("Errore invito utente:", err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    const payload = {
      ...form,
      costo_orario: form.costo_orario === "" ? null : Number(form.costo_orario),
    };
    delete payload.cantiere_id;
    delete payload.invita_utente;
    try {
      let saved;
      if (collaboratore) {
        saved = await base44.entities.Collaboratore.update(collaboratore.id, payload);
      } else {
        saved = await base44.entities.Collaboratore.create(payload);
      }

      // Invita utente se richiesto e c'è una email
      if (form.invita_utente && form.email) {
        const ok = await invitaUtente(form.email, form.qualifica);
        if (ok) {
          toast({ title: "Email di benvenuto inviata", description: form.email });
          // Tenta di collegare lo user_id
          try {
            const users = await base44.entities.User.list();
            const found = users.find((u) => u.email === form.email);
            if (found) {
              await base44.entities.Collaboratore.update(saved.id, { user_id: found.id });
              setInvited(true);
            }
          } catch (e) {
            console.error("Collegamento user_id fallito:", e);
          }
        }
      }

      // Abbinamento opzionale a cantiere attivo
      if (form.cantiere_id) {
        const cantiere = cantieri.find((c) => c.id === form.cantiere_id);
        if (cantiere) {
          const existingIds = (cantiere.collaboratori_ids || "").split(",").filter(Boolean);
          if (!existingIds.includes(saved.id)) {
            const newIds = [...existingIds, saved.id];
            let ruoli = {};
            try { ruoli = JSON.parse(cantiere.collaboratori_ruoli || "{}"); } catch {}
            ruoli[saved.id] = "operaio";
            await base44.entities.Cantiere.update(cantiere.id, {
              collaboratori_ids: newIds.join(","),
              collaboratori_ruoli: JSON.stringify(ruoli),
            });
            toast({ title: `Abbinato al cantiere: ${cantiere.nome}` });
          }
        }
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio collaboratore:", err);
      toast({ title: "Errore durante il salvataggio", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {collaboratore ? "Modifica collaboratore" : "Nuovo collaboratore"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Toggle azienda */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="cursor-pointer">È un'azienda</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Attiva per fornitori / ditte con ragione sociale
              </p>
            </div>
            <Switch
              checked={form.is_azienda}
              onCheckedChange={(v) => update("is_azienda", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nome">
              {form.is_azienda ? "Nome referente *" : "Nome *"}
            </Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="es. Mario Rossi"
              required
            />
          </div>

          {form.is_azienda && (
            <div className="space-y-1.5">
              <Label htmlFor="azienda">Ragione sociale</Label>
              <Input
                id="azienda"
                value={form.azienda}
                onChange={(e) => update("azienda", e.target.value)}
                placeholder="es. Rossi Costruzioni Srl"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Qualifica</Label>
              <Select
                value={form.qualifica}
                onValueChange={(v) => update("qualifica", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICHE.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costo_orario">Costo orario (€)</Label>
              <Input
                id="costo_orario"
                type="number"
                step="0.01"
                min="0"
                value={form.costo_orario}
                onChange={(e) => update("costo_orario", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => update("telefono", e.target.value)}
                placeholder="es. +39 333 1234567"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </div>

          {/* Invito utente + email benvenuto */}
          {form.email && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="cursor-pointer flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Invita utente e invia email di benvenuto
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invited
                    ? "Utente già invitato. Riattiva per re-inviare l'email."
                    : "Invia email con istruzioni per impostare la password"}
                </p>
              </div>
              <Switch
                checked={form.invita_utente}
                onCheckedChange={(v) => update("invita_utente", v)}
              />
            </div>
          )}

          {/* Abbinamento opzionale a cantiere */}
          {!collaboratore && (
            <div className="space-y-1.5">
              <Label>Abbinamento cantiere (opzionale)</Label>
              <Select
                value={form.cantiere_id || "__none__"}
                onValueChange={(v) => update("cantiere_id", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un cantiere attivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nessun cantiere —</SelectItem>
                  {cantieri.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sezione fatturazione */}
          <div className="pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 pb-1.5 border-b border-border">
              Dati di fatturazione
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="indirizzo">Indirizzo</Label>
                <Input
                  id="indirizzo"
                  value={form.indirizzo}
                  onChange={(e) => update("indirizzo", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="citta">Città</Label>
                  <Input
                    id="citta"
                    value={form.citta}
                    onChange={(e) => update("citta", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cap">CAP</Label>
                  <Input
                    id="cap"
                    value={form.cap}
                    onChange={(e) => update("cap", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provincia">Provincia</Label>
                  <Input
                    id="provincia"
                    value={form.provincia}
                    onChange={(e) => update("provincia", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="piva">Partita IVA</Label>
                  <Input
                    id="piva"
                    value={form.piva}
                    onChange={(e) => update("piva", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="codice_fiscale">Codice fiscale</Label>
                  <Input
                    id="codice_fiscale"
                    value={form.codice_fiscale}
                    onChange={(e) => update("codice_fiscale", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="attivo" className="cursor-pointer">
                Attivo
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disattiva per ex collaboratori
              </p>
            </div>
            <Switch
              id="attivo"
              checked={form.attivo}
              onCheckedChange={(v) => update("attivo", v)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {collaboratore ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}