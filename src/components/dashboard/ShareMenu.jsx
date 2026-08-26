import React from "react";
import { Share2, MessageCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

export default function ShareMenu({ title, text }) {
  const { toast } = useToast();
  const shareText = `${title}\n\n${text}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
          <Share2 className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank")}>
          <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(shareText); toast({ title: "Copiato negli appunti" }); }}>
          <Copy className="w-4 h-4 mr-2" /> Copia testo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}