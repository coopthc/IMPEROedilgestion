import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import DatiAzienda from "@/components/impostazioni/DatiAzienda";
import DatiPersonali from "@/components/impostazioni/DatiPersonali";
import AccountPassword from "@/components/impostazioni/AccountPassword";
import TemaGestionale from "@/components/impostazioni/TemaGestionale";
import { KeyRound, Palette, Building2, Settings, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isOperaio } from "@/lib/ruoli";

export default function Impostazioni() {
  const { user } = useAuth();
  const operaio = isOperaio(user?.role);
  const isGestore = ["admin", "mssg_admin"].includes(user?.role);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Impostazioni
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura i temi del gestionale e la sicurezza del tuo account.
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        defaultValue="dati-personali"
        className="bg-card border border-border rounded-lg px-4"
      >
        <AccordionItem value="dati-personali" className="border-b border-border">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <UserCircle className="w-4 h-4 text-primary" /> Dati personali
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground mb-3">
              Le tue informazioni personali, dati di fatturazione e tipo di account (privato o azienda).
            </p>
            <DatiPersonali />
          </AccordionContent>
        </AccordionItem>

        {isGestore && (
        <AccordionItem value="dati-azienda" className="border-b border-border">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Building2 className="w-4 h-4 text-primary" /> Dati azienda
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground mb-3">
              Ragione sociale, partita IVA, indirizzo, contatti e capacità appuntamenti.
            </p>
            <DatiAzienda />
          </AccordionContent>
        </AccordionItem>
        )}

        <AccordionItem value="tema" className="border-b border-border">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <Palette className="w-4 h-4 text-primary" /> Tema e colori
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground mb-3">
              Personalizza l'aspetto del gestionale: scegli un tema predefinito o modifica i singoli colori.
            </p>
            <TemaGestionale />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="account" className="border-b-0">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 font-semibold">
              <KeyRound className="w-4 h-4 text-primary" /> Account e sicurezza
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground mb-3">
              Cambia la tua password o richiedi un'email di recupero.
            </p>
            <AccountPassword />
          </AccordionContent>
        </AccordionItem>


      </Accordion>
    </div>
  );
}