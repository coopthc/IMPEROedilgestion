import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WidgetChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ChatMessage.list("-created_date", 6);
        setMessages(list);
      } catch { setMessages([]); }
    })();
  }, []);
  if (!messages) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-pink-400" />
        <h3 className="text-sm font-semibold">Ultime chat</h3>
      </div>
      {messages.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4 text-center">Nessun messaggio</p>
      ) : (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {messages.map((m) => {
            const clickable = !!m.cantiere_id;
            return (
              <button
                key={m.id}
                onClick={() => clickable && navigate(`/cantieri/${m.cantiere_id}`)}
                disabled={!clickable}
                className={`w-full flex items-start gap-2 p-2 bg-secondary/30 rounded-lg text-left transition-colors ${
                  clickable ? "hover:bg-secondary/60 cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {(m.mittente_nome || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{m.mittente_nome || "—"}</span>
                    <span className={`text-[9px] px-1.5 rounded-full ${m.canale === "cliente" ? "bg-purple-500/15 text-purple-400" : "bg-blue-500/15 text-blue-400"}`}>
                      {m.canale}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{m.testo}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}