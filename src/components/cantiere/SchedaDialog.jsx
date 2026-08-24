import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  User,
  HardHat,
  Building2,
  Hash,
  Wallet,
  BadgeCheck,
  BadgeX,
  FileText,
} from "lucide-react";

const QUALIFICA_LABELS = {
  capo_cantiere: "Capo cantiere",
  operaio: "Operaio",
  tecnico: "Tecnico",
  amministrazione: "Amministrazione",
  altro: "Altro",
};

function waLink(tel) {
  if (!tel) return "#";
  const d = tel.replace(/\D/g, "");
  if (d.startsWith("39")) return `https://wa.me/${d}`;
  if (d.startsWith("00")) return `https://wa.me/${d.slice(2)}`;
  if (d.startsWith("0")) return `https://wa.me/39${d.slice(1)}`;
  return `https://wa.me/39${d}`;
}

function Field({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

export default function SchedaDialog({ open, onOpenChange, type, item }) {
  if (!item) return null;

  const isCliente = type === "cliente";
  const displayName = isCliente
    ? item.is_azienda
      ? item.azienda || item.nome
      : item.nome
    : item.is_azienda
    ? item.azienda || item.nome
    : item.nome;

  const telefono = item.telefono;
  const email = item.email;
  const indirizzoFull = [item.indirizzo, item.citta, item.cap, item.provincia]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCliente ? (
              <User className="w-5 h-5 text-primary" />
            ) : (
              <HardHat className="w-5 h-5 text-primary" />
            )}
            <span className="truncate">{displayName}</span>
            {item.is_azienda && (
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Azioni rapide */}
          {(telefono || email) && (
            <div className="flex gap-2 flex-wrap">
              {telefono && (
                <>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`tel:${telefono}`}>
                      <Phone className="w-3.5 h-3.5 mr-1" />
                      Chiama
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={waLink(telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      WhatsApp
                    </a>
                  </Button>
                </>
              )}
              {email && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${email}`}>
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Dati anagrafici */}
          <div className="space-y-3">
            {!isCliente && (
              <Field
                icon={BadgeCheck}
                label="Qualifica"
                value={QUALIFICA_LABELS[item.qualifica] || item.qualifica}
              />
            )}
            {item.is_azienda && (
              <Field icon={Building2} label="Ragione sociale" value={item.azienda} />
            )}
            {!item.is_azienda && (
              <Field icon={User} label="Nome" value={item.nome} />
            )}
            <Field icon={Mail} label="Email" value={email} />
            <Field icon={Phone} label="Telefono" value={telefono} />
            <Field icon={MapPin} label="Indirizzo" value={indirizzoFull} />
            <Field icon={Hash} label="Partita IVA" value={item.piva} />
            <Field icon={Hash} label="Codice fiscale" value={item.codice_fiscale} />
            {!isCliente && item.costo_orario != null && (
              <Field
                icon={Wallet}
                label="Costo orario"
                value={`€ ${Number(item.costo_orario).toLocaleString("it-IT")}/h`}
              />
            )}
            {!isCliente && (
              <div className="flex items-center gap-2">
                {item.attivo !== false ? (
                  <BadgeCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <BadgeX className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {item.attivo !== false ? "Attivo" : "Non attivo"}
                </span>
              </div>
            )}
            {item.note && (
              <Field icon={FileText} label="Note" value={item.note} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}