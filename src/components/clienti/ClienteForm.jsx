import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, HardHat, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

const emptyForm = {
  nome: "",
  is_azienda: false,
  azienda: "",
  email: "",
  telefono: "",
  indirizzo: "",
  citta: "",
  cap: "",
  provincia: "",
  piva: "",
  codice_fiscale: "",
  note: "",
};

export default function ClienteForm({ open, onOpenChange, cliente, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [cantieri, setCantieri] = useState([]);

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome || "",
        is_azienda: cliente.is_azienda || false,
        azienda: cliente.azienda || "",
        email: cliente.email || "",
        telefono: cliente.telefono || "",
        indirizzo: cliente.indirizzo || "",
        citta: cliente.citta || "",
        cap: cliente.cap || "",
        provincia: cliente.provincia || "",
        piva: cliente.piva || "",
        codice_fiscale: cliente.codice_fiscale || "",
        note: cliente.note || "",
      });
      base44.entities.Cantiere.filter({ cliente_id: cliente.id })
        .then(setCantieri)
        .catch(() => setCantieri([]));
    } else {
      setForm(emptyForm);
      setCantieri([]);
    }
  }, [cliente, open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    try {
      if (cliente) {
        await base44.entities.Cliente.update(cliente.id, form);
      } else {
        // Crea cliente + cantiere collegato (sono la stessa entità)
        const nuovoCliente = await base44.entities.Cliente.create(form);
        await base44.entities.Cantiere.create({
          nome: form.is_azienda && form.azienda
            ? form.azienda
            : `Cantiere ${form.nome}`,
          cliente_id: nuovoCliente.id,
          cliente_nome: nuovoCliente.nome,
          indirizzo: form.indirizzo || "",
          citta: form.citta || "",
          stato: "bozza",
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio cliente:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? "Modifica cliente" : "Nuovo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Toggle azienda */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="cursor-pointer">È un'azienda</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Attiva per clienti con ragione sociale e P.IVA
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => update("telefono", e.target.value)}
                placeholder="es. +39 333 1234567"
              />
            </div>
          </div>

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

          {/* Cantieri collegati (read-only) */}
          {cliente && cantieri.length > 0 && (
            <div className="space-y-1.5">
              <Label>Cantieri collegati ({cantieri.length})</Label>
              <div className="flex flex-wrap gap-1.5">
                {cantieri.map((cant) => (
                  <Link
                    key={cant.id}
                    to={`/cantieri/${cant.id}`}
                    onClick={() => onOpenChange(false)}
                    className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <HardHat className="w-3 h-3" />
                    {cant.nome}
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </Link>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                I cantieri si collegano automaticamente quando li abbini al cliente.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              rows={2}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
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
              {cliente ? "Salva" : "Crea cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}