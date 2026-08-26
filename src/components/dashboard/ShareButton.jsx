import React, { useState } from "react";
import { MessageCircle, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function ShareButton({ title, text, size = "sm" }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareText = `${title}\n\n${text}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiato negli appunti" });
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button size={size} variant="outline" onClick={() => window.open(waUrl, "_blank")}>
        <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
      </Button>
      <Button size={size} variant="outline" onClick={handleCopy}>
        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
        {copied ? "Copiato" : "Copia"}
      </Button>
    </div>
  );
}