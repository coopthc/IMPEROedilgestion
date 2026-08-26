import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Plus, Trash2, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function WidgetPromemoria() {
  const { toast } = useToast();
  const [promemoria, setPromemoria] = useState(null);
  const [nuovo, setNuovo] = useState({ titolo: "", data: "", ora: "" });
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    try {
      const data = await base44.entities.Promemoria.list("-data");
      setPromemoria(data);
    } catch { setPromemoria([]); }
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
      setShowAdd(false);
      await load();
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

  if (!promemoria) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const today = new Date().toISOString().split("T")[0];
  const todayRems = promemoria.filter((p) => p.data === today && !p.completato);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Promemoria</h3>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="text-primary hover:bg-primary/10 rounded p-1">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={add} className="space-y-2 mb-3 p-2 bg-secondary/30 rounded-lg">
          <Input
            value={nuovo.titolo}
            onChange={(e) => setNuovo((f) => ({ ...f, titolo: e.target.value }))}
            placeholder="es. Chiama avvocato"
            required
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Input type="date" value={nuovo.data} onChange={(e) => setNuovo((f) => ({ ...f, data: e.target.value }))} required className="h-8 text-xs flex-1" />
            <Input type="time" value={nuovo.ora} onChange={(e) => setNuovo((f) => ({ ...f, ora: e.target.value }))} className="h-8 text-xs w-auto" />
            <button type="submit" disabled={saving} className="px-3 rounded bg-primary text-primary-foreground text-xs font-medium">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
            </button>
          </div>
        </form>
      )}

      {todayRems.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4 text-center">Nessun promemoria per oggi</p>
      ) : (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {todayRems.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-2 bg-secondary/40 rounded-lg">
              <button onClick={() => toggleDone(p)} className="w-4 h-4 rounded-full border-2 border-primary/40 hover:bg-primary/10 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{p.titolo}</div>
                {p.ora && <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{p.ora}</div>}
              </div>
              <button onClick={() => remove(p)} className="p-1 rounded hover:bg-destructive/15 text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}