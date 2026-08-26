import React, { useState } from "react";
import { Mic, Loader2, Check, Sparkles, Square } from "lucide-react";
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

export default function VoiceCommandDialog({ open, onOpenChange }) {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);

  const { isListening, start, stop, supported } = useSpeechRecognition({
    continuous: false,
    onResult: (finalText) => {
      setTranscript((t) => (t + " " + finalText).trim());
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
    setParsing(true);
    setResult(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un assistente che interpreta comandi vocali per un gestionale edile. Analizza questo comando e restituisci un JSON strutturato.
Comando dell'utente: "${transcript}"
Data di oggi: ${today} (formato YYYY-MM-DD).
Regole:
- Determina se l'utente vuole creare un "appuntamento" o un "promemoria".
- Risolvi date relative ("domani", "dopodomani", "lunedì", "venerdì", "25 agosto") in formato YYYY-MM-DD rispetto alla data di oggi.
- Per appuntamento: estrai titolo, data, ora (HH:MM, default "09:00"), durata_minuti (numero, default 60), categoria ("lavorativo" o "personale", default "lavorativo").
- Per promemoria: estrai titolo, data, ora (HH:MM se menzionata, altrimenti stringa vuota).
- Se un campo non è menzionato, usa valori sensati di default.
Rispondi SOLO con JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["appuntamento", "promemoria"] },
            titolo: { type: "string" },
            data: { type: "string" },
            ora: { type: "string" },
            durata_minuti: { type: "number" },
            categoria: { type: "string" },
          },
          required: ["tipo", "titolo", "data"],
        },
      });

      if (res.tipo === "appuntamento") {
        const created = await base44.entities.Appuntamento.create({
          titolo: res.titolo,
          data: res.data,
          ora: res.ora || "09:00",
          durata_minuti: res.durata_minuti || 60,
          categoria: res.categoria || "lavorativo",
          stato: "programmato",
        });
        setResult({ tipo: "appuntamento", record: created });
        toast({ title: "Appuntamento creato", description: res.titolo });
      } else {
        const created = await base44.entities.Promemoria.create({
          titolo: res.titolo,
          data: res.data,
          ora: res.ora || "",
        });
        setResult({ tipo: "promemoria", record: created });
        toast({ title: "Promemoria creato", description: res.titolo });
      }
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Comando vocale
          </DialogTitle>
          <DialogDescription>
            Parla per creare un appuntamento o un promemoria. Es: &laquo;appuntamento domani alle 14 con Rossi&raquo; oppure &laquo;promemoria venerdì chiamare fornitore&raquo;.
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
          {transcript && (
            <div className="bg-secondary/30 rounded-lg p-3 text-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Trascrizione</div>
              {transcript}
            </div>
          )}
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
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>
                {result.tipo === "appuntamento" ? "Appuntamento" : "Promemoria"} creato:{" "}
                <strong>{result.record.titolo}</strong>
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}