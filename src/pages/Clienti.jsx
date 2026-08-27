import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  Building,
  MessageCircle,
  HardHat,
  ArrowUpCircle,
  KeyRound,
} from "lucide-react";

const waLink = (phone) =>
  "https://wa.me/" + (phone || "").replace(/[^0-9]/g, "");
import ClienteForm from "@/components/clienti/ClienteForm";
import PromozioneDialog from "@/components/clienti/PromozioneDialog";
import ExportButtons from "@/components/esporta/ExportButtons";
import { useToast } from "@/components/ui/use-toast";
import { inviaEmailAccesso, reinviaLinkAccesso } from "@/lib/emailAccesso";

const COLONNE_CLIENTI = [
  { label: "Nome", key: "nome" },
  { label: "Azienda", key: "azienda" },
  { label: "Email", key: "email" },
  { label: "Telefono", key: "telefono" },
  { label: "Città", key: "citta" },
  { label: "Provincia", key: "provincia" },
  { label: "P.IVA", key: "piva" },
  { label: "Codice Fiscale", key: "codice_fiscale" },
];

export default function Clienti() {
  const { toast } = useToast();
  const [clienti, setClienti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [promoCliente, setPromoCliente] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, cants] = await Promise.all([
        base44.entities.Cliente.list("-created_date"),
        base44.entities.Cantiere.list(),
      ]);
      setClienti(data);
      setCantieri(cants);
    } catch (err) {
      console.error("Errore caricamento clienti:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const cantieriDelCliente = (clienteId) =>
    cantieri.filter((c) => c.cliente_id === clienteId);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("entity-changed", handler);
    return () => window.removeEventListener("entity-changed", handler);
  }, [load]);

  const clientiFiltrati = clienti.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(q) ||
      c.azienda?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.citta?.toLowerCase().includes(q)
    );
  });

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (cliente) => {
    setEditing(cliente);
    setFormOpen(true);
  };

  const handleDelete = async (cliente) => {
    if (!confirm(`Eliminare il cliente "${cliente.nome}"?`)) return;
    try {
      await base44.entities.Cliente.delete(cliente.id);
      toast({ title: "Cliente eliminato" });
      load();
    } catch (err) {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  };

  const reinviaEmail = async (cliente) => {
    if (!cliente.email) return;
    try {
      await inviaEmailAccesso(cliente.email, cliente.nome, "cliente");
      toast({ title: "Email di accesso re-inviata", description: cliente.email });
    } catch (err) {
      toast({ title: "Errore invio email", variant: "destructive" });
    }
  };

  const reinviaLink = async (cliente) => {
    if (!cliente.email) return;
    try {
      await reinviaLinkAccesso(cliente.email);
      toast({ title: "Link di accesso re-inviato", description: cliente.email });
    } catch (err) {
      toast({ title: "Errore invio link", variant: "destructive" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Clienti
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {clienti.length} clienti registrati
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            title="Clienti"
            subtitle={`${clientiFiltrati.length} clienti — ${new Date().toLocaleDateString("it-IT")}`}
            columns={COLONNE_CLIENTI}
            data={clientiFiltrati}
            filename={`clienti-${new Date().toISOString().slice(0, 10)}`}
          />
          <Button onClick={handleNew} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nuovo
          </Button>
        </div>
      </div>

      {/* Ricerca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome, azienda, email, città..."
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
      ) : clientiFiltrati.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun cliente trovato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clientiFiltrati.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-[12px] p-4 transition-colors hover:border-primary/50 group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {c.nome?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">
                    {c.nome}
                  </h3>
                  {c.is_azienda && (
                    <span className="inline-block mt-1 text-[10px] font-medium text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                      Azienda
                    </span>
                  )}
                  {c.azienda && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3" />
                      {c.azienda}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors truncate"
                  >
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    {c.email}
                  </a>
                )}
                {c.telefono && (
                  <div className="flex items-center gap-2 text-xs">
                    <a
                      href={`tel:${c.telefono}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      {c.telefono}
                    </a>
                    <a
                      href={waLink(c.telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors"
                      title="Scrivi su WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="text-[11px]">WhatsApp</span>
                    </a>
                  </div>
                )}
                {c.citta && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {c.citta}
                    {c.provincia && ` (${c.provincia})`}
                  </div>
                )}
              </div>

              {(() => {
                const cantieriCollegati = cantieriDelCliente(c.id);
                if (cantieriCollegati.length === 0) return null;
                return (
                  <div className="mb-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                      Cantieri ({cantieriCollegati.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cantieriCollegati.map((cant) => (
                        <Link
                          key={cant.id}
                          to={`/cantieri/${cant.id}`}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                        >
                          <HardHat className="w-2.5 h-2.5" />
                          {cant.nome}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-1.5 pt-2 border-t border-border">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => handleEdit(c)}
                title="Modifica"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {c.email && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => reinviaEmail(c)}
                  title="Re-invia email di benvenuto"
                >
                  <Mail className="w-3.5 h-3.5" />
                </Button>
              )}
              {c.email && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => reinviaLink(c)}
                  title="Re-invia link di accesso (password)"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setPromoCliente(c)}
                title="Promuovi a supervisore / operaio"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleDelete(c)}
                title="Elimina"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClienteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={editing}
        onSaved={load}
      />

      <PromozioneDialog
        open={!!promoCliente}
        onOpenChange={(v) => !v && setPromoCliente(null)}
        cliente={promoCliente}
        onSaved={load}
      />
    </div>
  );
}