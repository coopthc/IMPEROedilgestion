import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  HardHat,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Loader2,
  Building,
  MessageCircle,
} from "lucide-react";

const waLink = (phone) =>
  "https://wa.me/" + (phone || "").replace(/[^0-9]/g, "");
import CollaboratoreForm from "@/components/collaboratori/CollaboratoreForm";
import ExportButtons from "@/components/esporta/ExportButtons";
import { useToast } from "@/components/ui/use-toast";
import { inviaEmailAccesso } from "@/lib/emailAccesso";

const COLONNE_COLLABORATORI = [
  { label: "Nome", key: "nome" },
  { label: "Qualifica", value: (c) => QUALIFICA_LABELS[c.qualifica] || c.qualifica },
  { label: "Email", key: "email" },
  { label: "Telefono", key: "telefono" },
  { label: "Costo orario", value: (c) => (c.costo_orario ? `€ ${c.costo_orario}` : "") },
  { label: "Attivo", value: (c) => (c.attivo === false ? "No" : "Sì") },
];

const QUALIFICA_LABELS = {
  amministratore: "Amministratore",
  capo_cantiere: "Capo cantiere",
  operaio: "Operaio",
  tecnico: "Tecnico",
  supervisore: "Supervisore",
  amministrazione: "Supervisore",
  altro: "Operaio",
};

export default function Collaboratori() {
  const { toast } = useToast();
  const [collaboratori, setCollaboratori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroAttivo, setFiltroAttivo] = useState("tutti");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Collaboratore.list("-created_date");
      setCollaboratori(data);
    } catch (err) {
      console.error("Errore caricamento collaboratori:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("entity-changed", handler);
    return () => window.removeEventListener("entity-changed", handler);
  }, [load]);

  const filtrati = collaboratori.filter((c) => {
    if (filtroAttivo === "attivi" && c.attivo === false) return false;
    if (filtroAttivo === "inattivi" && c.attivo !== false) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.qualifica?.toLowerCase().includes(q)
    );
  });

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (coll) => {
    setEditing(coll);
    setFormOpen(true);
  };

  const handleDelete = async (coll) => {
    if (!confirm(`Eliminare il collaboratore "${coll.nome}"?`)) return;
    try {
      await base44.entities.Collaboratore.delete(coll.id);
      toast({ title: "Collaboratore eliminato" });
      load();
    } catch (err) {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  };

  const toggleAttivo = async (coll) => {
    try {
      await base44.entities.Collaboratore.update(coll.id, {
        attivo: coll.attivo === false ? true : false,
      });
      load();
    } catch (err) {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const reinvita = async (coll) => {
    if (!coll.email) {
      toast({ title: "Nessuna email registrata", variant: "destructive" });
      return;
    }
    try {
      await inviaEmailAccesso(coll.email, coll.nome, "collaboratore");
      toast({ title: "Email di accesso re-inviata", description: coll.email });
    } catch (err) {
      toast({ title: "Errore invio email", variant: "destructive" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <HardHat className="w-5 h-5 text-primary" />
            Collaboratori
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {collaboratori.length} collaboratori registrati
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            title="Collaboratori"
            subtitle={`${filtrati.length} collaboratori — ${new Date().toLocaleDateString("it-IT")}`}
            columns={COLONNE_COLLABORATORI}
            data={filtrati}
            filename={`collaboratori-${new Date().toISOString().slice(0, 10)}`}
          />
          <Button onClick={handleNew} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nuovo
          </Button>
        </div>
      </div>

      {/* Ricerca + filtri */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, qualifica, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { value: "tutti", label: "Tutti" },
            { value: "attivi", label: "Attivi" },
            { value: "inattivi", label: "Inattivi" },
          ].map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filtroAttivo === f.value ? "default" : "outline"}
              onClick={() => setFiltroAttivo(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtrati.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <HardHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun collaboratore trovato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrati.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-[12px] p-4 transition-colors hover:border-primary/50"
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
                  <Badge
                    variant="secondary"
                    className="mt-1 text-[10px] px-1.5 py-0"
                  >
                    {QUALIFICA_LABELS[c.qualifica] || c.qualifica}
                  </Badge>
                </div>
                <button
                  onClick={() => toggleAttivo(c)}
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-colors ${
                    c.attivo === false ? "bg-muted-foreground/40" : "bg-green-500"
                  }`}
                  title={c.attivo === false ? "Inattivo" : "Attivo"}
                />
              </div>

              <div className="space-y-1.5 mb-3 min-h-[40px]">
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
                {c.costo_orario != null && (
                  <div className="text-xs text-muted-foreground">
                    Costo orario:{" "}
                    <span className="text-foreground font-medium">
                      € {Number(c.costo_orario).toFixed(2)}
                    </span>
                    /h
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 pt-2 border-t border-border">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleEdit(c)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {c.email && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => reinvita(c)}
                    title="Re-invia email di benvenuto"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(c)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CollaboratoreForm
        open={formOpen}
        onOpenChange={setFormOpen}
        collaboratore={editing}
        onSaved={load}
      />
    </div>
  );
}