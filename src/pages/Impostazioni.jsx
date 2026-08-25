import React from "react";
import DatiAzienda from "@/components/impostazioni/DatiAzienda";
import ModelliEmail from "@/components/impostazioni/ModelliEmail";
import { Mail, Building } from "lucide-react";

export default function Impostazioni() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Impostazioni
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura i dati azienda e i modelli email del gestionale.
        </p>
      </div>

      <DatiAzienda />

      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-primary" /> Modelli email
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Cerca e modifica i testi di tutte le email inviate dal gestionale a clienti e collaboratori.
        </p>
        <ModelliEmail />
      </div>
    </div>
  );
}