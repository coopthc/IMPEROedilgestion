import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import VoiceCommandDialog from "@/components/dashboard/VoiceCommandDialog";

export default function VoiceCommandButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 md:bottom-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-primary text-primary-foreground transition-all hover:scale-105"
        title="Comando vocale"
      >
        <Sparkles className="w-5 h-5" />
      </button>
      <VoiceCommandDialog open={open} onOpenChange={setOpen} />
    </>
  );
}