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
} from "lucide-react";
import CollaboratoreForm from "@/components/collaboratori/CollaboratoreForm";
import { useToast } from "@/components/ui/use-toast";

const QUALIFICA_LABELS = {
  capo_cantiere: "Capo cantiere",
  operaio: "Operaio",
  tecnico: "Tecnico",
  amministrazione: "Amministrazione",
  altro: "Altro",
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
        <Button onClick={handleNew} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nuovo
        </Button>
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
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    {c.email}
                  </div>
                )}
                {c.telefono && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    {c.telefono}
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