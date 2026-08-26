import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Palette, Moon, Sun, RotateCcw } from "lucide-react";
import {
  TEMA_DARK,
  TEMA_CHIARO,
  TEMA_TOKENS,
  TEMA_GROUP_LABELS,
  applyTema,
  hslStringToHex,
  hexToHslString,
} from "@/lib/tema";

export default function TemaGestionale() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState(null);
  const [mode, setMode] = useState("dark");
  const [colors, setColors] = useState(TEMA_DARK);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ImpostazioneApp.list();
        if (list.length > 0) {
          setId(list[0].id);
          if (list[0].tema_json) {
            const tema = JSON.parse(list[0].tema_json);
            const m = tema.mode || "dark";
            setMode(m);
            const preset = m === "light" ? TEMA_CHIARO : TEMA_DARK;
            setColors({ ...preset, ...(tema.colors || {}) });
          }
        }
      } catch {
        /* ignora */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Apply theme live as user edits
  useEffect(() => {
    applyTema(colors);
  }, [colors]);

  const switchMode = (newMode) => {
    const preset = newMode === "light" ? TEMA_CHIARO : TEMA_DARK;
    setMode(newMode);
    setColors(preset);
  };

  const updateColor = (key, hex) => {
    setColors((prev) => ({ ...prev, [key]: hexToHslString(hex) }));
  };

  const resetPreset = () => {
    const preset = mode === "light" ? TEMA_CHIARO : TEMA_DARK;
    setColors(preset);
  };

  const save = async () => {
    setSaving(true);
    try {
      const temaJson = JSON.stringify({ mode, colors });
      if (id) {
        await base44.entities.ImpostazioneApp.update(id, { tema_json: temaJson });
      } else {
        const c = await base44.entities.ImpostazioneApp.create({ tema_json: temaJson });
        setId(c.id);
      }
      toast({ title: "Tema salvato" });
    } catch {
      toast({ title: "Errore salvataggio tema", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const groups = ["sfondi", "testi", "primario", "altro"];

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Tema gestionale
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Scegli un tema predefinito o personalizza i singoli colori. Le modifiche sono in tempo reale.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={mode === "dark" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("dark")}
        >
          <Moon className="w-4 h-4 mr-1" /> Tema scuro
        </Button>
        <Button
          variant={mode === "light" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("light")}
        >
          <Sun className="w-4 h-4 mr-1" /> Tema chiaro
        </Button>
        <Button variant="ghost" size="sm" onClick={resetPreset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Ripristina predefinito
        </Button>
      </div>

      {/* Color pickers */}
      {groups.map((group) => (
        <div key={group}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {TEMA_GROUP_LABELS[group]}
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {TEMA_TOKENS.filter((t) => t.group === group).map((t) => (
              <div key={t.key} className="flex items-center gap-2.5 p-2 rounded-md bg-secondary/30">
                <input
                  type="color"
                  value={hslStringToHex(colors[t.key] || "0 0% 50%")}
                  onChange={(e) => updateColor(t.key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
                />
                <span className="text-sm">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Salva tema
        </Button>
      </div>
    </div>
  );
}