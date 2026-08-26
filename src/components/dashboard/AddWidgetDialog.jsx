import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, Calendar, Wallet, Clock, Users, HardHat, TrendingUp, Plus } from "lucide-react";

const AVAILABLE = [
  { type: "cantieri", label: "Cantieri", icon: Building2, color: "text-blue-400", desc: "Totale, attivi, per stato" },
  { type: "appuntamenti", label: "Appuntamenti oggi", icon: Calendar, color: "text-primary", desc: "Lista cliccabile con dettaglio e Maps" },
  { type: "pagamenti", label: "Pagamenti", icon: Wallet, color: "text-yellow-400", desc: "Incassato, atteso, per stato" },
  { type: "presenze", label: "Presenze oggi", icon: Clock, color: "text-orange-400", desc: "Presenti, ore totali, straordinari" },
  { type: "clienti", label: "Clienti", icon: Users, color: "text-purple-400", desc: "Totale, aziende, privati" },
  { type: "collaboratori", label: "Collaboratori", icon: HardHat, color: "text-green-400", desc: "Attivi, capi, operai" },
  { type: "lavorazioni", label: "Lavorazioni", icon: TrendingUp, color: "text-orange-400", desc: "Avanzamento medio, per stato" },
];

export default function AddWidgetDialog({ open, onOpenChange, onAdd, existing }) {
  const available = AVAILABLE.filter((w) => !existing.includes(w.type));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Aggiungi widget
          </DialogTitle>
          <DialogDescription>Scegli un riepilogo da aggiungere alla dashboard</DialogDescription>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Tutti i widget sono già nella dashboard</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {available.map((w) => (
              <button
                key={w.type}
                onClick={() => onAdd(w.type)}
                className="flex items-start gap-2.5 p-3 bg-card border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <w.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${w.color}`} />
                <div>
                  <div className="text-sm font-medium">{w.label}</div>
                  <div className="text-[11px] text-muted-foreground">{w.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}