import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Building2, FileText, MapPin, Tag, Pencil, CheckCircle2, AlertCircle, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";
import ShareButton from "./ShareButton";

const TIPO_LABEL = { interno: "Interno", richiesta: "Richiesta", confermato: "Confermato", admin_fissato: "Admin fissato" };
const STATO_LABEL = { in_attesa: "In attesa", programmato: "Programmato", proposto: "Proposto", completato: "Completato", annullato: "Annullato" };
const RISPOSTE_LABEL = { presente: "Presente", assente: "Assente", in_forse: "In forse" };
const RISPOSTE_COLOR = {
  presente: "bg-green-500/15 text-green-400 border-green-500/30",
  assente: "bg-red-500/15 text-red-400 border-red-500/30",
  in_forse: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

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

export default function AppuntamentoDetailDialog({ app, open, onOpenChange, onEdit, isCliente = false, onConfermaCliente, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cantiere, setCantiere] = useState(null);
  const [proposeMode, setProposeMode] = useState(false);
  const [proposeData, setProposeData] = useState("");
  const [proposeOra, setProposeOra] = useState("");
  const [saving, setSaving] = useState(false);
  const [myRisposta, setMyRisposta] = useState(null);
  const [risposteList, setRisposteList] = useState([]);

  const isSupervisore = user?.role === "mssg_admin";
  const isCapoOrOperaio = ["mssg_capo", "mssg_operaio"].includes(user?.role);
  const canPropose = (isSupervisore || isCapoOrOperaio) && !isCliente;
  const canRespond = !isCliente && app?.richiedi_conferma === true;
  const canEdit = onEdit && !isCliente && !isSupervisore && !isCapoOrOperaio;

  // Stato conferme: confronta utenti_ids con risposte ricevute
  const utentiAttesi = Array.isArray(app?.utenti_ids) ? app.utenti_ids.length : 0;
  const risposteCount = risposteList.length;
  const mancanti = Math.max(0, utentiAttesi - risposteCount);
  const tuttiHannoRisposto = utentiAttesi > 0 && risposteCount >= utentiAttesi;

  useEffect(() => {
    if (app?.cantiere_id) {
      base44.entities.Cantiere.get(app.cantiere_id).then(setCantiere).catch(() => setCantiere(null));
    } else {
      setCantiere(null);
    }
  }, [app]);

  useEffect(() => {
    if (app) {
      setProposeMode(false);
      setProposeData(app.data || "");
      setProposeOra(app.ora || "");
      let risposte = {};
      try { risposte = app.risposte_json ? JSON.parse(app.risposte_json) : {}; } catch { risposte = {}; }
      const list = Object.entries(risposte).map(([uid, val]) => ({ uid, ...val }));
      setRisposteList(list);
      const mine = risposte[user?.id];
      setMyRisposta(mine?.risposta || null);
    }
  }, [app, user?.id]);

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

  const handlePropose = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("azioneAppuntamento", {
        appuntamento_id: app.id,
        azione: "proponi",
        data: proposeData,
        ora: proposeOra,
      });
      toast({ title: "Proposta inviata", description: "L'amministratore riceverà la richiesta di spostamento." });
      setProposeMode(false);
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRispondi = async (risposta) => {
    setSaving(true);
    try {
      await base44.functions.invoke("azioneAppuntamento", {
        appuntamento_id: app.id,
        azione: "rispondi",
        risposta,
      });
      setMyRisposta(risposta);
      setRisposteList((prev) => {
        const filtered = prev.filter((r) => r.uid !== user.id);
        return [...filtered, { uid: user.id, risposta, nome: user.full_name || user.email || "", data: new Date().toISOString() }];
      });
      toast({ title: "Risposta registrata", description: RISPOSTE_LABEL[risposta] });
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
          {app.partecipanti_nomi && (
            <Field icon={Users} label="Partecipanti">{app.partecipanti_nomi}</Field>
          )}
          {cantiere?.indirizzo && <Field icon={MapPin} label="Indirizzo">{cantiere.indirizzo}, {cantiere.citta}</Field>}
          {app.note && <Field icon={FileText} label="Note">{app.note}</Field>}
          {app.motivo && (
            <div className="flex items-start gap-2 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground text-xs">
                  {app.stato === "annullato" ? "Motivo annullamento" : "Motivo"}:{" "}
                </span>
                <span className="text-red-400">{app.motivo}</span>
              </div>
            </div>
          )}
        </div>

        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/5 rounded-lg p-2">
            <MapPin className="w-4 h-4" /> Apri in Google Maps
          </a>
        )}

        {isCliente && app.stato === "proposto" && onConfermaCliente && (
          <Button onClick={() => onConfermaCliente(app)} className="w-full">
            <CheckCircle2 className="w-4 h-4 mr-1" /> Conferma appuntamento
          </Button>
        )}

        {/* Stato conferme — visibile a tutti */}
        {app.richiedi_conferma && (
          <div className={`rounded-lg p-2.5 text-xs font-medium flex items-center gap-2 ${
            tuttiHannoRisposto
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          }`}>
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            {tuttiHannoRisposto
              ? "Confermata da tutti i partecipanti"
              : `In attesa di ${mancanti} conferma/e su ${utentiAttesi} partecipanti`}
          </div>
        )}

        {/* Risposte partecipazione (presente/assente/in forse) — per tutti gli utenti interni */}
        {canRespond && (
          <div className="space-y-2 rounded-lg border border-border p-3 bg-secondary/30">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> La tua partecipazione
              {app.richiedi_conferma && <span className="text-red-400">• conferma richiesta</span>}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["presente", "assente", "in_forse"].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={saving}
                  onClick={() => handleRispondi(r)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    myRisposta === r
                      ? RISPOSTE_COLOR[r]
                      : "bg-secondary border-border text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {RISPOSTE_LABEL[r]}
                </button>
              ))}
            </div>
            {risposteList.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risposte</p>
                {risposteList.map((r) => (
                  <div key={r.uid} className="flex items-center justify-between text-xs">
                    <span>{r.nome}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${RISPOSTE_COLOR[r.risposta] || ""}`}>
                      {RISPOSTE_LABEL[r.risposta] || r.risposta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Proposta spostamento — per supervisore, capo, operaio */}
        {canPropose && (
          <div className="rounded-lg border border-border p-3 bg-secondary/30">
            {!proposeMode ? (
              <Button variant="outline" className="w-full" onClick={() => setProposeMode(true)}>
                <Send className="w-4 h-4 mr-1" /> Proponi spostamento
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Proponi nuovo orario</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={proposeData} onChange={(e) => setProposeData(e.target.value)} />
                  <Input type="time" value={proposeOra} onChange={(e) => setProposeOra(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handlePropose} disabled={saving || !proposeData || !proposeOra}>
                    {saving ? "Invio..." : "Invia proposta"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setProposeMode(false)} disabled={saving}>
                    Annulla
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {canEdit && (
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