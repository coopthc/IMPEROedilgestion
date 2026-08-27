import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  User,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Pencil,
  Loader2,
} from "lucide-react";

const DECLINA_MOTIVI = [
  "Fuori zona",
  "Impegnato in quel giorno",
  "Ho un altro appuntamento",
  "Non disponibile",
];

const STATO_LABELS = {
  in_attesa: "In attesa",
  proposto: "Proposto",
};

const STATO_STYLES = {
  in_attesa: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  proposto: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function formatDataIta(dataStr) {
  if (!dataStr) return "";
  const [y, m, d] = dataStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export default function RichiesteList({
  richieste,
  loading,
  onAccetta,
  onDeclina,
  onProponi,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (richieste.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nessuna richiesta in attesa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {richieste.map((a) => (
        <div
          key={a.id}
          className={`bg-card border rounded-lg p-3.5 ${
            a.stato === "in_attesa" ? "border-yellow-500/30" : "border-purple-500/30"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm">{a.titolo}</h4>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATO_STYLES[a.stato]}`}>
                  {STATO_LABELS[a.stato]}
                </span>
                {a.richiedente_nome && (
                  <span className="text-[10px] text-muted-foreground">
                    da {a.richiedente_tipo === "cliente" ? "cliente" : "collab."}: {a.richiedente_nome}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDataIta(a.data)} alle {a.ora}
                </span>
                {a.durata_minuti && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{a.durata_minuti}min
                  </span>
                )}
                {a.cliente_nome && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />{a.cliente_nome}
                  </span>
                )}
                {a.cantiere_nome && (
                  <Link
                    to={`/cantieri/${a.cantiere_id}`}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <MapPin className="w-3 h-3" />{a.cantiere_nome}
                  </Link>
                )}
              </div>
              {a.note && <p className="text-xs text-muted-foreground mt-1.5">{a.note}</p>}
              {a.motivo && (
                <p className="text-xs text-yellow-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {a.motivo}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border">
            {a.stato === "in_attesa" && (
              <>
                <Button size="sm" onClick={() => onAccetta(a)} className="h-7 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accetta
                </Button>
                <Button size="sm" variant="outline" onClick={() => onProponi(a)} className="h-7 text-xs">
                  <Send className="w-3.5 h-3.5 mr-1" /> Proponi altro orario
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDeclina(a)}
                  className="h-7 text-xs text-destructive hover:text-destructive"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Declina
                </Button>
                <div className="flex flex-wrap gap-1.5 w-full mt-1.5">
                  <span className="text-[10px] text-muted-foreground self-center">Risposte rapide:</span>
                  {DECLINA_MOTIVI.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onDeclina(a, m)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
            {a.stato === "proposto" && (
              <>
                <div className="text-xs text-purple-400 flex items-center gap-1.5 mr-auto">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Proposta: {formatDataIta(a.data)} alle {a.ora} — in attesa di conferma
                </div>
                <Button size="sm" variant="outline" onClick={() => onProponi(a)} className="h-7 text-xs">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica proposta
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}