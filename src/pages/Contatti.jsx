import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building,
  MessageCircle,
  Download,
  Loader2,
  Share2,
  Lock,
} from "lucide-react";
import ContattoForm from "@/components/contatti/ContattoForm";
import PromuoviContattoDialog from "@/components/contatti/PromuoviContattoDialog";
import { HardHat, ArrowUpCircle, Star } from "lucide-react";

const waLink = (phone) => "https://wa.me/" + (phone || "").replace(/[^0-9]/g, "");

function escapeVcard(str) {
  return String(str || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function buildVcard(c) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVcard(c.nome)}`,
    c.azienda ? `ORG:${escapeVcard(c.azienda)}` : "",
    c.telefono ? `TEL;TYPE=CELL:${escapeVcard(c.telefono)}` : "",
    c.email ? `EMAIL:${escapeVcard(c.email)}` : "",
    c.ruolo ? `TITLE:${escapeVcard(c.ruolo)}` : "",
    c.note ? `NOTE:${escapeVcard(c.note)}` : "",
    "END:VCARD",
  ].filter(Boolean).join("\n");
}

function buildCsv(contatti) {
  const headers = ["Nome", "Azienda", "Telefono", "Email", "Ruolo", "Note"];
  const rows = contatti.map((c) =>
    [c.nome, c.azienda, c.telefono, c.email, c.ruolo, c.note]
      .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Contatti() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [contatti, setContatti] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [promoContatto, setPromoContatto] = useState(null);
  const [filtro, setFiltro] = useState("tutti"); // tutti | personali | aziendali
  const [preferiti, setPreferiti] = useState(() => {
    try {
      const raw = localStorage.getItem("contatti_preferiti");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  const togglePreferito = (id) => {
    setPreferiti((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("contatti_preferiti", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, colls, clis] = await Promise.all([
        base44.entities.Contatto.list("-created_date"),
        base44.entities.Collaboratore.list("-created_date").catch(() => []),
        isAdmin
          ? base44.entities.Cliente.list("-created_date").catch(() => [])
          : Promise.resolve([]),
      ]);
      setContatti(data);
      setCollaboratori(colls);
      setClienti(clis);
    } catch (err) {
      console.error("Errore caricamento contatti:", err);
      toast({ title: "Errore caricamento contatti", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, isAdmin]);

  useEffect(() => {
    load();
    const unsub = base44.entities.Contatto.subscribe(() => load());
    return () => unsub?.();
  }, [load]);

  const miei = useMemo(
    () => contatti.filter((c) => c.created_by_id === user?.id),
    [contatti, user]
  );

  const condivisi = useMemo(
    () =>
      contatti
        .filter((c) => c.created_by_id !== user?.id && c.condivisa === true)
        .sort((a, b) =>
          (a.proprietario_nome || "—").localeCompare(b.proprietario_nome || "—")
        ),
    [contatti, user]
  );

  const condivisiPerProprietario = useMemo(() => {
    const map = {};
    condivisi.forEach((c) => {
      const key = c.proprietario_nome || "Altro";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return Object.entries(map);
  }, [condivisi]);

  const filtra = (list) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.nome?.toLowerCase().includes(q) ||
        c.azienda?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.ruolo?.toLowerCase().includes(q)
    );
  };

  const collabAsContatti = useMemo(
    () =>
      collaboratori.map((c) => ({
        id: "coll-" + c.id,
        _id: c.id,
        nome: c.nome,
        azienda: c.azienda || "",
        email: c.email || "",
        telefono: c.telefono || "",
        ruolo: c.qualifica || "",
        note: c.attivo === false ? "Non attivo" : "",
        derived: "collaboratore",
        _cat: "aziendale",
      })),
    [collaboratori]
  );

  const clientiAsContatti = useMemo(
    () =>
      clienti.map((c) => ({
        id: "cli-" + c.id,
        _id: c.id,
        nome: c.nome,
        azienda: c.azienda || "",
        email: c.email || "",
        telefono: c.telefono || "",
        ruolo: "Cliente",
        note: "",
        derived: "cliente",
        _cat: "aziendale",
      })),
    [clienti]
  );

  const collabFiltrati = filtra(collabAsContatti);
  const clientiFiltrati = filtra(clientiAsContatti);

  const mieiFiltrati = filtra(miei);

  const allContatti = useMemo(
    () => [
      ...miei.map((c) => ({ ...c, _cat: "personale" })),
      ...collabAsContatti,
      ...clientiAsContatti,
      ...condivisi.map((c) => ({ ...c, _cat: "aziendale" })),
    ],
    [miei, collabAsContatti, clientiAsContatti, condivisi]
  );

  const preferitiList = useMemo(
    () =>
      allContatti.filter(
        (c) =>
          preferiti.has(c.id) &&
          (filtro === "tutti" || c._cat === filtro) &&
          (!search || filtra([c]).length > 0)
      ),
    [allContatti, preferiti, filtro, search]
  );

  const showPersonali = filtro === "tutti" || filtro === "personali";
  const showAziendali = filtro === "tutti" || filtro === "aziendali";

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (c) => {
    setEditing(c);
    setFormOpen(true);
  };

  const handleDelete = async (c) => {
    if (!confirm(`Eliminare il contatto "${c.nome}"?`)) return;
    try {
      await base44.entities.Contatto.delete(c.id);
      toast({ title: "Contatto eliminato" });
      load();
    } catch (err) {
      toast({
        title: "Eliminazione non consentita",
        description: "Solo il proprietario o un amministratore possono eliminare questo contatto.",
        variant: "destructive",
      });
    }
  };

  const exportVcard = () => {
    if (miei.length === 0) {
      toast({ title: "Nessun contatto da esportare" });
      return;
    }
    const vcf = miei.map(buildVcard).join("\n\n");
    download(`rubrica-${new Date().toISOString().slice(0, 10)}.vcf`, vcf, "text/vcard");
    toast({ title: "Rubrica esportata (vCard)" });
  };

  const exportCsv = () => {
    if (miei.length === 0) {
      toast({ title: "Nessun contatto da esportare" });
      return;
    }
    download(`rubrica-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(miei), "text/csv");
    toast({ title: "Rubrica esportata (CSV)" });
  };

  const renderCard = (c, shared = false) => {
    const canEdit = !c.derived && (c.created_by_id === user?.id || isAdmin);
    const canPromote = !c.derived && c.created_by_id === user?.id;
    return (
      <div
        key={c.id}
        className="bg-card border border-border rounded-[12px] p-4 transition-colors hover:border-primary/50"
      >
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {c.nome?.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{c.nome}</h3>
            {c.azienda && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Building className="w-3 h-3" />
                {c.azienda}
              </p>
            )}
            {c.ruolo && (
              <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                {c.ruolo}
              </Badge>
            )}
          </div>
          {shared && (
            <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <Share2 className="w-2.5 h-2.5" /> condiviso
            </span>
          )}
          {c.derived === "collaboratore" && (
            <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <HardHat className="w-2.5 h-2.5" /> azienda
            </span>
          )}
          {c.derived === "cliente" && (
            <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
              azienda
            </span>
          )}
        </div>

        <div className="space-y-1.5 mb-3 min-h-[36px]">
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
              </a>
            </div>
          )}
          {c.note && (
            <p className="text-[11px] text-muted-foreground italic truncate">{c.note}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => togglePreferito(c.id)}
            title={preferiti.has(c.id) ? "Rimuovi dai preferiti" : "Fissa tra i preferiti"}
          >
            <Star className={"w-3.5 h-3.5 " + (preferiti.has(c.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
          </Button>
          {canEdit ? (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(c)} title="Modifica">
                <Pencil className="w-3.5 h-3.5" />
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
              {canPromote && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 ml-auto text-primary hover:text-primary"
                  onClick={() => setPromoContatto(c)}
                  title="Promuovi a collaboratore"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 py-1 ml-1">
              <Lock className="w-3 h-3" /> {c.derived ? "Gestito in " + (c.derived === "collaboratore" ? "Collaboratori" : "Clienti") : "Condivisa in lettura"}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Contatti
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            La tua rubrica personale + rubriche condivise dall'azienda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportVcard} title="Esporta i tuoi contatti come vCard">
            <Download className="w-4 h-4 mr-1" /> vCard
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} title="Esporta i tuoi contatti come CSV">
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button onClick={handleNew} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nuovo
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca tra tutti i contatti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 self-start">
          {[
            { v: "tutti", label: "Tutti" },
            { v: "personali", label: "Personali" },
            { v: "aziendali", label: "Aziendali" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFiltro(f.v)}
              className={
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors " +
                (filtro === f.v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preferiti / Fissati */}
          {preferitiList.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-400" /> Preferiti
                <span className="text-[10px] text-muted-foreground font-normal">({preferitiList.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {preferitiList.map((c) =>
                  renderCard(c, !!c.created_by_id && c.created_by_id !== user?.id && c.condivisa === true)
                )}
              </div>
            </section>
          )}

          {/* I miei contatti */}
          {showPersonali && (
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" /> I miei contatti
                <span className="text-[10px] text-muted-foreground font-normal">({mieiFiltrati.length})</span>
              </h2>
              {mieiFiltrati.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-6 text-center bg-secondary/20 rounded-lg">
                  {search ? "Nessun risultato." : "Nessun contatto. Clicca \"Nuovo\" per aggiungerne uno."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mieiFiltrati.map((c) => renderCard(c, false))}
                </div>
              )}
            </section>
          )}

          {/* Rubrica aziendale - Collaboratori (automatico) */}
          {showAziendali && collabFiltrati.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <HardHat className="w-4 h-4 text-primary" /> Collaboratori aziendali
                <span className="text-[10px] text-muted-foreground font-normal">({collabFiltrati.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {collabFiltrati.map((c) => renderCard(c, false))}
              </div>
            </section>
          )}

          {/* Clienti (solo admin, automatico) */}
          {showAziendali && isAdmin && clientiFiltrati.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" /> Clienti
                <span className="text-[10px] text-muted-foreground font-normal">({clientiFiltrati.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {clientiFiltrati.map((c) => renderCard(c, false))}
              </div>
            </section>
          )}

          {/* Rubriche condivise */}
          {showAziendali && condivisiPerProprietario.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4 text-primary" /> Rubriche condivise
                <span className="text-[10px] text-muted-foreground font-normal">({condivisi.length})</span>
              </h2>
              <div className="space-y-4">
                {condivisiPerProprietario.map(([proprietario, lista]) => {
                  const filtrati = filtra(lista);
                  if (filtrati.length === 0 && search) return null;
                  return (
                    <div key={proprietario}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {proprietario}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtrati.map((c) => renderCard(c, true))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <ContattoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contatto={editing}
        onSaved={load}
      />

      <PromuoviContattoDialog
        open={!!promoContatto}
        onOpenChange={(v) => !v && setPromoContatto(null)}
        contatto={promoContatto}
        onSaved={load}
      />
    </div>
  );
}