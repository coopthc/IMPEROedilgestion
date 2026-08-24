import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AppuntamentoForm from "@/components/agenda/AppuntamentoForm";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATO_STYLES = {
  programmato: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completato: "bg-green-500/15 text-green-400 border-green-500/30",
  annullato: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATO_LABELS = {
  programmato: "Programmato",
  completato: "Completato",
  annullato: "Annullato",
};

const TIPO_LABELS = {
  interno: "Interno",
  richiesta: "Richiesta",
  confermato: "Confermato",
  admin_fissato: "Fissato da admin",
};

const FILTRI = [
  { value: "tutti", label: "Tutti" },
  { value: "programmato", label: "Programmati" },
  { value: "completato", label: "Completati" },
  { value: "annullato", label: "Annullati" },
];

function formatDataIta(dataStr) {
  if (!dataStr) return "";
  const [y, m, d] = dataStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function isPast(dataStr) {
  if (!dataStr) return false;
  const [y, m, d] = dataStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function Agenda() {
  const { toast } = useToast();
  const [appuntamenti, setAppuntamenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("tutti");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadAppuntamenti = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Appuntamento.list("-data");
      setAppuntamenti(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppuntamenti();
  }, []);

  const filtered = useMemo(() => {
    return appuntamenti
      .filter((a) => filtroStato === "tutti" || a.stato === filtroStato)
      .filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.titolo?.toLowerCase().includes(q) ||
          a.cliente_nome?.toLowerCase().includes(q) ||
          a.cantiere_nome?.toLowerCase().includes(q) ||
          a.note?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const da = `${a.data || ""} ${a.ora || ""}`;
        const db = `${b.data || ""} ${b.ora || ""}`;
        return db.localeCompare(da);
      });
  }, [appuntamenti, search, filtroStato]);

  // Raggruppa per data
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((a) => {
      const key = a.data || "senza-data";
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return Object.entries(groups).sort((a, b) =>
      b[0].localeCompare(a[0])
    );
  }, [filtered]);

  const handleDelete = async (a) => {
    if (!confirm(`Eliminare l'appuntamento "${a.titolo}"?`)) return;
    try {
      await base44.entities.Appuntamento.delete(a.id);
      setAppuntamenti((prev) => prev.filter((x) => x.id !== a.id));
      toast({ title: "Appuntamento eliminato" });
    } catch (err) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'appuntamento",
        variant: "destructive",
      });
    }
  };

  const toggleStato = async (a, nuovoStato) => {
    try {
      await base44.entities.Appuntamento.update(a.id, { stato: nuovoStato });
      setAppuntamenti((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, stato: nuovoStato } : x))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Agenda
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestisci appuntamenti e sopralluoghi
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuovo appuntamento
        </Button>
      </div>

      {/* Ricerca + filtri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo, cliente, cantiere..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTRI.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroStato(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtroStato === f.value
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
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun appuntamento trovato.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([data, items]) => (
            <div key={data}>
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="text-sm font-semibold capitalize text-muted-foreground">
                  {data === "senza-data" ? "Senza data" : formatDataIta(data)}
                </h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className={`bg-card border border-border rounded-lg p-3.5 flex gap-3 ${
                      a.stato === "annullato" ? "opacity-50" : ""
                    }`}
                  >
                    {/* Ora */}
                    <div className="flex flex-col items-center justify-center min-w-[60px] px-2 py-1 rounded-md bg-secondary/50">
                      <Clock className="w-3.5 h-3.5 text-primary mb-0.5" />
                      <span className="text-sm font-semibold">
                        {a.ora || "—"}
                      </span>
                      {a.durata_minuti && (
                        <span className="text-[10px] text-muted-foreground">
                          {a.durata_minuti}min
                        </span>
                      )}
                    </div>

                    {/* Contenuto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4
                            className={`font-semibold text-sm truncate ${
                              a.stato === "completato"
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {a.titolo}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {TIPO_LABELS[a.tipo] || a.tipo}
                            </Badge>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                                STATO_STYLES[a.stato] || ""
                              }`}
                            >
                              {STATO_LABELS[a.stato] || a.stato}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Dettagli */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {a.cliente_nome && (
                          <span className="flex items-center gap-1 truncate">
                            <User className="w-3 h-3" />
                            {a.cliente_nome}
                          </span>
                        )}
                        {a.cantiere_nome && (
                          <Link
                            to={`/cantieri/${a.cantiere_id}`}
                            className="flex items-center gap-1 truncate hover:text-primary transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            {a.cantiere_nome}
                          </Link>
                        )}
                        {a.partecipanti_nomi && (
                          <span className="flex items-center gap-1 truncate" title={a.partecipanti_nomi}>
                            <Users className="w-3 h-3" />
                            {a.partecipanti_nomi}
                          </span>
                        )}
                      </div>

                      {a.note && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                          {a.note}
                        </p>
                      )}
                    </div>

                    {/* Azioni */}
                    <div className="flex flex-col sm:flex-row items-center gap-1.5 flex-shrink-0">
                      {a.stato === "programmato" && (
                        <>
                          <button
                            onClick={() => toggleStato(a, "completato")}
                            className="p-1.5 rounded-md hover:bg-green-500/15 text-green-500 transition-colors"
                            title="Segna completato"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleStato(a, "annullato")}
                            className="p-1.5 rounded-md hover:bg-red-500/15 text-red-500 transition-colors"
                            title="Annulla"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {a.stato !== "programmato" && (
                        <button
                          onClick={() => toggleStato(a, "programmato")}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                          title="Ripristina"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditing(a);
                          setFormOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Modifica"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 rounded-md hover:bg-destructive/15 text-destructive transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppuntamentoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appuntamento={editing}
        onSaved={loadAppuntamenti}
      />
    </div>
  );
}