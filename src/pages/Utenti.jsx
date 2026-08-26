import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  UserCog,
  Search,
  Plus,
  Pencil,
  Mail,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from "lucide-react";
import UtenteFormDialog, { LIVELLO_LABEL } from "@/components/utenti/UtenteFormDialog";

const RUOLO_STILE = {
  admin: { icon: ShieldCheck, cls: "bg-primary/20 text-primary border-primary/40" },
  mssg_admin: { icon: Shield, cls: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  mssg_capo: { icon: ShieldAlert, cls: "bg-green-500/20 text-green-400 border-green-500/40" },
  mssg_operaio: { icon: ShieldAlert, cls: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  mssg_cliente: { icon: Lock, cls: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  user: { icon: UserCog, cls: "bg-muted text-muted-foreground border-border" },
};

export default function Utenti() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [utenti, setUtenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.User.list("-created_date");
      setUtenti(data);
    } catch (err) {
      console.error("Errore caricamento utenti:", err);
      toast({ title: "Errore caricamento utenti", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtrati = utenti.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.ruolo_personalizzato?.toLowerCase().includes(q) ||
      LIVELLO_LABEL[u.role]?.toLowerCase().includes(q)
    );
  });

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (u) => {
    setEditing(u);
    setFormOpen(true);
  };

  const toggleSupervisore = async (u, campo) => {
    setTogglingId(u.id + campo);
    try {
      await base44.entities.User.update(u.id, { [campo]: !u[campo] });
      setUtenti((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, [campo]: !u[campo] } : x))
      );
    } catch (err) {
      toast({ title: "Errore aggiornamento", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const reinvita = async (u) => {
    try {
      await base44.users.inviteUser(u.email, u.role);
      toast({ title: "Email re-inviata", description: u.email });
    } catch (err) {
      toast({ title: "Errore invio email", variant: "destructive" });
    }
  };

  if (me?.role !== "admin") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Accesso riservato agli amministratori.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Utenti
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {utenti.length} utenti registrati
          </p>
        </div>
        <Button onClick={handleNew} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nuovo utente
        </Button>
      </div>

      {/* Legenda livelli */}
      <div className="mb-4 rounded-lg border border-border bg-secondary/20 p-3 text-[12px] text-muted-foreground space-y-1">
        <p><strong className="text-foreground">Amministratore</strong> — accesso completo a tutto il gestionale.</p>
        <p><strong className="text-foreground">Supervisore</strong> — vede tutti i cantieri. Le spunte <em>Pagamenti</em> e <em>Chat</em> sbloccano la gestione completa di quelle sezioni.</p>
        <p><strong className="text-foreground">Capocantiere / Operaio / Tecnico</strong> — vedono solo i cantieri assegnati; niente pagamenti, niente chat cliente. Possono gestire la squadra, caricare foto e documenti.</p>
        <p><strong className="text-foreground">Cliente</strong> — vede il proprio cantiere, avanzamento, pagamenti (sola visione), documenti visibili e chat. Agenda in sola prenotazione.</p>
      </div>

      {/* Ricerca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, email, ruolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtrati.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UserCog className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun utente trovato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrati.map((u) => {
            const stile = RUOLO_STILE[u.role] || RUOLO_STILE.user;
            const Icona = stile.icon;
            const isSupervisore = u.role === "mssg_admin";
            const etichetta = u.ruolo_personalizzato || LIVELLO_LABEL[u.role] || u.role;
            return (
              <div
                key={u.id}
                className="bg-card border border-border rounded-[12px] p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight truncate">
                      {u.full_name || "—"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {u.email}
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-[10px] px-1.5 py-0 gap-1 ${stile.cls}`}
                    >
                      <Icona className="w-3 h-3" />
                      {etichetta}
                    </Badge>
                  </div>
                </div>

                {/* Spunte supervisore inline */}
                {isSupervisore && (
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => toggleSupervisore(u, "supervisore_pagamenti")}
                      disabled={togglingId === u.id + "supervisore_pagamenti"}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        u.supervisore_pagamenti
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-transparent border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {togglingId === u.id + "supervisore_pagamenti" ? (
                        <Loader2 className="w-3 h-3 animate-spin inline" />
                      ) : null}
                      Pagamenti
                    </button>
                    <button
                      onClick={() => toggleSupervisore(u, "supervisore_chat")}
                      disabled={togglingId === u.id + "supervisore_chat"}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        u.supervisore_chat
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-transparent border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {togglingId === u.id + "supervisore_chat" ? (
                        <Loader2 className="w-3 h-3 animate-spin inline" />
                      ) : null}
                      Chat
                    </button>
                  </div>
                )}

                <div className="flex gap-1.5 pt-2 border-t border-border">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleEdit(u)}
                    title="Modifica"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => reinvita(u)}
                    title="Re-invia invito"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UtenteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        utente={editing}
        onSaved={load}
      />
    </div>
  );
}