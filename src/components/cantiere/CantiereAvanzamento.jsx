import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Target,
  Gauge,
  Euro,
  Clock,
} from "lucide-react";
import { creaNotifiche } from "@/lib/notifiche";
import PresenzaQuickDialog from "@/components/cantiere/PresenzaQuickDialog";

const TIPI_AGG = [
  { value: "aggiornamento", label: "Aggiornamento", icon: Info, color: "text-blue-400" },
  { value: "avviso", label: "Avviso", icon: AlertTriangle, color: "text-yellow-400" },
  { value: "completamento", label: "Completamento", icon: CheckCircle2, color: "text-green-400" },
  { value: "problema", label: "Problema", icon: AlertCircle, color: "text-red-400" },
];

const STATI_LAV = [
  { value: "da_fare", label: "Da fare", color: "bg-gray-500/15 text-gray-400" },
  { value: "in_corso", label: "In corso", color: "bg-blue-500/15 text-blue-400" },
  { value: "completata", label: "Completata", color: "bg-green-500/15 text-green-400" },
  { value: "bloccata", label: "Bloccata", color: "bg-red-500/15 text-red-400" },
  { value: "annullata", label: "Annullata", color: "bg-muted/30 text-muted-foreground" },
];

function parseIds(str) {
  return (str || "").split(",").filter(Boolean);
}

export default function CantiereAvanzamento({ cantiere, onCantiereUpdate, isCliente = false }) {
  const { user } = useAuth();
  const [percentuale, setPercentuale] = useState(cantiere.avanzamento_percentuale || 0);
  const [aggiornamenti, setAggiornamenti] = useState([]);
  const [lavorazioni, setLavorazioni] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuovoAgg, setNuovoAgg] = useState({ titolo: "", testo: "", tipo: "aggiornamento", visibile_cliente: false });
  const [nuovaLav, setNuovaLav] = useState({ titolo: "", collaboratori_ids: [], ore_previste: "", percentuale_prevista: "", costo: "", crea_pagamento: true, visibile_cliente: false });
  const [savingPct, setSavingPct] = useState(false);
  const [savingBudgetId, setSavingBudgetId] = useState(null);
  const [modalita, setModalita] = useState(cantiere.modalita_avanzamento || "manuale");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ titolo: "", testo: "", tipo: "aggiornamento", visibile_cliente: false });
  const [editingLav, setEditingLav] = useState(null);
  const [lavForm, setLavForm] = useState({ titolo: "", collaboratori_ids: [], ore_previste: "", percentuale_prevista: "", percentuale_completata: 0, costo: 0, visibile_cliente: false });
  const [showFasi, setShowFasi] = useState(false);
  const [quickPresenza, setQuickPresenza] = useState(null);

  const assignedIds = parseIds(cantiere.collaboratori_ids);

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

  // Calcoli barre
  const pronosticoTotale = lavorazioni.reduce((sum, l) => sum + (l.percentuale_prevista || 0), 0);
  // effettivoTotale è già la percentuale reale di completamento del progetto (somma dei contributi)
  const effettivoPct = lavorazioni.reduce(
    (sum, l) => sum + ((l.percentuale_completata || 0) / 100) * (l.percentuale_prevista || 0),
    0
  );
  const totaleCosti = lavorazioni.reduce((sum, l) => sum + (l.costo || 0), 0);
  const totaleAggiunte = lavorazioni.filter((l) => l.aggiunta_al_budget).reduce((sum, l) => sum + (l.costo || 0), 0);
  const lavorazioniVisibili = isCliente ? lavorazioni.filter((l) => l.visibile_cliente) : lavorazioni;

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

  const saveModalita = async (nuovaModalita) => {
    setModalita(nuovaModalita);
    await base44.entities.Cantiere.update(cantiere.id, {
      modalita_avanzamento: nuovaModalita,
    });
    onCantiereUpdate?.();
  };

  const toggleBudgetLav = async (lav) => {
    const costo = lav.costo || 0;
    const wasAdded = lav.aggiunta_al_budget;
    setSavingBudgetId(lav.id);
    try {
      const nuovoBudget = Math.round(((cantiere.budget || 0) + (wasAdded ? -costo : costo)) * 100) / 100;
      await base44.entities.Cantiere.update(cantiere.id, { budget: nuovoBudget });
      await base44.entities.Lavorazione.update(lav.id, { aggiunta_al_budget: !wasAdded });
      await onCantiereUpdate?.();
      await load();
    } finally {
      setSavingBudgetId(null);
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
    await creaNotifiche({
      collaboratoriIds: assignedIds,
      tipo: "aggiornamento",
      titolo: `Aggiornamento: ${nuovoAgg.titolo}`,
      testo: nuovoAgg.testo || cantiere.nome,
      url: `/cantieri/${cantiere.id}`,
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

  const toggleLavCollab = (collabId, isCreating = false) => {
    if (isCreating) {
      const ids = nuovaLav.collaboratori_ids;
      const newIds = ids.includes(collabId) ? ids.filter((id) => id !== collabId) : [...ids, collabId];
      setNuovaLav((f) => ({ ...f, collaboratori_ids: newIds }));
    } else {
      const ids = lavForm.collaboratori_ids;
      const newIds = ids.includes(collabId) ? ids.filter((id) => id !== collabId) : [...ids, collabId];
      setLavForm((f) => ({ ...f, collaboratori_ids: newIds }));
    }
  };

  const addLavorazione = async () => {
    if (!nuovaLav.titolo.trim()) return;
    const nomi = nuovaLav.collaboratori_ids
      .map((id) => collaboratori.find((c) => c.id === id)?.nome)
      .filter(Boolean);
    const costoNum = nuovaLav.costo ? Number(nuovaLav.costo) : 0;
    const created = await base44.entities.Lavorazione.create({
      cantiere_id: cantiere.id,
      cantiere_nome: cantiere.nome,
      titolo: nuovaLav.titolo,
      collaboratori_ids: nuovaLav.collaboratori_ids.join(","),
      collaboratori_nomi: nomi.join(", "),
      ore_previste: nuovaLav.ore_previste ? Number(nuovaLav.ore_previste) : null,
      percentuale_prevista: nuovaLav.percentuale_prevista ? Number(nuovaLav.percentuale_prevista) : 0,
      percentuale_completata: 0,
      costo: costoNum,
      stato: "da_fare",
      ordine: lavorazioni.length,
      visibile_cliente: nuovaLav.visibile_cliente,
    });
    // Crea anche la voce pagamento se richiesto e se c'è un costo
    if (nuovaLav.crea_pagamento && costoNum > 0) {
      await base44.entities.Pagamento.create({
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome,
        titolo: nuovaLav.titolo,
        tipo: "avanzamento",
        importo: costoNum,
        percentuale: nuovaLav.percentuale_prevista ? Number(nuovaLav.percentuale_prevista) : null,
        stato: "non_pagato",
        lavorazione_id: created.id,
      });
    }
    // Notifica i collaboratori assegnati
    await creaNotifiche({
      collaboratoriIds: nuovaLav.collaboratori_ids,
      tipo: "aggiornamento",
      titolo: `Nuova lavorazione: ${nuovaLav.titolo}`,
      testo: `Cantiere: ${cantiere.nome}`,
      url: `/cantieri/${cantiere.id}`,
    });
    setNuovaLav({ titolo: "", collaboratori_ids: [], ore_previste: "", percentuale_prevista: "", costo: "", crea_pagamento: true, visibile_cliente: false });
    load();
  };

  const startEditLav = (lav) => {
    setEditingLav(lav.id);
    setLavForm({
      titolo: lav.titolo || "",
      collaboratori_ids: parseIds(lav.collaboratori_ids || lav.collaboratore_id),
      ore_previste: lav.ore_previste ?? "",
      percentuale_prevista: lav.percentuale_prevista ?? 0,
      percentuale_completata: lav.percentuale_completata ?? 0,
      costo: lav.costo ?? 0,
      visibile_cliente: lav.visibile_cliente || false,
    });
  };

  const saveLav = async (id) => {
    const nomi = lavForm.collaboratori_ids
      .map((cid) => collaboratori.find((c) => c.id === cid)?.nome)
      .filter(Boolean);
    const updateData = {
      titolo: lavForm.titolo,
      collaboratori_ids: lavForm.collaboratori_ids.join(","),
      collaboratori_nomi: nomi.join(", "),
      ore_previste: lavForm.ore_previste === "" ? null : Number(lavForm.ore_previste),
      percentuale_prevista: Number(lavForm.percentuale_prevista) || 0,
      percentuale_completata: Number(lavForm.percentuale_completata) || 0,
      costo: Number(lavForm.costo) || 0,
      visibile_cliente: lavForm.visibile_cliente,
    };
    // Se completata al 100%, aggiorna stato
    if (Number(lavForm.percentuale_completata) >= 100) {
      updateData.stato = "completata";
    } else if (Number(lavForm.percentuale_completata) > 0) {
      updateData.stato = "in_corso";
    }
    await base44.entities.Lavorazione.update(id, updateData);
    setEditingLav(null);
    load();
  };

  const updateLavStato = async (lav, stato) => {
    const updateData = { stato };
    if (stato === "completata") updateData.percentuale_completata = 100;
    else if (stato === "da_fare") updateData.percentuale_completata = 0;
    await base44.entities.Lavorazione.update(lav.id, updateData);
    setLavorazioni((prev) =>
      prev.map((l) => (l.id === lav.id ? { ...l, ...updateData } : l))
    );
  };

  const deleteLavorazione = async (lav) => {
    if (!confirm(`Eliminare la lavorazione "${lav.titolo}"?`)) return;
    // Se era aggiunta al budget, decurtala
    if (lav.aggiunta_al_budget && lav.costo) {
      const nuovoBudget = Math.round(((cantiere.budget || 0) - (lav.costo || 0)) * 100) / 100;
      await base44.entities.Cantiere.update(cantiere.id, { budget: nuovoBudget });
      onCantiereUpdate?.();
    }
    // Elimina il pagamento collegato se esiste
    const pagamenti = await base44.entities.Pagamento.filter({ lavorazione_id: lav.id });
    await Promise.all(pagamenti.map((p) => base44.entities.Pagamento.delete(p.id)));
    await base44.entities.Lavorazione.delete(lav.id);
    setLavorazioni((prev) => prev.filter((l) => l.id !== lav.id));
    load();
  };

  const removePagamentoLav = async (lav) => {
    if (!confirm(`Rimuovere "${lav.titolo}" dai pagamenti?`)) return;
    const pagamenti = await base44.entities.Pagamento.filter({ lavorazione_id: lav.id });
    await Promise.all(pagamenti.map((p) => base44.entities.Pagamento.delete(p.id)));
    load();
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
      {/* Selettore modalità */}
      {!isCliente && (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          Modalità avanzamento
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => saveModalita("manuale")}
            className={`p-3 rounded-lg border text-left transition-colors ${
              modalita === "manuale"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="text-sm font-medium">Manuale</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Slider manuale, fasi indipendenti
            </div>
          </button>
          <button
            onClick={() => saveModalita("pronostico")}
            className={`p-3 rounded-lg border text-left transition-colors ${
              modalita === "pronostico"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="text-sm font-medium">Pronostico</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Barre calcolate dalle fasi
            </div>
          </button>
        </div>
      </div>
      )}

      {/* Modalità manuale: slider */}
      {modalita === "manuale" && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Avanzamento
          </h3>
          {isCliente ? (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold">{percentuale}%</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(percentuale, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <>
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
                  style={{ width: `${Math.min(percentuale, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Modalità pronostico: barra pronostico + effettivo */}
      {modalita === "pronostico" && (
        <>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              Pronostico (somma fasi previste)
            </h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{pronosticoTotale}%</span>
              {pronosticoTotale > 100 && (
                <Badge className="bg-yellow-500/15 text-yellow-400 text-[10px]">
                  +{pronosticoTotale - 100}% lavorazioni extra
                </Badge>
              )}
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(pronosticoTotale, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Somma delle percentuali previste di ogni fase. Può superare il 100% per lavorazioni aggiuntive.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Effettivo (completamento reale)
            </h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{Math.round(effettivoPct)}%</span>
              <span className="text-xs text-muted-foreground">
                su {pronosticoTotale}% totale previsto
              </span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${Math.min(effettivoPct, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Percentuale reale di completamento del progetto (somma dei contributi di ogni fase).
            </p>
          </div>

        </>
      )}

      {/* Lavorazioni */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Lavorazioni (fasi di lavoro)
          </h3>
          {isCliente && lavorazioniVisibili.length > 0 && (
            <button
              onClick={() => setShowFasi(!showFasi)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {showFasi ? "Nascondi fasi" : "Mostra fasi"}
            </button>
          )}
        </div>

        {/* Riepilogo budget */}
        {!isCliente && lavorazioni.length > 0 && (
          <div className="bg-secondary/30 rounded-lg p-3 mb-4 text-sm">
            <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
              <Euro className="w-3.5 h-3.5" />
              Budget
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget iniziale</span>
                <span>€ {Math.max(0, (cantiere.budget || 0) - totaleAggiunte).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aggiunte ({lavorazioni.filter((l) => l.aggiunta_al_budget).length})</span>
                <span className="text-green-400">+ € {totaleAggiunte.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="font-semibold">Budget attuale</span>
                <span className="font-bold">€ {(cantiere.budget || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}
        {/* Form nuova lavorazione */}
        {!isCliente && (
        <div className="space-y-2 mb-4 bg-secondary/30 rounded-lg p-3">
          <Input
            placeholder="Titolo fase (es. Demolizione bagno) *"
            value={nuovaLav.titolo}
            onChange={(e) => setNuovaLav((f) => ({ ...f, titolo: e.target.value }))}
          />
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5">Collaboratori assegnati</Label>
            <div className="flex flex-wrap gap-1.5">
              {collaboratori.map((c) => {
                const selected = nuovaLav.collaboratori_ids.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleLavCollab(c.id, true)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent border-border hover:border-primary/50"
                    }`}
                  >
                    {c.nome}
                  </button>
                );
              })}
              {collaboratori.length === 0 && (
                <span className="text-xs text-muted-foreground">Nessun collaboratore in squadra</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1">Ore prev.</Label>
              <Input
                type="number"
                placeholder="es. 8"
                value={nuovaLav.ore_previste}
                onChange={(e) => setNuovaLav((f) => ({ ...f, ore_previste: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1">% lavorazione (svincolata dal costo) *</Label>
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="es. 20"
                value={nuovaLav.percentuale_prevista}
                onChange={(e) => setNuovaLav((f) => ({ ...f, percentuale_prevista: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1">Costo (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="es. 1500"
                value={nuovaLav.costo}
                onChange={(e) => setNuovaLav((f) => ({ ...f, costo: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch
                checked={nuovaLav.crea_pagamento}
                onCheckedChange={(v) => setNuovaLav((f) => ({ ...f, crea_pagamento: v }))}
              />
              Crea anche voce in Pagamenti
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch
                checked={nuovaLav.visibile_cliente}
                onCheckedChange={(v) => setNuovaLav((f) => ({ ...f, visibile_cliente: v }))}
              />
              Visibile al cliente
            </label>
          </div>
          <Button size="sm" onClick={addLavorazione} disabled={!nuovaLav.titolo.trim() || !nuovaLav.percentuale_prevista} className="w-full">
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi fase
          </Button>
        </div>
        )}

        {lavorazioni.length === 0 && !isCliente ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            Nessuna lavorazione. Le lavorazioni create qui compariranno nella sezione Presenze.
          </p>
        ) : lavorazioniVisibili.length > 0 && (!isCliente || showFasi) ? (
          <div className="space-y-2 mt-4">
            {lavorazioniVisibili.map((l) => {
              const statoInfo = STATI_LAV.find((s) => s.value === l.stato) || STATI_LAV[0];
              const isEditing = editingLav === l.id;
              const lavCollabIds = parseIds(l.collaboratori_ids || l.collaboratore_id);
              const lavCollabNomi = (l.collaboratori_nomi || l.collaboratore_nome || "").split(",").filter(Boolean);
              const pctCompl = l.percentuale_completata || 0;
              const pctPrev = l.percentuale_prevista || 0;

              return (
                <div key={l.id} className="bg-secondary/30 rounded-lg p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={lavForm.titolo}
                        onChange={(e) => setLavForm((f) => ({ ...f, titolo: e.target.value }))}
                        placeholder="Titolo"
                      />
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5">Collaboratori</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {collaboratori.map((c) => {
                            const selected = lavForm.collaboratori_ids.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleLavCollab(c.id)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  selected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-transparent border-border hover:border-primary/50"
                                }`}
                              >
                                {c.nome}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Ore prev.</Label>
                          <Input
                            type="number"
                            value={lavForm.ore_previste}
                            onChange={(e) => setLavForm((f) => ({ ...f, ore_previste: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Costo (€)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lavForm.costo}
                            onChange={(e) => setLavForm((f) => ({ ...f, costo: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">% prevista</Label>
                          <Input
                            type="number"
                            value={lavForm.percentuale_prevista}
                            onChange={(e) => setLavForm((f) => ({ ...f, percentuale_prevista: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">% completata</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={lavForm.percentuale_completata}
                            onChange={(e) => setLavForm((f) => ({ ...f, percentuale_completata: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Switch
                          checked={lavForm.visibile_cliente}
                          onCheckedChange={(v) => setLavForm((f) => ({ ...f, visibile_cliente: v }))}
                        />
                        Visibile al cliente
                      </label>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => saveLav(l.id)}>Salva</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingLav(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{l.titolo}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {lavCollabNomi.map((n, i) => {
                              const collabId = lavCollabIds[i];
                              const collab = collaboratori.find(
                                (c) => c.id === collabId
                              );
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    collab &&
                                    setQuickPresenza({
                                      collaboratore: collab,
                                      lavorazione: l,
                                    })
                                  }
                                  className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded hover:bg-primary/30 transition-colors flex items-center gap-0.5"
                                  title="Registra ore lavorate"
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  {n}
                                </button>
                              );
                            })}
                            {lavCollabNomi.length === 0 && (
                              <span className="text-[10px] text-muted-foreground">Nessun collaboratore</span>
                            )}
                          </div>
                        </div>
                        {!isCliente && (
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => startEditLav(l)}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteLavorazione(l)}
                            className="p-1 rounded hover:bg-destructive/15 text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        )}
                      </div>
                      {/* Barra avanzamento fase — piena a 100% quando completata */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              l.stato === "completata"
                                ? "bg-green-500"
                                : l.stato === "in_corso"
                                ? "bg-yellow-500"
                                : l.stato === "bloccata"
                                ? "bg-red-500"
                                : l.stato === "annullata"
                                ? "bg-muted-foreground/30"
                                : "bg-white/20"
                            }`}
                            style={{
                              width: `${
                                l.stato === "completata"
                                  ? 100
                                  : l.stato === "da_fare" || l.stato === "annullata"
                                  ? 0
                                  : Math.min(pctCompl, 100)
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
                          {pctCompl}% · peso {pctPrev}%{l.costo ? ` · € ${Number(l.costo).toLocaleString("it-IT")}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {isCliente ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded ${statoInfo.color}`}>
                            {statoInfo.label}
                          </span>
                        ) : (
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
                        )}
                        {l.ore_previste != null && (
                          <span className="text-[10px] text-muted-foreground">{l.ore_previste}h prev.</span>
                        )}
                        {l.visibile_cliente ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-green-500">
                            <Eye className="w-2.5 h-2.5" /> Cliente
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <EyeOff className="w-2.5 h-2.5" /> Interno
                          </span>
                        )}
                      </div>
                      {/* Costo + aggiunta al budget */}
                      {l.costo > 0 && !isCliente && (
                        <div className="flex items-center justify-between mt-2 bg-secondary/50 rounded-md px-2.5 py-1.5">
                          <span className="text-xs text-muted-foreground">Costo</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">€ {Number(l.costo).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                            <button
                              onClick={() => toggleBudgetLav(l)}
                              disabled={savingBudgetId === l.id}
                              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                                l.aggiunta_al_budget
                                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                                  : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                              }`}
                            >
                              {savingBudgetId === l.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : l.aggiunta_al_budget ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Aggiunta
                                </>
                              ) : (
                                "Aggiungi al budget"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {l.costo > 0 && !isCliente && (
                        <button
                          onClick={() => removePagamentoLav(l)}
                          className="text-[10px] text-muted-foreground hover:text-destructive mt-1.5 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Rimuovi dai pagamenti
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Feed aggiornamenti */}
      {!isCliente && (
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
      )}

      <PresenzaQuickDialog
        open={!!quickPresenza}
        onOpenChange={(v) => !v && setQuickPresenza(null)}
        collaboratore={quickPresenza?.collaboratore}
        cantiere={cantiere}
        lavorazione={quickPresenza?.lavorazione}
      />
    </div>
  );
}