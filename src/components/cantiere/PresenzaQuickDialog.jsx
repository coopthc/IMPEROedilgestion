import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Clock, Trash2 } from "lucide-react";

function calcOre(ingresso, uscita) {
  if (!ingresso || !uscita) return 0;
  const [hi, mi] = ingresso.split(":").map(Number);
  const [hu, mu] = uscita.split(":").map(Number);
  let diff = hu * 60 + mu - (hi * 60 + mi);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

export default function PresenzaQuickDialog({
  open,
  onOpenChange,
  collaboratore,
  cantiere,
  lavorazione,
}) {
  const { toast } = useToast();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [oraIngresso, setOraIngresso] = useState("08:00");
  const [oraUscita, setOraUscita] = useState("17:00");
  const [oreStraord, setOreStraord] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [presenze, setPresenze] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-fill uscita from lavorazione ore_previste on open
  useEffect(() => {
    if (open && lavorazione?.ore_previste) {
      const [hi, mi] = "08:00".split(":").map(Number);
      const totalMin = hi * 60 + mi + lavorazione.ore_previste * 60;
      const hu = Math.floor(totalMin / 60) % 24;
      const mu = totalMin % 60;
      setOraUscita(
        `${String(hu).padStart(2, "0")}:${String(mu).padStart(2, "0")}`
      );
    }
  }, [open, lavorazione]);

  const oreTotali = useMemo(
    () => calcOre(oraIngresso, oraUscita),
    [oraIngresso, oraUscita]
  );

  const loadPresenze = async () => {
    if (!collaboratore || !lavorazione) return;
    setLoading(true);
    try {
      const all = await base44.entities.Presenza.filter({
        collaboratore_id: collaboratore.id,
        lavorazione_id: lavorazione.id,
      });
      setPresenze(all.sort((a, b) => (b.data || "").localeCompare(a.data || "")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadPresenze();
  }, [open]);

  const handleSave = async () => {
    if (!collaboratore || !cantiere) return;
    setSaving(true);
    try {
      await base44.entities.Presenza.create({
        collaboratore_id: collaboratore.id,
        collaboratore_nome: collaboratore.nome,
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome,
        lavorazione_id: lavorazione?.id || "",
        lavorazione_nome: lavorazione?.titolo || "",
        data,
        ora_ingresso: oraIngresso,
        ora_uscita: oraUscita,
        ore_totali: oreTotali,
        ore_straordinarie: Number(oreStraord) || 0,
        note,
      });
      toast({ title: "Presenza registrata" });
      setNote("");
      setOreStraord(0);
      loadPresenze();
    } catch (err) {
      console.error(err);
      toast({
        title: "Errore",
        description: "Impossibile registrare la presenza",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm("Eliminare questa presenza?")) return;
    await base44.entities.Presenza.delete(p.id);
    setPresenze((prev) => prev.filter((x) => x.id !== p.id));
  };

  const orePreviste = lavorazione?.ore_previste || 0;
  const totaleOre = presenze.reduce((s, p) => s + (p.ore_totali || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Registra ore — {collaboratore?.nome}
          </DialogTitle>
        </DialogHeader>

        {lavorazione && (
          <div className="bg-secondary/30 rounded-lg p-3 text-sm">
            <div className="text-muted-foreground text-xs">Lavorazione</div>
            <div className="font-medium">{lavorazione.titolo}</div>
            {orePreviste > 0 && (
              <div className="flex justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Ore previste
                </span>
                <span className="text-xs font-medium">{orePreviste} h</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">
                Ore già registrate
              </span>
              <span
                className={`text-xs font-medium ${
                  orePreviste > 0 && totaleOre > orePreviste
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              >
                {totaleOre.toFixed(2)} h
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ingresso</Label>
              <Input
                type="time"
                value={oraIngresso}
                onChange={(e) => setOraIngresso(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Uscita</Label>
              <Input
                type="time"
                value={oraUscita}
                onChange={(e) => setOraUscita(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
            <div>
              <span className="text-sm text-muted-foreground">
                Ore totali calcolate
              </span>
              {orePreviste > 0 && (
                <span
                  className={`ml-2 text-xs ${
                    oreTotali === orePreviste
                      ? "text-green-500"
                      : "text-yellow-500"
                  }`}
                >
                  {oreTotali === orePreviste
                    ? "✓ coincide"
                    : `prev. ${orePreviste}h`}
                </span>
              )}
            </div>
            <span className="text-lg font-bold text-primary">{oreTotali} h</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Ore straordinarie</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={oreStraord}
                onChange={(e) => setOreStraord(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Note</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note opzionali..."
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registra presenza
          </Button>
        </div>

        {/* Storico presenze di questa lavorazione */}
        {presenze.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Presenze registrate ({presenze.length})
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {presenze.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-secondary/30 rounded-md p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">
                      {new Date(p.data).toLocaleDateString("it-IT")} ·{" "}
                      {p.ora_ingresso}–{p.ora_uscita}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.ore_totali}h
                      {p.ore_straordinarie > 0 &&
                        ` · +${p.ore_straordinarie}h str.`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(p)}
                    className="p-1 rounded hover:bg-destructive/15 text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}