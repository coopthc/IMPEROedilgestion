import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SettimanaView from "@/components/agenda/SettimanaView";
import DisponibilitaManager from "@/components/agenda/DisponibilitaManager";
import RichiesteList from "@/components/agenda/RichiesteList";
import AppuntamentoForm from "@/components/agenda/AppuntamentoForm";
import ListaAppuntamenti from "@/components/agenda/ListaAppuntamenti";
import PromemoriaManager from "@/components/agenda/PromemoriaManager";
import AppuntamentoDetailDialog from "@/components/dashboard/AppuntamentoDetailDialog";
import PromemoriaDetailDialog from "@/components/agenda/PromemoriaDetailDialog";
import { Plus, Calendar, Clock, Inbox, Bell, Eye, EyeOff } from "lucide-react";
import { filtraAppuntamentiPersonali } from "@/lib/appuntamentiUtils";

export default function Agenda() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = ["admin", "mssg_admin"].includes(user?.role);
  const [appuntamenti, setAppuntamenti] = useState([]);
  const [promemoria, setPromemoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultData, setDefaultData] = useState("");
  const [detailApp, setDetailApp] = useState(null);
  const [detailProm, setDetailProm] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Vista personale: ogni utente vede solo i propri appuntamenti.
  // L'admin può attivare "vedi tutti" per oversight globale.
  const visibleAppuntamenti = isAdmin && showAll
    ? appuntamenti
    : filtraAppuntamentiPersonali(appuntamenti, user);

  const load = async () => {
    setLoading(true);
    try {
      const [data, proms] = await Promise.all([
        base44.entities.Appuntamento.list("-data"),
        base44.entities.Promemoria.list("-data"),
      ]);
      setAppuntamenti(data);
      setPromemoria(proms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleNew = (data) => {
    setEditing(null);
    setDefaultData(data || "");
    setFormOpen(true);
  };

  const handleEdit = (a) => {
    setEditing(a);
    setDefaultData("");
    setFormOpen(true);
  };

  const handleAppuntamentoClick = (a) => {
    setDetailApp(a);
  };

  const handlePromemoriaClick = (p) => {
    setDetailProm(p);
  };

  const handleEditFromDetail = () => {
    setEditing(detailApp);
    setDefaultData("");
    setDetailApp(null);
    setFormOpen(true);
  };

  const accetta = async (a) => {
    try {
      await base44.entities.Appuntamento.update(a.id, {
        stato: "programmato",
        tipo: "confermato",
      });
      toast({ title: "Appuntamento confermato" });
      load();
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const declina = async (a) => {
    const motivo = prompt("Motivo del rifiuto (opzionale):") || "";
    try {
      await base44.entities.Appuntamento.update(a.id, {
        stato: "annullato",
        motivo,
      });
      toast({ title: "Appuntamento declinato" });
      load();
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const richieste = useMemo(
    () => appuntamenti.filter((a) => a.stato === "in_attesa" || a.stato === "proposto"),
    [appuntamenti]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Agenda
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestisci appuntamenti, disponibilità e richieste di prenotazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={showAll ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAll((v) => !v)}
              title={showAll ? "Vista globale" : "Vista personale"}
            >
              {showAll ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
              {showAll ? "Tutti" : "Miei"}
            </Button>
          )}
          <Button onClick={() => handleNew()}>
            <Plus className="w-4 h-4 mr-1" /> Nuovo appuntamento
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settimana">
        <TabsList>
          <TabsTrigger value="settimana" className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Settimana
          </TabsTrigger>
          <TabsTrigger value="richieste" className="flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" /> Richieste
            {richieste.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">
                {richieste.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="disponibilita" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Disponibilità
          </TabsTrigger>
          <TabsTrigger value="promemoria" className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Promemoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settimana" className="mt-4 space-y-4">
          <SettimanaView
            appuntamenti={visibleAppuntamenti}
            promemoria={promemoria}
            loading={loading}
            onDayClick={handleNew}
            onAppuntamentoClick={handleAppuntamentoClick}
            onPromemoriaClick={handlePromemoriaClick}
          />
          <ListaAppuntamenti
            appuntamenti={visibleAppuntamenti}
            onAppuntamentoClick={handleAppuntamentoClick}
          />
        </TabsContent>

        <TabsContent value="richieste" className="mt-4">
          <RichiesteList
            richieste={richieste}
            loading={loading}
            onAccetta={accetta}
            onDeclina={declina}
            onProponi={handleEdit}
          />
        </TabsContent>

        <TabsContent value="disponibilita" className="mt-4">
          <DisponibilitaManager />
        </TabsContent>

        <TabsContent value="promemoria" className="mt-4">
          <PromemoriaManager />
        </TabsContent>
      </Tabs>

      <AppuntamentoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appuntamento={editing}
        defaultData={defaultData}
        onSaved={load}
      />

      <AppuntamentoDetailDialog
        app={detailApp}
        open={!!detailApp}
        onOpenChange={(v) => !v && setDetailApp(null)}
        onEdit={handleEditFromDetail}
      />

      <PromemoriaDetailDialog
        prom={detailProm}
        open={!!detailProm}
        onOpenChange={(v) => !v && setDetailProm(null)}
        onSaved={load}
      />
    </div>
  );
}