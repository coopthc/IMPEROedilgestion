import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageCircle, ShieldCheck } from "lucide-react";
import { creaNotifiche } from "@/lib/notifiche";

const RUOLI_LABEL = {
  admin: "Admin",
  mssg_admin: "Admin",
  mssg_capo: "Capo cantiere",
  mssg_operaio: "Operaio",
  mssg_cliente: "Cliente",
};

export default function CantiereChat({ cantiere, collaboratori, canale = "squadra" }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ChatMessage.filter({
        cantiere_id: cantiere.id,
        canale: canale,
      });
      setMessages(
        data.sort((a, b) => (a.created_date || "").localeCompare(b.created_date || ""))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      const d = event.data;
      if (!d || d.cantiere_id !== cantiere.id || d.canale !== canale) return;
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === d.id)) return prev;
          return [...prev, d];
        });
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== d.id));
      }
    });
    return unsubscribe;
  }, [cantiere.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await base44.entities.ChatMessage.create({
        canale: canale,
        cantiere_id: cantiere.id,
        mittente_id: user?.id || "",
        mittente_nome: user?.full_name || "—",
        mittente_ruolo: user?.role || "",
        testo: text.trim(),
        letto_da: user?.id || "",
      });
      setMessages((prev) => [...prev, msg]);
      setText("");
      // Notifica in base al canale
      if (canale === "squadra") {
        const otherIds = (collaboratori || [])
          .filter((c) => c.user_id !== user?.id)
          .map((c) => c.id);
        if (otherIds.length > 0) {
          await creaNotifiche({
            collaboratoriIds: otherIds,
            tipo: "aggiornamento",
            titolo: `Nuovo messaggio chat - ${cantiere.nome}`,
            testo: text.trim(),
            url: `/cantieri/${cantiere.id}`,
          });
        }
      } else if (canale === "cliente" && user?.role === "mssg_cliente") {
        const responsabile = (collaboratori || []).find(
          (c) => c.id === cantiere.responsabile_id
        );
        if (responsabile) {
          await creaNotifiche({
            collaboratoriIds: [responsabile.id],
            tipo: "aggiornamento",
            titolo: `Nuovo messaggio dal cliente - ${cantiere.nome}`,
            testo: text.trim(),
            url: `/cantieri/${cantiere.id}`,
          });
        }
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-card border border-border rounded-[14px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">
            {canale === "squadra" ? "Chat squadra" : "Chat con il cliente"}
          </h3>
        </div>
        {canale === "squadra" && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            Non visibile al cliente
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nessun messaggio. Inizia la conversazione.</p>
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.mittente_id === user?.id;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                {!isMine && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold">
                      {m.mittente_nome || "—"}
                    </span>
                    {m.mittente_ruolo && RUOLI_LABEL[m.mittente_ruolo] && (
                      <span className="text-[9px] uppercase tracking-wide opacity-60">
                        {RUOLI_LABEL[m.mittente_ruolo]}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{m.testo}</p>
                <div
                  className={`text-[10px] mt-0.5 ${
                    isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {formatTime(m.created_date)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-border">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Scrivi un messaggio…"
          disabled={sending}
        />
        <Button size="icon" onClick={send} disabled={sending || !text.trim()}>
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}