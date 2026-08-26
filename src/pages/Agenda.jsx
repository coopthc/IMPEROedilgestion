import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SettimanaView from "@/components/agenda/SettimanaView";
import DisponibilitaManager from "@/components/agenda/DisponibilitaManager";
import RichiesteList from "@/components/agenda/RichiesteList";
import AppuntamentoForm from "@/components/agenda/AppuntamentoForm";
import ListaAppuntamenti from "@/components/agenda/ListaAppuntamenti";
import { Plus, Calendar, Clock, Inbox } from "lucide-react";

export default function Agenda() {
  const { toast } = useToast();
  const [appuntamenti, setAppuntamenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultData, setDefaultData] = useState("");

  const load = async () => {
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
        <Button onClick={() => handleNew()}>
          <Plus className="w-4 h-4 mr-1" /> Nuovo appuntamento
        </Button>
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
        </TabsList>

        <TabsContent value="settimana" className="mt-4 space-y-4">
          <SettimanaView
            appuntamenti={appuntamenti}
            loading={loading}
            onDayClick={handleNew}
            onAppuntamentoClick={handleEdit}
          />
          <ListaAppuntamenti
            appuntamenti={appuntamenti}
            onAppuntamentoClick={handleEdit}
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
      </Tabs>

      <AppuntamentoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appuntamento={editing}
        defaultData={defaultData}
        onSaved={load}
      />
    </div>
  );
}