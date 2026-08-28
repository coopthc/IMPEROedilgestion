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
  ShieldCheck,
  Shield,
  Lock,
  KeyRound,
} from "lucide-react";
import UtenteFormDialog, { LIVELLO_LABEL } from "@/components/utenti/UtenteFormDialog";
import { inviaEmailAccesso, reinviaLinkAccesso } from "@/lib/emailAccesso";

const RUOLO_STILE = {
  admin: { icon: ShieldCheck, cls: "bg-primary/20 text-primary border-primary/40" },
  mssg_admin: { icon: Shield, cls: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
};

export default function Utenti() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [utenti, setUtenti] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.User.list("-created_date");
      // Amministratori e supervisori nella sezione principale
      setUtenti(data.filter((u) => u.role === "admin" || u.role === "mssg_admin"));
      // Utenti in attesa: ruolo non valido (nessun abbinamento Cliente/Collaboratore)
      const RUOLI_VALIDI = ["admin", "mssg_admin", "mssg_capo", "mssg_operaio", "mssg_cliente"];
      setPending(data.filter((u) => !RUOLI_VALIDI.includes(u.role)));
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
      await base44.functions.invoke("aggiornaUtenteGestionale", {
        user_id: u.id,
        data: { [campo]: !u[campo] },
      });
      setUtenti((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, [campo]: !u[campo] } : x))
      );
    } catch (err) {
      toast({ title: "Errore aggiornamento", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const toggleRubrica = async (u) => {
    setTogglingId(u.id + "rubrica");
    try {
      await base44.functions.invoke("impostaRubricaCondivisa", {
        user_id: u.id,
        condivisa: !u.rubrica_condivisa,
      });
      setUtenti((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, rubrica_condivisa: !u.rubrica_condivisa } : x))
      );
    } catch (err) {
      toast({ title: "Errore aggiornamento rubrica", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const reinvita = async (u) => {
    try {
      await inviaEmailAccesso(u.email, u.full_name || "", "amministratore");
      toast({ title: "Email di accesso re-inviata", description: u.email });
    } catch (err) {
      toast({ title: "Errore invio email", variant: "destructive" });
    }
  };

  const reinviaLink = async (u) => {
    try {
      await reinviaLinkAccesso(u.email);
      toast({ title: "Link di accesso re-inviato", description: u.email });
    } catch (err) {
      toast({ title: "Errore invio link", variant: "destructive" });
    }
  };

  if (me?.role !== "admin" && me?.role !== "mssg_admin") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Accesso riservato agli amministratori.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Amministratori
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {utenti.length} amministratori e supervisori
          </p>
        </div>
        <Button onClick={handleNew} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nuovo amministratore
        </Button>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-secondary/20 p-3 text-[12px] text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Amministratore</strong> — accesso
          completo a tutto il gestionale.
        </p>
        <p>
          <strong className="text-foreground">Supervisore</strong> — vede tutti i
          cantieri. Le spunte <em>Pagamenti</em> e <em>Chat</em> sbloccano la
          gestione completa di quelle sezioni.
        </p>
        <p className="pt-1 text-[11px]">
          I clienti si creano in <strong>Clienti</strong>, i collaboratori in{" "}
          <strong>Collaboratori</strong>: ricevono automaticamente l'account con
          il ruolo corretto. Da Clienti puoi promuovere un cliente a supervisore
          o operaio.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="mb-5 rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-yellow-500">
              Utenti in attesa di abbinamento ({pending.length})
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3">
            Questi utenti si sono registrati ma non hanno un record Cliente o
            Collaboratore associato. Sono bloccati e non possono accedere al
            gestionale. Per attivarli, crea un Cliente o Collaboratore con la
            loro email (verranno abbinati automaticamente al prossimo accesso),
            oppure promuovili ad amministratore/supervisore.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pending.map((u) => (
              <div
                key={u.id}
                className="bg-card border border-yellow-500/30 rounded-[12px] p-3"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-yellow-500">
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs leading-tight truncate">
                      {u.full_name || "—"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {u.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() => handleEdit(u)}
                    title="Promuovi ad amministratore/supervisore"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Promuovi
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() =>
                      (window.location.href = `/clienti?email=${encodeURIComponent(u.email)}`)
                    }
                    title="Crea cliente con questa email"
                  >
                    Cliente
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() =>
                      (window.location.href = `/collaboratori?email=${encodeURIComponent(u.email)}`)
                    }
                    title="Crea collaboratore con questa email"
                  >
                    Collab.
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, email, ruolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtrati.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UserCog className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun amministratore trovato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrati.map((u) => {
            const stile = RUOLO_STILE[u.role] || RUOLO_STILE.mssg_admin;
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

                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => toggleRubrica(u)}
                    disabled={togglingId === u.id + "rubrica"}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      u.rubrica_condivisa
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-transparent border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {togglingId === u.id + "rubrica" ? (
                      <Loader2 className="w-3 h-3 animate-spin inline" />
                    ) : null}
                    Rubrica condivisa
                  </button>
                </div>

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
                    title="Re-invia email di benvenuto"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => reinviaLink(u)}
                    title="Re-invia link di accesso (password)"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
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