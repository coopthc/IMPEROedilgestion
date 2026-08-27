import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Clock } from "lucide-react";

export default function CapacitaAppuntamenti() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState(null);
  const [value, setValue] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ImpostazioneApp.list();
        if (list.length > 0) {
          const s = list[0];
          setId(s.id);
          setValue(s.appuntamenti_contemporanei ?? 1);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { appuntamenti_contemporanei: Number(value) || 1 };
      if (id) {
        await base44.entities.ImpostazioneApp.update(id, payload);
      } else {
        const c = await base44.entities.ImpostazioneApp.create(payload);
        setId(c.id);
      }
      toast({ title: "Capacità salvata" });
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
          <Clock className="w-4 h-4 text-primary" /> Capacità appuntamenti
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quanti appuntamenti contemporanei puoi gestire? Se lavori da solo lascia 1.
          Con una squadra di N persone, imposta N (o N+1 se anche tu fai sopralluoghi).
          Gli slot già pieni verranno automaticamente bloccati nel form.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>Numero appuntamenti contemporanei</Label>
          <Input
            type="number"
            min="1"
            value={value}
            onChange={(e) => setValue(Number(e.target.value) || 1)}
            className="w-32"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Salva
        </Button>
      </div>
    </form>
  );
}