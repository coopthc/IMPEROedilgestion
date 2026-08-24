import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Euro,
  Calendar,
  User,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  HardHat,
  Images,
  TrendingUp,
  Wallet,
} from "lucide-react";
import CantiereForm from "@/components/cantieri/CantiereForm";
import CantiereSquadra from "@/components/cantiere/CantiereSquadra";
import CantiereDocumenti from "@/components/cantiere/CantiereDocumenti";
import CantiereAvanzamento from "@/components/cantiere/CantiereAvanzamento";
import CantierePagamenti from "@/components/cantiere/CantierePagamenti";
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

export default function CantiereDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cantiere, setCantiere] = useState(null);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, cl] = await Promise.all([
        base44.entities.Cantiere.get(id),
        base44.entities.Cliente.list(),
      ]);
      setCantiere(c);
      setClienti(cl);
    } catch (err) {
      console.error("Errore caricamento cantiere:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirm(`Eliminare il cantiere "${cantiere.nome}"?`)) return;
    try {
      await base44.entities.Cantiere.delete(cantiere.id);
      toast({ title: "Cantiere eliminato" });
      navigate("/cantieri");
    } catch (err) {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!cantiere) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Cantiere non trovato.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => navigate("/cantieri")}
        >
          Torna ai cantieri
        </Button>
      </div>
    );
  }

  const infoRows = [
    { icon: User, label: "Cliente", value: cantiere.cliente_nome },
    { icon: HardHat, label: "Responsabile", value: cantiere.responsabile_nome },
    { icon: MapPin, label: "Indirizzo", value: cantiere.indirizzo },
    { icon: MapPin, label: "Città", value: cantiere.citta },
    {
      icon: Euro,
      label: "Budget",
      value: cantiere.budget != null ? `€ ${Number(cantiere.budget).toLocaleString("it-IT")}` : null,
    },
    {
      icon: Calendar,
      label: "Data inizio",
      value: cantiere.data_inizio
        ? new Date(cantiere.data_inizio).toLocaleDateString("it-IT")
        : null,
    },
    {
      icon: Calendar,
      label: "Data fine",
      value: cantiere.data_fine
        ? new Date(cantiere.data_fine).toLocaleDateString("it-IT")
        : null,
    },
  ].filter((r) => r.value);

  return (
    <div>
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/cantieri")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Cantieri
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="w-4 h-4 mr-1" />
            Modifica
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Elimina
          </Button>
        </div>
      </div>

      {/* Titolo + stato */}
      <div className="bg-card border border-border rounded-[14px] p-5 mb-4 overflow-hidden">
        {cantiere.foto_url && (
          <div className="relative -mx-5 -mt-5 mb-4 h-44 sm:h-56 overflow-hidden bg-secondary">
            <UIImage
              src={cantiere.foto_url}
              alt={cantiere.nome}
              className="w-full h-full"
              fittingType="cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {cantiere.nome}
          </h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
              STATO_STILI[cantiere.stato] || STATO_STILI.bozza
            }`}
          >
            {STATO_LABEL[cantiere.stato] || cantiere.stato}
          </span>
        </div>
        {cantiere.descrizione && (
          <p className="text-sm text-muted-foreground mt-2">{cantiere.descrizione}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="panoramica">
        <TabsList className="w-full justify-start flex-wrap h-auto mb-4">
          <TabsTrigger value="panoramica" className="text-xs gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value="squadra" className="text-xs gap-1.5">
            <HardHat className="w-3.5 h-3.5" />
            Squadra
          </TabsTrigger>
          <TabsTrigger value="documenti" className="text-xs gap-1.5">
            <Images className="w-3.5 h-3.5" />
            Documenti
          </TabsTrigger>
          <TabsTrigger value="avanzamento" className="text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Avanzamento
          </TabsTrigger>
          <TabsTrigger value="pagamenti" className="text-xs gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            Pagamenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="panoramica">
          <div className="bg-card border border-border rounded-[14px] p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Dettagli
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {infoRows.map((row, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <row.icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </div>
                    <div className="text-sm">{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {cantiere.note_interne && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  Note interne (non visibili al cliente)
                </div>
                <p className="text-sm">{cantiere.note_interne}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="squadra">
          <CantiereSquadra cantiere={cantiere} onSaved={load} />
        </TabsContent>

        <TabsContent value="documenti">
          <CantiereDocumenti cantiere={cantiere} />
        </TabsContent>

        <TabsContent value="avanzamento">
          <CantiereAvanzamento cantiere={cantiere} onCantiereUpdate={load} />
        </TabsContent>

        <TabsContent value="pagamenti">
          <CantierePagamenti cantiere={cantiere} />
        </TabsContent>
      </Tabs>

      <CantiereForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cantiere={cantiere}
        clienti={clienti}
        onSaved={load}
      />
    </div>
  );
}