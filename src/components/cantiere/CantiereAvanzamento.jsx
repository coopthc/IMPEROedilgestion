import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";

const TIPI_AGG = [
  { value: "aggiornamento", label: "Aggiornamento", icon: Info, color: "text-blue-400" },
  { value: "avviso", label: "Avviso", icon: AlertTriangle, color: "text-yellow-400" },
  { value: "completamento", label: "Completamento", icon: CheckCircle2, color: "text-green-400" },
  { value: "problema", label: "Problema", icon: AlertCircle, color: "text-red-400" },
];

const STATI_LAV = [
  { value: "da_fare", label: "Da fare" },
  { value: "in_corso", label: "In corso" },
  { value: "completata", label: "Completata" },
  { value: "bloccata", label: "Bloccata" },
  { value: "annullata", label: "Annullata" },
];

export default function CantiereAvanzamento({ cantiere, onCantiereUpdate }) {
  const { user } = useAuth();
  const [percentuale, setPercentuale] = useState(cantiere.avanzamento_percentuale || 0);
  const [aggiornamenti, setAggiornamenti] = useState([]);
  const [lavorazioni, setLavorazioni] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuovoAgg, setNuovoAgg] = useState({ titolo: "", testo: "", tipo: "aggiornamento", visibile_cliente: false });
  const [nuovaLav, setNuovaLav] = useState({ titolo: "", collaboratore_id: "", ore_previste: "" });
  const [savingPct, setSavingPct] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ titolo: "", testo: "", tipo: "aggiornamento", visibile_cliente: false });

  const assignedIds = (cantiere.collaboratori_ids || "").split(",").filter(Boolean);

  const load = async () => {
    setLoading(true);
    try {
      const [aggs, lavs, collabs] = await Promise.all([
        base44.entities.Aggiornamento.filter({ cantiere_id: cantiere.id }),
        base44.entities.Lavorazione.filter({ cantiere_id: cantiere.id }),
        base44.entities.Collaboratore.list(),
      ]);
      setAggiornamenti(aggs.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")));
      setLavorazioni(lavs.sort((a, b) => (a.ordine || 0) - (b.ordine || 0)));
      setCollaboratori(collabs.filter((c) => assignedIds.includes(c.id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cantiere.id]);

  const savePercentuale = async () => {
    setSavingPct(true);
    try {
      await base44.entities.Cantiere.update(cantiere.id, {
        avanzamento_percentuale: Number(percentuale),
      });
      onCantiereUpdate?.();
    } finally {
      setSavingPct(false);
    }
  };

  const addAggiornamento = async () => {
    if (!nuovoAgg.titolo.trim()) return;
    await base44.entities.Aggiornamento.create({
      cantiere_id: cantiere.id,
      cantiere_nome: cantiere.nome,
      tipo: nuovoAgg.tipo,
      titolo: nuovoAgg.titolo,
      testo: nuovoAgg.testo,
      visibile_cliente: nuovoAgg.visibile_cliente,
      autore_nome: user?.full_name || "—",
    });
    setNuovoAgg({ titolo: "", testo: "", tipo: "aggiornamento", visibile_cliente: false });
    load();
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      titolo: a.titolo || "",
      testo: a.testo || "",
      tipo: a.tipo || "aggiornamento",
      visibile_cliente: a.visibile_cliente || false,
    });
  };

  const saveEdit = async (id) => {
    await base44.entities.Aggiornamento.update(id, {
      titolo: editForm.titolo,
      testo: editForm.testo,
      tipo: editForm.tipo,
      visibile_cliente: editForm.visibile_cliente,
    });
    setEditingId(null);
    load();
  };

  const deleteAggiornamento = async (id) => {
    await base44.entities.Aggiornamento.delete(id);
    setAggiornamenti((prev) => prev.filter((a) => a.id !== id));
  };

  const addLavorazione = async () => {
    if (!nuovaLav.titolo.trim()) return;
    const collab = collaboratori.find((c) => c.id === nuovaLav.collaboratore_id);
    await base44.entities.Lavorazione.create({
      cantiere_id: cantiere.id,
      cantiere_nome: cantiere.nome,
      titolo: nuovaLav.titolo,
      collaboratore_id: nuovaLav.collaboratore_id || "",
      collaboratore_nome: collab?.nome || "",
      ore_previste: nuovaLav.ore_previste ? Number(nuovaLav.ore_previste) : null,
      stato: "da_fare",
      ordine: lavorazioni.length,
    });
    setNuovaLav({ titolo: "", collaboratore_id: "", ore_previste: "" });
    load();
  };

  const updateLavStato = async (lav, stato) => {
    await base44.entities.Lavorazione.update(lav.id, { stato });
    setLavorazioni((prev) =>
      prev.map((l) => (l.id === lav.id ? { ...l, stato } : l))
    );
  };

  const deleteLavorazione = async (id) => {
    await base44.entities.Lavorazione.delete(id);
    setLavorazioni((prev) => prev.filter((l) => l.id !== id));
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
      {/* Avanzamento percentuale */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Avanzamento generale
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={percentuale}
            onChange={(e) => setPercentuale(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-bold w-12 text-right">{percentuale}%</span>
          <Button size="sm" variant="outline" onClick={savePercentuale} disabled={savingPct}>
            {savingPct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salva"}
          </Button>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percentuale}%` }}
          />
        </div>
      </div>

      {/* Lavorazioni */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Lavorazioni (fasi di lavoro)</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <Input
            placeholder="Titolo fase (es. Demolizione bagno)"
            value={nuovaLav.titolo}
            onChange={(e) => setNuovaLav((f) => ({ ...f, titolo: e.target.value }))}
            className="flex-1"
          />
          <Select
            value={nuovaLav.collaboratore_id || "__none__"}
            onValueChange={(v) =>
              setNuovaLav((f) => ({ ...f, collaboratore_id: v === "__none__" ? "" : v }))
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Collaboratore" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {collaboratori.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Ore prev."
            value={nuovaLav.ore_previste}
            onChange={(e) => setNuovaLav((f) => ({ ...f, ore_previste: e.target.value }))}
            className="w-full sm:w-24"
          />
          <Button size="sm" onClick={addLavorazione}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {lavorazioni.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            Nessuna lavorazione. Le lavorazioni create qui compariranno nella sezione Presenze.
          </p>
        ) : (
          <div className="space-y-2">
            {lavorazioni.map((l) => (
              <div key={l.id} className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.titolo}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {l.collaboratore_nome && (
                      <span className="text-[10px] text-muted-foreground">{l.collaboratore_nome}</span>
                    )}
                    {l.ore_previste != null && (
                      <span className="text-[10px] text-muted-foreground">{l.ore_previste}h prev.</span>
                    )}
                  </div>
                </div>
                <Select value={l.stato} onValueChange={(v) => updateLavStato(l, v)}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATI_LAV.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => deleteLavorazione(l.id)}
                  className="p-1 rounded hover:bg-destructive/15 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feed aggiornamenti */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Feed aggiornamenti</h3>
        {/* Form nuovo */}
        <div className="space-y-2 mb-4 bg-secondary/30 rounded-lg p-3">
          <div className="flex gap-2">
            <Select
              value={nuovoAgg.tipo}
              onValueChange={(v) => setNuovoAgg((f) => ({ ...f, tipo: v }))}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPI_AGG.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Titolo *"
              value={nuovoAgg.titolo}
              onChange={(e) => setNuovoAgg((f) => ({ ...f, titolo: e.target.value }))}
              className="flex-1"
            />
          </div>
          <Textarea
            rows={2}
            placeholder="Descrizione (opzionale)..."
            value={nuovoAgg.testo}
            onChange={(e) => setNuovoAgg((f) => ({ ...f, testo: e.target.value }))}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch
                checked={nuovoAgg.visibile_cliente}
                onCheckedChange={(v) => setNuovoAgg((f) => ({ ...f, visibile_cliente: v }))}
              />
              Visibile al cliente
            </label>
            <Button size="sm" onClick={addAggiornamento} disabled={!nuovoAgg.titolo.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Pubblica
            </Button>
          </div>
        </div>

        {aggiornamenti.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            Nessun aggiornamento.
          </p>
        ) : (
          <div className="space-y-2">
            {aggiornamenti.map((a) => {
              const tipoInfo = TIPI_AGG.find((t) => t.value === a.tipo) || TIPI_AGG[0];
              const Icon = tipoInfo.icon;
              const isEditing = editingId === a.id;
              return (
                <div key={a.id} className="bg-secondary/30 rounded-lg p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={editForm.tipo}
                          onValueChange={(v) => setEditForm((f) => ({ ...f, tipo: v }))}
                        >
                          <SelectTrigger className="w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPI_AGG.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={editForm.titolo}
                          onChange={(e) => setEditForm((f) => ({ ...f, titolo: e.target.value }))}
                          className="flex-1 text-sm"
                          placeholder="Titolo"
                        />
                      </div>
                      <Textarea
                        rows={2}
                        value={editForm.testo}
                        onChange={(e) => setEditForm((f) => ({ ...f, testo: e.target.value }))}
                        placeholder="Descrizione..."
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Switch
                            checked={editForm.visibile_cliente}
                            onCheckedChange={(v) => setEditForm((f) => ({ ...f, visibile_cliente: v }))}
                          />
                          Visibile al cliente
                        </label>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => saveEdit(a.id)}>
                            Salva
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2.5">
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tipoInfo.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{a.titolo}</div>
                        {a.testo && (
                          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.testo}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {a.autore_nome} • {new Date(a.created_date).toLocaleDateString("it-IT")}
                          </span>
                          {a.visibile_cliente ? (
                            <span className="flex items-center gap-0.5 text-[10px] text-green-500">
                              <Eye className="w-2.5 h-2.5" /> Cliente
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <EyeOff className="w-2.5 h-2.5" /> Interno
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5 self-start">
                        <button
                          onClick={() => startEdit(a)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteAggiornamento(a.id)}
                          className="p-1 rounded hover:bg-destructive/15 text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}