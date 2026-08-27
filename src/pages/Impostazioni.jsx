import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import DatiPersonali from "@/components/impostazioni/DatiPersonali";
import AccountPassword from "@/components/impostazioni/AccountPassword";
import TemaGestionale from "@/components/impostazioni/TemaGestionale";
import { KeyRound, Palette, Settings, UserCircle } from "lucide-react";

export default function Impostazioni() {
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