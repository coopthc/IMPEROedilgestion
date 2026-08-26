import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Loader2, Check, Sparkles, Square, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const ROUTE_MAP = {
  appuntamento: "/agenda",
  promemoria: "/agenda",
  cliente: "/clienti",
  collaboratore: "/collaboratori",
  cantiere: "/cantieri",
};

export default function VoiceCommandDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);

  const { isListening, start, stop, supported } = useSpeechRecognition({
    continuous: true,
    autoRestart: true,
    onResult: (finalText) => {
      setTranscript((t) => (t + " " + finalText).trim());
    },
    onError: () => {
      toast({
        title: "Microfono non disponibile",
        description: "Permesso microfono bloccato nell'anteprima. Scrivi il comando a mano nel campo sotto.",
        variant: "destructive",
      });
    },
  });

  const handleListen = () => {
    if (isListening) {
      stop();
    } else {
      setTranscript("");
      setResult(null);
      start();
    }
  };

  const handleParse = async () => {
    if (!transcript.trim()) return;
    stop();
    setParsing(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke("interpretaComandoVocale", { transcript });
      const res = response.data;

      if (res.error) {
        toast({ title: "Errore", description: res.error, variant: "destructive" });
        return;
      }
      setResult({ tipo: res.tipo, azione: res.azione, record: res.record, message: res.message });
      window.dispatchEvent(new CustomEvent("entity-changed", { detail: { tipo: res.tipo, azione: res.azione } }));
      const label = res.record?.titolo || res.record?.nome || "";
      toast({ title: res.message, description: label });
    } catch (err) {
      toast({ title: "Errore interpretazione", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleClose = (v) => {
    if (!v) {
      setTranscript("");
      setResult(null);
      stop();
    }
    onOpenChange(v);
  };

  const handleResultClick = () => {
    if (!result) return;
    let route = ROUTE_MAP[result.tipo] || "/";
    if (result.tipo === "lavorazione" && result.record?.cantiere_id) {
      route = `/cantieri/${result.record.cantiere_id}`;
    }
    navigate(route);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Comando vocale
          </DialogTitle>
          <DialogDescription>
            Parla o scrivi per creare, aggiornare o eliminare: appuntamento, promemoria, cliente, collaboratore, cantiere o lavorazione. Es: &laquo;appuntamento domani alle 14 con Rossi&raquo;, &laquo;aggiorna cellulare cliente Mario Rossi con 3331234567&raquo;, &laquo;elimina cliente Bianchi&raquo;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-center">
            <button
              onClick={handleListen}
              disabled={!supported}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                isListening ? "bg-red-500 text-white animate-pulse" : "bg-primary text-primary-foreground"
              }`}
            >
              {isListening ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
          </div>
          {!supported && (
            <p className="text-xs text-center text-muted-foreground">Il tuo browser non supporta la dettatura vocale.</p>
          )}
          {isListening && (
            <p className="text-xs text-center text-red-500 animate-pulse">In ascolto… parla ora</p>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Comando (parla o scrivi)</div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Es: appuntamento domani alle 14 con Rossi, oppure promemoria venerdì chiamare fornitore"
              className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button onClick={handleParse} disabled={!transcript.trim() || parsing} className="w-full">
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analizzo il comando…
              </>
            ) : (
              "Interpreta e crea"
            )}
          </Button>
          {result && (
            <button
              onClick={handleResultClick}
              className="w-full text-left bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm flex items-center gap-2 hover:bg-green-500/20 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="flex-1">
                {result.message}: <strong>{result.record?.titolo || result.record?.nome}</strong>
              </span>
              <span className="flex items-center gap-1 text-xs text-green-500/80 flex-shrink-0">
                Vai <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}