import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, ArrowUp, ArrowDown, X, GripVertical } from "lucide-react";
import WidgetCantieri from "@/components/dashboard/WidgetCantieri";
import WidgetAppuntamenti from "@/components/dashboard/WidgetAppuntamenti";
import WidgetAppuntamentiDomani from "@/components/dashboard/WidgetAppuntamentiDomani";
import WidgetSettimana from "@/components/dashboard/WidgetSettimana";
import WidgetPagamenti from "@/components/dashboard/WidgetPagamenti";
import WidgetPresenze from "@/components/dashboard/WidgetPresenze";
import WidgetClienti from "@/components/dashboard/WidgetClienti";
import WidgetCollaboratori from "@/components/dashboard/WidgetCollaboratori";
import WidgetLavorazioni from "@/components/dashboard/WidgetLavorazioni";
import WidgetNotifiche from "@/components/dashboard/WidgetNotifiche";
import WidgetChat from "@/components/dashboard/WidgetChat";
import WidgetPromemoria from "@/components/dashboard/WidgetPromemoria";
import QuickActions from "@/components/dashboard/QuickActions";
import AddWidgetDialog from "@/components/dashboard/AddWidgetDialog";
import { isOperaio, isCliente, WIDGET_VIETATI_OPERAIO, AZIONI_VIETATE_OPERAIO, DEFAULT_WIDGETS_OPERAIO, DEFAULT_QA_OPERAIO, WIDGET_VIETATI_CLIENTE, AZIONI_VIETATE_CLIENTE, DEFAULT_WIDGETS_CLIENTE, DEFAULT_QA_CLIENTE } from "@/lib/ruoli";

const WIDGET_REGISTRY = {
  cantieri: { label: "Cantieri", component: WidgetCantieri },
  appuntamenti: { label: "Appuntamenti", component: WidgetAppuntamenti },
  appuntamenti_domani: { label: "Appuntamenti domani", component: WidgetAppuntamentiDomani },
  settimana: { label: "Pienezza settimana", component: WidgetSettimana },
  pagamenti: { label: "Pagamenti", component: WidgetPagamenti },
  presenze: { label: "Presenze", component: WidgetPresenze },
  clienti: { label: "Clienti", component: WidgetClienti },
  collaboratori: { label: "Collaboratori", component: WidgetCollaboratori },
  lavorazioni: { label: "Lavorazioni", component: WidgetLavorazioni },
  notifiche: { label: "Notifiche", component: WidgetNotifiche },
  chat: { label: "Ultime chat", component: WidgetChat },
  promemoria: { label: "Promemoria", component: WidgetPromemoria },
};

const DEFAULT_WIDGETS = ["cantieri", "appuntamenti", "promemoria", "pagamenti", "presenze", "clienti", "collaboratori"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export default function Dashboard() {
  const { user } = useAuth();
  const operaio = isOperaio(user?.role);
  const cliente = isCliente(user?.role);
  const canCustomize = !cliente;
  const [config, setConfig] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [quickActions, setQuickActions] = useState(["voce", "promemoria", "appuntamento", "cliente", "collaboratore", "backup"]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (cliente) {
          // Dashboard fissa per il cliente: usa sempre i default, ignora vecchie configurazioni
          setWidgets(DEFAULT_WIDGETS_CLIENTE);
          setQuickActions(DEFAULT_QA_CLIENTE);
        } else {
          const configs = await base44.entities.DashboardConfig.filter({ created_by_id: user?.id });
          if (configs.length > 0) {
            setConfig(configs[0]);
            setWidgets(JSON.parse(configs[0].widgets || "[]"));
            if (configs[0].quick_actions) {
              setQuickActions(JSON.parse(configs[0].quick_actions));
            }
          } else {
            const defaultWidgets = operaio ? DEFAULT_WIDGETS_OPERAIO : DEFAULT_WIDGETS;
            const defaultQA = operaio ? DEFAULT_QA_OPERAIO : ["voce", "promemoria", "appuntamento", "cliente", "collaboratore", "backup"];
            const created = await base44.entities.DashboardConfig.create({
              widgets: JSON.stringify(defaultWidgets),
              quick_actions: JSON.stringify(defaultQA),
            });
            setConfig(created);
            setWidgets(defaultWidgets);
            setQuickActions(defaultQA);
          }
        }
      } catch { /* ignora */ }
      setLoading(false);
    })();
  }, [user?.id]);

  const saveWidgets = async (newWidgets) => {
    setWidgets(newWidgets);
    if (config) {
      try { await base44.entities.DashboardConfig.update(config.id, { widgets: JSON.stringify(newWidgets) }); } catch { /* ignora */ }
    }
  };

  const forbiddenWidgets = operaio ? WIDGET_VIETATI_OPERAIO : cliente ? WIDGET_VIETATI_CLIENTE : [];
  const displayWidgets = widgets.filter((w) => !forbiddenWidgets.includes(w));

  const moveWidget = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= displayWidgets.length) return;
    const arr = [...displayWidgets];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    saveWidgets(arr);
  };

  const removeWidget = (i) => saveWidgets(displayWidgets.filter((_, idx) => idx !== i));
  const addWidget = (type) => { saveWidgets([...displayWidgets, type]); setShowAdd(false); };

  const saveQuickActions = async (newQA) => {
    setQuickActions(newQA);
    if (config) {
      try { await base44.entities.DashboardConfig.update(config.id, { quick_actions: JSON.stringify(newQA) }); } catch { /* ignora */ }
    }
  };
  const removeQuickAction = (type) => saveQuickActions(quickActions.filter((t) => t !== type));
  const addQuickAction = (type) => saveQuickActions([...quickActions, type]);
  const moveQuickAction = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= quickActions.length) return;
    const arr = [...quickActions];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    saveQuickActions(arr);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">
            {getGreeting()}, {user?.full_name?.split(" ")[0] || "Utente"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user?.is_azienda ? user?.azienda : user?.full_name || "EdilGestion"}
          </p>
        </div>
        {canCustomize && (
          <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode(!editMode)}>
            <Settings2 className="w-4 h-4 mr-1" />
            {editMode ? "Fatto" : "Modifica layout"}
          </Button>
        )}
      </div>

      <div className="mt-4 mb-5">
        <QuickActions
          visibleActions={quickActions}
          editMode={canCustomize && editMode}
          onRemove={removeQuickAction}
          onAdd={addQuickAction}
          onMove={moveQuickAction}
          disabledActions={operaio ? AZIONI_VIETATE_OPERAIO : cliente ? AZIONI_VIETATE_CLIENTE : []}
        />
      </div>

      {/* Widget grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 h-32 animate-pulse">
              <div className="w-4 h-4 bg-muted rounded mb-2" />
              <div className="h-8 bg-muted rounded mb-2 w-1/2" />
              <div className="h-3 bg-muted/50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayWidgets.map((type, i) => {
            const entry = WIDGET_REGISTRY[type];
            if (!entry) return null;
            const Widget = entry.component;
            return (
              <div key={`${type}-${i}`} className="bg-card border border-border rounded-lg p-4 relative">
                {canCustomize && editMode && (
                  <div className="absolute top-2 right-2 flex gap-0.5 z-10">
                    <button onClick={() => moveWidget(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveWidget(i, 1)} disabled={i === displayWidgets.length - 1} className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeWidget(i)} className="p-1 rounded hover:bg-red-500/15 text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <Widget />
              </div>
            );
          })}
          {canCustomize && editMode && (
            <button
              onClick={() => setShowAdd(true)}
              className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[120px]"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm">Aggiungi widget</span>
            </button>
          )}
        </div>
      )}

      <AddWidgetDialog open={showAdd} onOpenChange={setShowAdd} onAdd={addWidget} existing={displayWidgets} disabledWidgets={operaio ? WIDGET_VIETATI_OPERAIO : cliente ? WIDGET_VIETATI_CLIENTE : []} />
    </div>
  );
}