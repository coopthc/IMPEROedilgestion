import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Upload, Building, Trash2, Clock } from "lucide-react";

const empty = {
  ragione_sociale: "", logo_url: "", piva: "", codice_fiscale: "",
  indirizzo: "", citta: "", cap: "", provincia: "", telefono: "", email_azienda: "",
  appuntamenti_contemporanei: 1,
};

export default function DatiAzienda() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [id, setId] = useState(null);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ImpostazioneApp.list();
        if (list.length > 0) {
          const s = list[0];
          setId(s.id);
          setForm({ ...empty, ...s });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, logo_url: file_url }));
    } catch {
      toast({ title: "Errore caricamento logo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Strip built-in fields before sending
      const { id: _id, created_date: _cd, updated_date: _ud, created_by_id: _cb, ...payload } = form;
      if (id) {
        await base44.entities.ImpostazioneApp.update(id, payload);
      } else {
        const c = await base44.entities.ImpostazioneApp.create(payload);
        setId(c.id);
      }
      toast({ title: "Dati azienda salvati" });
    } catch (err) {
      toast({ title: "Errore", description: err?.message || "Salvataggio fallito", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <form onSubmit={save} className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Building className="w-4 h-4 text-primary" /> Dati azienda / Fatturazione
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Verranno usati come firma in tutte le email inviate dal gestionale.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
          {form.logo_url ? (
            <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
          ) : (
            <Building className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <Label className="text-xs">Logo azienda</Label>
          <div className="flex items-center gap-2 mt-1">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Carica logo
              <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            </label>
            {form.logo_url && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, logo_url: "" }))} className="text-xs text-destructive flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Rimuovi
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ragione sociale</Label>
          <Input value={form.ragione_sociale} onChange={(e) => setForm((f) => ({ ...f, ragione_sociale: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Email azienda</Label>
          <Input type="email" value={form.email_azienda} onChange={(e) => setForm((f) => ({ ...f, email_azienda: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>P.IVA</Label>
          <Input value={form.piva} onChange={(e) => setForm((f) => ({ ...f, piva: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Codice fiscale</Label>
          <Input value={form.codice_fiscale} onChange={(e) => setForm((f) => ({ ...f, codice_fiscale: e.target.value }))} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Indirizzo</Label>
          <Input value={form.indirizzo} onChange={(e) => setForm((f) => ({ ...f, indirizzo: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>CAP</Label>
          <Input value={form.cap} onChange={(e) => setForm((f) => ({ ...f, cap: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Città</Label>
          <Input value={form.citta} onChange={(e) => setForm((f) => ({ ...f, citta: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Provincia</Label>
          <Input value={form.provincia} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefono</Label>
          <Input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
        </div>
      </div>

      <div className="bg-secondary/30 border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Capacità appuntamenti</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Quanti appuntamenti contemporanei puoi gestire? Se lavori da solo
          lascia 1. Con una squadra di N persone, imposta N (o N+1 se anche tu
          fai sopralluoghi). Gli slot già pieni verranno automaticamente
          bloccati nel form.
        </p>
        <Input
          type="number"
          min="1"
          value={form.appuntamenti_contemporanei}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              appuntamenti_contemporanei: Number(e.target.value) || 1,
            }))
          }
          className="w-24"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Salva dati azienda
        </Button>
      </div>
    </form>
  );
}