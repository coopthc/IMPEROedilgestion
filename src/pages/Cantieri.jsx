import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Euro,
  Calendar,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import CantiereForm from "@/components/cantieri/CantiereForm";
import { useToast } from "@/components/ui/use-toast";
import { Image as UIImage } from "@/components/ui/image";

const STATO_STILI = {
  bozza: "bg-gray-500/15 text-gray-400",
  attivo: "bg-green-500/15 text-green-500",
  sospeso: "bg-yellow-500/15 text-yellow-500",
  completato: "bg-blue-500/15 text-blue-500",
  chiuso: "bg-purple-500/15 text-purple-500",
};

const STATO_LABEL = {
  bozza: "Bozza",
  attivo: "Attivo",
  sospeso: "Sospeso",
  completato: "Completato",
  chiuso: "Chiuso",
};

const FILTRI = [
  { value: "tutti", label: "Tutti" },
  { value: "bozza", label: "Bozza" },
  { value: "attivo", label: "Attivi" },
  { value: "sospeso", label: "Sospesi" },
  { value: "completato", label: "Completati" },
  { value: "chiuso", label: "Chiusi" },
];

export default function Cantieri() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cantieri, setCantieri] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [pagamenti, setPagamenti] = useState([]);
  const [lavorazioni, setLavorazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("tutti");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, cl, pa, lav] = await Promise.all([
        base44.entities.Cantiere.list("-created_date"),
        base44.entities.Cliente.list(),
        base44.entities.Pagamento.list(),
        base44.entities.Lavorazione.list(),
      ]);
      setCantieri(c);
      setClienti(cl);
      setPagamenti(pa);
      setLavorazioni(lav);
    } catch (err) {
      console.error("Errore caricamento cantieri:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cantieriFiltrati = cantieri.filter((c) => {
    const matchSearch =
      !search ||
      c.nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.citta?.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === "tutti" || c.stato === filtro;
    return matchSearch && matchFiltro;
  });

  const getAvanzamento = (cantiere) => {
    if (cantiere.modalita_avanzamento === "pronostico") {
      const lavs = lavorazioni.filter((l) => l.cantiere_id === cantiere.id);
      const effettivo = lavs.reduce(
        (s, l) => s + ((l.percentuale_completata || 0) / 100) * (l.percentuale_prevista || 0),
        0
      );
      return Math.round(effettivo);
    }
    return cantiere.avanzamento_percentuale || 0;
  };

  const getPagamentiPct = (cantiere) => {
    if (!cantiere.budget) return 0;
    const pags = pagamenti.filter(
      (p) => p.cantiere_id === cantiere.id && p.stato === "pagato"
    );
    const totalePagato = pags.reduce((s, p) => s + (p.importo || 0), 0);
    return Math.min(Math.round((totalePagato / cantiere.budget) * 100), 100);
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (cantiere) => {
    setEditing(cantiere);
    setFormOpen(true);
  };

  const handleDelete = async (cantiere) => {
    if (!confirm(`Eliminare il cantiere "${cantiere.nome}"?`)) return;
    try {
      await base44.entities.Cantiere.delete(cantiere.id);
      toast({ title: "Cantiere eliminato" });
      load();
    } catch (err) {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Cantieri
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {cantieri.length} cantieri totali
          </p>
        </div>
        <Button onClick={handleNew} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nuovo
        </Button>
      </div>

      {/* Ricerca + filtri */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, cliente, città..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTRI.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                filtro === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : cantieriFiltrati.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun cantiere trovato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cantieriFiltrati.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-[12px] p-4 transition-colors hover:border-primary/50 cursor-pointer group"
              onClick={() => navigate(`/cantieri/${c.id}`)}
            >
              {c.foto_url ? (
                <div className="relative -mx-4 -mt-4 mb-3 h-28 overflow-hidden rounded-t-[12px] bg-secondary">
                  <UIImage
                    src={c.foto_url}
                    alt={c.nome}
                    className="w-full h-full"
                    fittingType="cover"
                  />
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm leading-tight flex-1 min-w-0 group-hover:text-primary transition-colors">
                  {c.nome}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    STATO_STILI[c.stato] || STATO_STILI.bozza
                  }`}
                >
                  {STATO_LABEL[c.stato] || c.stato}
                </span>
              </div>

              {c.cliente_nome && (
                <p className="text-xs text-muted-foreground mb-2 truncate">
                  {c.cliente_nome}
                </p>
              )}

              {c.citta && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  {c.citta}
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                {c.budget != null && (
                  <span className="flex items-center gap-1">
                    <Euro className="w-3 h-3" />
                    {Number(c.budget).toLocaleString("it-IT")}
                  </span>
                )}
                {c.data_inizio && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.data_inizio).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                )}
              </div>

              {/* Barre avanzamento e pagamenti */}
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Avanzamento</span>
                    <span>{getAvanzamento(c)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${getAvanzamento(c)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Pagamenti</span>
                    <span>{getPagamentiPct(c)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${getPagamentiPct(c)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Azioni rapide */}
              <div className="flex gap-1.5 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(c);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CantiereForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cantiere={editing}
        clienti={clienti}
        onSaved={load}
      />
    </div>
  );
}