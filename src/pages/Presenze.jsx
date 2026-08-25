import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  HardHat,
  Building2,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import PresenzaForm from "@/components/presenze/PresenzaForm";

export default function Presenze() {
  const { toast } = useToast();
  const [presenze, setPresenze] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Filtri
  const [filtroData, setFiltroData] = useState("");
  const [filtroCollab, setFiltroCollab] = useState("tutti");
  const [filtroCantiere, setFiltroCantiere] = useState("tutti");

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, ca] = await Promise.all([
        base44.entities.Presenza.list("-data"),
        base44.entities.Collaboratore.list(),
        base44.entities.Cantiere.list(),
      ]);
      setPresenze(p);
      setCollaboratori(c);
      setCantieri(ca);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return presenze.filter((p) => {
      if (filtroData && p.data !== filtroData) return false;
      if (filtroCollab !== "tutti" && p.collaboratore_id !== filtroCollab) return false;
      if (filtroCantiere !== "tutti" && p.cantiere_id !== filtroCantiere) return false;
      return true;
    });
  }, [presenze, filtroData, filtroCollab, filtroCantiere]);

  const totaleOre = filtered.reduce((s, p) => s + (p.ore_totali || 0), 0);
  const totaleStraord = filtered.reduce((s, p) => s + (p.ore_straordinarie || 0), 0);

  const handleDelete = async (p) => {
    if (!confirm("Eliminare questa presenza?")) return;
    await base44.entities.Presenza.delete(p.id);
    setPresenze((prev) => prev.filter((x) => x.id !== p.id));
    toast({ title: "Presenza eliminata" });
  };

  const openEdit = (p) => {
    setEditing(p);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Presenze
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registra le ore di lavoro dei collaboratori
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Registra
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Ore totali</span>
          </div>
          <div className="text-2xl font-bold mt-1">{totaleOre.toFixed(2)} h</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Straordinari</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-yellow-500">
            {totaleStraord.toFixed(2)} h
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          type="date"
          value={filtroData}
          onChange={(e) => setFiltroData(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select value={filtroCollab} onValueChange={setFiltroCollab}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Collaboratore" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i collaboratori</SelectItem>
            {collaboratori.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroCantiere} onValueChange={setFiltroCantiere}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Cantiere" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i cantieri</SelectItem>
            {cantieri.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filtroData || filtroCollab !== "tutti" || filtroCantiere !== "tutti") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFiltroData("");
              setFiltroCollab("tutti");
              setFiltroCantiere("tutti");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna presenza registrata.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
            >
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                <HardHat className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {p.collaboratore_nome || "—"}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {p.data
                      ? new Date(p.data).toLocaleDateString("it-IT")
                      : "—"}
                  </span>
                  {p.cantiere_nome && (
                    <Link
                      to={`/cantieri/${p.cantiere_id}`}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 truncate"
                    >
                      <Building2 className="w-3 h-3" />
                      {p.cantiere_nome}
                    </Link>
                  )}
                  {p.lavorazione_nome && (
                    <Link
                      to={`/cantieri/${p.cantiere_id}?tab=avanzamento`}
                      className="text-[11px] text-primary hover:underline truncate"
                    >
                      → {p.lavorazione_nome}
                    </Link>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold">
                  {p.ore_totali != null ? `${p.ore_totali} h` : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {p.ora_ingresso} - {p.ora_uscita}
                </div>
                {p.ore_straordinarie > 0 && (
                  <div className="text-[10px] text-yellow-500">
                    +{p.ore_straordinarie}h str.
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="p-1.5 rounded hover:bg-destructive/15 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PresenzaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        presenza={editing}
        onSaved={load}
      />
    </div>
  );
}