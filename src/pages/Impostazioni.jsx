import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Mail } from "lucide-react";

export default function Impostazioni() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [form, setForm] = useState({
    nome_mittente: "",
    oggetto_email_pagamento: "",
    corpo_email_pagamento: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ImpostazioneApp.list();
        if (list.length > 0) {
          const s = list[0];
          setSettingsId(s.id);
          setForm({
            nome_mittente: s.nome_mittente || "",
            oggetto_email_pagamento: s.oggetto_email_pagamento || "",
            corpo_email_pagamento: s.corpo_email_pagamento || "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (settingsId) {
        await base44.entities.ImpostazioneApp.update(settingsId, form);
      } else {
        const created = await base44.entities.ImpostazioneApp.create(form);
        setSettingsId(created.id);
      }
      toast({ title: "Impostazioni salvate" });
    } catch (err) {
      toast({ title: "Errore", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Impostazioni email
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura i modelli email per i promemoria pagamento inviati ai clienti.
        </p>
      </div>

      <form onSubmit={save} className="bg-card border border-border rounded-lg p-5 space-y-4 max-w-2xl">
        <div className="space-y-1.5">
          <Label htmlFor="mittente">Nome mittente</Label>
          <Input
            id="mittente"
            value={form.nome_mittente}
            onChange={(e) => setForm((f) => ({ ...f, nome_mittente: e.target.value }))}
            placeholder="es. EdilGestion"
          />
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold mb-1">Promemoria pagamento</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Modello email inviato al cliente quando premi "Invia notifica" su una milestone di pagamento.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="oggetto">Oggetto</Label>
            <Input
              id="oggetto"
              value={form.oggetto_email_pagamento}
              onChange={(e) => setForm((f) => ({ ...f, oggetto_email_pagamento: e.target.value }))}
              placeholder="Promemoria pagamento: {titolo}"
            />
          </div>
          <div className="space-y-1.5 mt-3">
            <Label htmlFor="corpo">Corpo email</Label>
            <Textarea
              id="corpo"
              rows={8}
              value={form.corpo_email_pagamento}
              onChange={(e) => setForm((f) => ({ ...f, corpo_email_pagamento: e.target.value }))}
              placeholder={"Gentile {cliente},\n\nLe ricordiamo il pagamento \"{titolo}\" per il cantiere {cantiere}.\nImporto: {importo}\nScadenza: {scadenza}\n\nCordiali saluti"}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground bg-secondary/30 rounded-md p-3">
            <strong>Variabili disponibili:</strong> {"{cliente}"}, {"{cantiere}"}, {"{titolo}"}, {"{importo}"}, {"{scadenza}"}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Salva impostazioni
          </Button>
        </div>
      </form>
    </div>
  );
}