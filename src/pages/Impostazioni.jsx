import React from "react";
import DatiAzienda from "@/components/impostazioni/DatiAzienda";
import ModelliEmail from "@/components/impostazioni/ModelliEmail";
import AccountPassword from "@/components/impostazioni/AccountPassword";
import { Mail, KeyRound } from "lucide-react";

export default function Impostazioni() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" /> Impostazioni
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura i dati azienda, i modelli email e la sicurezza del tuo account.
        </p>
      </div>

      <DatiAzienda />

      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-primary" /> Account e sicurezza
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Cambia la tua password o richiedi un'email di recupero.
        </p>
        <AccountPassword />
      </div>

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