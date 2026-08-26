import React from "react";
import { Mic, Square } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export default function VoiceDictation() {
  const { toast } = useToast();
  const { isListening, start, stop, supported } = useSpeechRecognition({
    continuous: true,
    onResult: (finalText) => {
      const el = document.activeElement;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA") return;
      const proto = tag === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      const newVal = (el.value || "") + finalText + " ";
      setter.call(el, newVal);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    onError: () => {
      toast({
        title: "Microfono non disponibile",
        description: "Permesso bloccato nell'anteprima. Apri l'app pubblicata per usare la dettatura.",
        variant: "destructive",
      });
    },
  });

  if (!supported) return null;

  return (
    <button
      onClick={() => (isListening ? stop() : start())}
      className={`fixed right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
        isListening ? "bg-red-500 text-white animate-pulse bottom-20 md:bottom-6" : "bg-primary text-primary-foreground bottom-20 md:bottom-6"
      }`}
      title={isListening ? "Ferma dettatura" : "Dettatura vocale nel campo attivo"}
    >
      {isListening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}