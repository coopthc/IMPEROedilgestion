import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Building2, UserCircle } from "lucide-react";

export default function DatiPersonali() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cliente, setCliente] = useState(null);

  const isCliente = user?.role === "mssg_cliente";
  const clienteId = user?.cliente_id || user?.data?.cliente_id;

  // Per mssg_cliente: carica il record Cliente
  useEffect(() => {
    if (isCliente && clienteId) {
      base44.entities.Cliente.get(clienteId)
        .then((c) => {
          setCliente(c);
          setForm({
            nome: c.nome ?? "",
            is_azienda: c.is_azienda ?? false,
            azienda: c.azienda ?? "",
            email: c.email ?? "",
            piva: c.piva ?? "",
            codice_fiscale: c.codice_fiscale ?? "",
            telefono: c.telefono ?? "",
            indirizzo: c.indirizzo ?? "",
            citta: c.citta ?? "",
            cap: c.cap ?? "",
            provincia: c.provincia ?? "",
          });
        })
        .catch(() => {
          toast({ title: "Errore caricamento dati cliente", variant: "destructive" });
        });
    }
  }, [isCliente, clienteId]);

  // Per altri ruoli: carica dal profilo User
  useEffect(() => {
    if (!isCliente && user) {
      setForm({
        is_azienda: user.is_azienda ?? false,
        azienda: user.azienda ?? "",
        piva: user.piva ?? "",
        codice_fiscale: user.codice_fiscale ?? "",
        telefono: user.telefono ?? "",
        indirizzo: user.indirizzo ?? "",
        citta: user.citta ?? "",
        cap: user.cap ?? "",
        provincia: user.provincia ?? "",
      });
    }
  }, [user, isCliente]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isCliente && clienteId) {
        // Salva tramite funzione backend (bypassa RLS, pulisce campi azienda se privato)
        await base44.functions.invoke("aggiornaProfiloCliente", {
          cliente_id: clienteId,
          nome: form.nome,
          is_azienda: form.is_azienda,
          azienda: form.azienda,
          email: form.email,
          piva: form.piva,
          codice_fiscale: form.codice_fiscale,
          telefono: form.telefono,
          indirizzo: form.indirizzo,
          citta: form.citta,
          cap: form.cap,
          provincia: form.provincia,
        });
        toast({ title: "Dati salvati", description: "I tuoi dati sono stati aggiornati." });
      } else {
        // Salva sul profilo User
        await base44.auth.updateMe(form);
        await checkUserAuth();
        toast({ title: "Dati personali salvati" });
      }
    } catch (err) {
      toast({ title: "Errore salvataggio", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <form onSubmit={save} className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-primary" /> Dati personali
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Le tue informazioni personali, dati di fatturazione e tipo di account (privato o azienda).
        </p>
      </div>

      {/* Toggle Azienda / Privato */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, is_azienda: false }))}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !form.is_azienda ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
          }`}
        >
          <UserCircle className="w-4 h-4" /> Privato
        </button>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, is_azienda: true }))}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            form.is_azienda ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
          }`}
        >
          <Building2 className="w-4 h-4" /> Azienda
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {isCliente ? (
          // Campi per cliente (da entità Cliente)
          <>
            <div className="space-y-1.5">
              <Label>Nome referente</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome e cognome"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email di contatto</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email di contatto"
              />
            </div>
          </>
        ) : (
          // Campi per altri ruoli (da User)
          <>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={user?.full_name || ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
          </>
        )}

        {form.is_azienda && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Ragione sociale</Label>
            <Input
              value={form.azienda}
              onChange={(e) => setForm((f) => ({ ...f, azienda: e.target.value }))}
              placeholder="Nome dell'azienda"
            />
          </div>
        )}

        {form.is_azienda && (
          <div className="space-y-1.5">
            <Label>P.IVA</Label>
            <Input
              value={form.piva}
              onChange={(e) => setForm((f) => ({ ...f, piva: e.target.value }))}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Codice fiscale</Label>
          <Input
            value={form.codice_fiscale}
            onChange={(e) => setForm((f) => ({ ...f, codice_fiscale: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Telefono</Label>
          <Input
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Indirizzo</Label>
          <Input
            value={form.indirizzo}
            onChange={(e) => setForm((f) => ({ ...f, indirizzo: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>CAP</Label>
          <Input
            value={form.cap}
            onChange={(e) => setForm((f) => ({ ...f, cap: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Città</Label>
          <Input
            value={form.citta}
            onChange={(e) => setForm((f) => ({ ...f, citta: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Provincia</Label>
          <Input
            value={form.provincia}
            onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Salva dati
        </Button>
      </div>
    </form>
  );
}