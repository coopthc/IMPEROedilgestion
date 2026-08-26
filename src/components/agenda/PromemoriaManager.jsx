import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, Bell, Loader2, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PromemoriaManager() {
  const { toast } = useToast();
  const [promemoria, setPromemoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nuovo, setNuovo] = useState({ titolo: "", data: "", ora: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Promemoria.list("-data");
      setPromemoria(data);
    } catch { /* ignora */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!nuovo.titolo.trim() || !nuovo.data) return;
    setSaving(true);
    try {
      await base44.entities.Promemoria.create({
        titolo: nuovo.titolo,
        data: nuovo.data,
        ora: nuovo.ora || "",
      });
      setNuovo({ titolo: "", data: "", ora: "" });
      await load();
      toast({ title: "Promemoria aggiunto" });
    } catch (err) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (p) => {
    try {
      await base44.entities.Promemoria.update(p.id, { completato: !p.completato });
      setPromemoria((prev) => prev.map((x) => (x.id === p.id ? { ...x, completato: !x.completato } : x)));
    } catch { /* ignora */ }
  };

  const remove = async (p) => {
    try {
      await base44.entities.Promemoria.delete(p.id);
      setPromemoria((prev) => prev.filter((x) => x.id !== p.id));
    } catch { /* ignora */ }
  };

  const today = new Date().toISOString().split("T")[0];
  const oggi = promemoria.filter((p) => p.data === today && !p.completato);
  const futuri = promemoria.filter((p) => p.data > today && !p.completato);
  const completati = promemoria.filter((p) => p.completato);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Promemoria veloce
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Inserisci rapidamente un promemoria: "chiama avvocato ore 12", "comprare materiali", ecc.
        </p>
        <form onSubmit={add} className="flex flex-wrap gap-2 items-center">
          <Input
            value={nuovo.titolo}
            onChange={(e) => setNuovo((f) => ({ ...f, titolo: e.target.value }))}
            placeholder="es. Chiama avvocato"
            required
            className="flex-1 min-w-[160px]"
          />
          <Input
            type="date"
            value={nuovo.data}
            onChange={(e) => setNuovo((f) => ({ ...f, data: e.target.value }))}
            required
            className="w-auto"
          />
          <Input
            type="time"
            value={nuovo.ora}
            onChange={(e) => setNuovo((f) => ({ ...f, ora: e.target.value }))}
            className="w-auto"
          />
          <Button type="submit" size="icon" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {oggi.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Oggi</h4>
              <div className="space-y-1.5">
                {oggi.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5 bg-card border border-primary/30 rounded-lg">
                    <button onClick={() => toggleDone(p)} className="w-5 h-5 rounded-full border-2 border-primary/40 hover:bg-primary/10 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.titolo}</div>
                      {p.ora && <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{p.ora}</div>}
                    </div>
                    <button onClick={() => remove(p)} className="p-1 rounded hover:bg-destructive/15 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {futuri.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Prossimi</h4>
              <div className="space-y-1.5">
                {futuri.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5 bg-card border border-border rounded-lg">
                    <button onClick={() => toggleDone(p)} className="w-5 h-5 rounded-full border-2 border-border hover:bg-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.titolo}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(p.data + "T00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                        {p.ora && ` — ${p.ora}`}
                      </div>
                    </div>
                    <button onClick={() => remove(p)} className="p-1 rounded hover:bg-destructive/15 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completati.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Completati</h4>
              <div className="space-y-1.5">
                {completati.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5 bg-secondary/30 rounded-lg opacity-60">
                    <button onClick={() => toggleDone(p)} className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-500" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate line-through">{p.titolo}</div>
                    </div>
                    <button onClick={() => remove(p)} className="p-1 rounded hover:bg-destructive/15 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {promemoria.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-8">Nessun promemoria. Aggiungine uno!</p>
          )}
        </>
      )}
    </div>
  );
}