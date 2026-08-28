import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Bell, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifiche, setNotifiche] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all = await base44.entities.Notifica.filter(
        { user_id: user.id },
        "-created_date",
        30
      );
      setNotifiche(all);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Notifica.subscribe(() => load());
    return unsubscribe;
  }, [load]);

  const nonLette = notifiche.filter((n) => !n.letto);
  const urgentiNonLette = nonLette.filter((n) => n.urgente);

  const markAsRead = async (n) => {
    setOpen(false);
    if (!n.letto) {
      try {
        await base44.entities.Notifica.update(n.id, { letto: true });
      } catch {
        // ignore
      }
    }
    if (n.url) navigate(n.url);
    else navigate("/agenda");
  };

  const markAllRead = async () => {
    const daLeggere = nonLette.map((n) => ({ id: n.id, letto: true }));
    if (daLeggere.length === 0) return;
    try {
      await base44.entities.Notifica.bulkUpdate(daLeggere);
      load();
    } catch {
      // ignore
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <Bell className="w-5 h-5" />
          {nonLette.length > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
              urgentiNonLette.length > 0
                ? "bg-red-500 text-white animate-pulse"
                : "bg-primary text-primary-foreground"
            }`}>
              {nonLette.length > 9 ? "9+" : nonLette.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-semibold">Notifiche</span>
          {nonLette.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Segna tutte lette
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifiche.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nessuna notifica
            </p>
          ) : (
            notifiche.map((n) => (
              <button
                key={n.id}
                onClick={() => markAsRead(n)}
                className={`w-full text-left p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors flex gap-2.5 ${
                  !n.letto ? "bg-primary/5" : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    n.letto
                      ? "bg-transparent"
                      : n.urgente
                      ? "bg-red-500 animate-pulse"
                      : "bg-primary"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.titolo}</div>
                  {n.testo && (
                    <div className="text-xs text-muted-foreground truncate">
                      {n.testo}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(n.created_date).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}