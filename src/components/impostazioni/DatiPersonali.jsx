import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Building2, UserCircle } from "lucide-react";

export default function DatiPersonali() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
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
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.auth.updateMe(form);
      await checkUserAuth();
      toast({ title: "Dati personali salvati" });
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
          <User className="w-4 h-4 text-primary" /> Dati personali
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Le tue informazioni personali e di fatturazione.
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
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={user?.full_name || ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled />
        </div>

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
          Salva dati personali
        </Button>
      </div>
    </form>
  );
}