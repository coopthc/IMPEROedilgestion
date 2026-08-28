import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import CantiereChat from "@/components/cantiere/CantiereChat";
import CantiereProgetto from "@/components/cantiere/CantiereProgetto";
import CantiereAvanzamentoRiepilogo from "@/components/cantiere/CantiereAvanzamentoRiepilogo";
import CantiereDocumentiCliente from "@/components/cantiere/CantiereDocumentiCliente";
import SchedaDialog from "@/components/cantiere/SchedaDialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Image as UIImage } from "@/components/ui/image";
import { MessageCircle } from "lucide-react";

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
  const { user } = useAuth();
  const isCliente = user?.role === "mssg_cliente";
  const isAdmin = user?.role === "admin" || user?.role === "mssg_admin";
  const canManageCantiere =
    user?.role === "admin" ||
    (user?.role === "mssg_admin" && user?.data?.supervisore_tutti_cantieri === true);
  const [cantiere, setCantiere] = useState(null);
  const [clienti, setClienti] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [scheda, setScheda] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "panoramica";

  const load = useCallback(async () => {
    try {
      const [c, cl, collabs] = await Promise.all([
        base44.entities.Cantiere.get(id),
        base44.entities.Cliente.list(),
        base44.entities.Collaboratore.list(),
      ]);
      setCantiere(c);
      setClienti(cl);
      setCollaboratori(collabs);
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

  const assignedCollabIds = (cantiere.collaboratori_ids || "").split(",").filter(Boolean);
  const assignedCollabs = collaboratori.filter((c) => assignedCollabIds.includes(c.id));
  const clienteObj = clienti.find((c) => c.id === cantiere.cliente_id);
  const responsabileObj = collaboratori.find((c) => c.id === cantiere.responsabile_id);

  const infoRows = [
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
        {canManageCantiere && (
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
        )}
      </div>

      {/* Titolo + stato */}
      <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
        <div className="flex items-start gap-3 mb-1">
          {cantiere.foto_url && (
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
              <UIImage
                src={cantiere.foto_url}
                alt={cantiere.nome}
                className="w-full h-full"
                fittingType="cover"
              />
            </div>
          )}
          <div className="flex-1 flex items-start justify-between gap-3">
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
        </div>
        {cantiere.descrizione && (
          <p className="text-sm text-muted-foreground mt-2">{cantiere.descrizione}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (v === "panoramica") {
            searchParams.delete("tab");
            setSearchParams(searchParams, { replace: true });
          } else {
            setSearchParams({ tab: v }, { replace: true });
          }
        }}
      >
        <TabsList className="w-full justify-start flex-wrap h-auto mb-4">
          <TabsTrigger value="panoramica" className="text-xs gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Panoramica
          </TabsTrigger>
          {!isCliente && (
            <TabsTrigger value="squadra" className="text-xs gap-1.5">
              <HardHat className="w-3.5 h-3.5" />
              Squadra
            </TabsTrigger>
          )}
          {!isCliente && (
            <TabsTrigger value="documenti" className="text-xs gap-1.5">
              <Images className="w-3.5 h-3.5" />
              Documenti
            </TabsTrigger>
          )}
          <TabsTrigger value="chat" className="text-xs gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="avanzamento" className="text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Avanzamento
          </TabsTrigger>
          {(isAdmin || isCliente) && (
            <TabsTrigger value="pagamenti" className="text-xs gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Pagamenti
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="panoramica">
          <div className="bg-card border border-border rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Dettagli
              </h2>
              {canManageCantiere && (
                <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Modifica dati cantiere
                </Button>
              )}
            </div>
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

            {/* Cliente + Responsabile cliccabili */}
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="flex items-start gap-2.5">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </div>
                  {clienteObj ? (
                    <button
                      onClick={() => setScheda({ type: "cliente", item: clienteObj })}
                      className="text-sm text-primary hover:underline text-left"
                    >
                      {clienteObj.is_azienda ? clienteObj.azienda || clienteObj.nome : clienteObj.nome}
                    </button>
                  ) : cantiere.cliente_nome ? (
                    <div className="text-sm">{cantiere.cliente_nome}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <HardHat className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Responsabile / Capo cantiere
                  </div>
                  {responsabileObj ? (
                    <button
                      onClick={() => setScheda({ type: "collaboratore", item: responsabileObj })}
                      className="text-sm text-primary hover:underline text-left"
                    >
                      {responsabileObj.nome}
                    </button>
                  ) : cantiere.responsabile_nome ? (
                    <div className="text-sm">{cantiere.responsabile_nome}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            </div>

            {/* Squadra abbinata */}
            {assignedCollabs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Squadra abbinata ({assignedCollabs.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignedCollabs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setScheda({ type: "collaboratore", item: c })}
                      className="flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary border border-border rounded-full pl-1.5 pr-3 py-1 text-xs transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <HardHat className="w-3 h-3 text-primary" />
                      </span>
                      {c.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isCliente && cantiere.note_interne && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  Note interne (non visibili al cliente)
                </div>
                <p className="text-sm">{cantiere.note_interne}</p>
              </div>
            )}
          </div>

          <CantiereAvanzamentoRiepilogo cantiere={cantiere} />
        </TabsContent>

        {!isCliente && (
        <TabsContent value="squadra">
          <CantiereSquadra
            cantiere={cantiere}
            clienti={clienti}
            onSaved={load}
            onOpenScheda={setScheda}
          />
        </TabsContent>
        )}

        {!isCliente && (
          <TabsContent value="documenti">
            <CantiereDocumenti cantiere={cantiere} soloVisibili={isCliente} collaboratori={assignedCollabs} />
          </TabsContent>
        )}

        <TabsContent value="chat">
          <CantiereChat cantiere={cantiere} collaboratori={assignedCollabs} canale="cliente" />
        </TabsContent>

        <TabsContent value="avanzamento">
          <CantiereAvanzamento cantiere={cantiere} onCantiereUpdate={load} isCliente={isCliente} />
        </TabsContent>

        {(isAdmin || isCliente) && (
          <TabsContent value="pagamenti">
            <div className="space-y-4">
              <CantierePagamenti cantiere={cantiere} isCliente={isCliente} />
              <CantiereProgetto cantiere={cantiere} isCliente={isCliente} soloVisibili={isCliente} />
              {isCliente && <CantiereDocumentiCliente cantiere={cantiere} />}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <CantiereForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cantiere={cantiere}
        clienti={clienti}
        onSaved={load}
      />

      <SchedaDialog
        open={!!scheda}
        onOpenChange={(v) => !v && setScheda(null)}
        type={scheda?.type}
        item={scheda?.item}
      />
    </div>
  );
}