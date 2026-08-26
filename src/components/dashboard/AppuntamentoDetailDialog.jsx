import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, User, Building2, FileText, MapPin, Tag, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ShareButton from "./ShareButton";

const TIPO_LABEL = { interno: "Interno", richiesta: "Richiesta", confermato: "Confermato", admin_fissato: "Admin fissato" };
const STATO_LABEL = { in_attesa: "In attesa", programmato: "Programmato", proposto: "Proposto", completato: "Completato", annullato: "Annullato" };

function Field({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-muted-foreground text-xs">{label}: </span>
        <span>{children}</span>
      </div>
    </div>
  );
}

export default function AppuntamentoDetailDialog({ app, open, onOpenChange, onEdit }) {
  const [cantiere, setCantiere] = useState(null);

  useEffect(() => {
    if (app?.cantiere_id) {
      base44.entities.Cantiere.get(app.cantiere_id).then(setCantiere).catch(() => setCantiere(null));
    } else {
      setCantiere(null);
    }
  }, [app]);

  if (!app) return null;

  const mapsUrl = cantiere?.indirizzo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cantiere.indirizzo}, ${cantiere.citta || ""}`)}`
    : app.cantiere_nome
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(app.cantiere_nome)}`
    : null;

  const shareText = [
    `Data: ${app.data} alle ${app.ora}`,
    `Durata: ${app.durata_minuti || 60} min`,
    app.cliente_nome && `Cliente: ${app.cliente_nome}`,
    app.cantiere_nome && `Cantiere: ${app.cantiere_nome}`,
    cantiere?.indirizzo && `Indirizzo: ${cantiere.indirizzo}, ${cantiere.citta || ""}`,
    app.note && `Note: ${app.note}`,
  ].filter(Boolean).join("\n");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {app.titolo}
          </DialogTitle>
          <DialogDescription>Dettaglio appuntamento</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <Field icon={Calendar} label="Data">{new Date(app.data).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</Field>
          <Field icon={Clock} label="Orario">{app.ora} — {app.durata_minuti || 60} min</Field>
          <Field icon={Tag} label="Categoria">{app.categoria === "personale" ? "Personale" : "Lavorativo"}</Field>
          <Field icon={Tag} label="Tipo">{TIPO_LABEL[app.tipo] || app.tipo}</Field>
          <Field icon={Tag} label="Stato">{STATO_LABEL[app.stato] || app.stato}</Field>
          {app.cliente_nome && <Field icon={User} label="Cliente">{app.cliente_nome}</Field>}
          {app.cantiere_nome && (
            <Field icon={Building2} label="Cantiere">
              <Link to={`/cantieri/${app.cantiere_id}`} className="text-primary hover:underline">{app.cantiere_nome}</Link>
            </Field>
          )}
          {cantiere?.indirizzo && <Field icon={MapPin} label="Indirizzo">{cantiere.indirizzo}, {cantiere.citta}</Field>}
          {app.note && <Field icon={FileText} label="Note">{app.note}</Field>}
        </div>

        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 rounded-lg p-2">
            <MapPin className="w-4 h-4" /> Apri in Google Maps
          </a>
        )}

        <div className="flex gap-2">
          {onEdit && (
            <Button onClick={() => onEdit(app)} className="flex-1">
              <Pencil className="w-4 h-4 mr-1" /> Modifica
            </Button>
          )}
          <Link to="/agenda" className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 rounded-lg p-2">
            <Calendar className="w-4 h-4" /> Agenda
          </Link>
        </div>

        <div className="pt-2 border-t border-border">
          <ShareButton title={`Appuntamento: ${app.titolo}`} text={shareText} />
        </div>
      </DialogContent>
    </Dialog>
  );
}