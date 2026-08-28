import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WidgetNotifiche() {
  const navigate = useNavigate();
  const [notifiche, setNotifiche] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Notifica.list("-created_date", 8);
        setNotifiche(list);
      } catch { setNotifiche([]); }
    })();
  }, []);

  const handleClick = async (n) => {
    // Segna come letta
    if (!n.letto) {
      try { await base44.entities.Notifica.update(n.id, { letto: true }); } catch { /* ignora */ }
      setNotifiche((prev) => prev.map((x) => x.id === n.id ? { ...x, letto: true } : x));
    }
    if (n.url) navigate(n.url);
  };

  if (!notifiche) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Notifiche</h3>
      </div>
      {notifiche.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4 text-center">Nessuna notifica</p>
      ) : (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {notifiche.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
                n.letto ? "bg-secondary/30 hover:bg-secondary/50" : "bg-primary/5 hover:bg-primary/10"
              } ${n.url ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.letto ? "bg-muted" : "bg-primary"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{n.titolo}</div>
                {n.testo && <div className="text-[10px] text-muted-foreground truncate">{n.testo}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}