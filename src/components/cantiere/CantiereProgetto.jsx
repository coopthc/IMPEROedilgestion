import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import DocumentoForm from "@/components/cantiere/DocumentoForm";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  File,
  FileText,
  Receipt,
  FileCheck,
  Pencil,
  FolderOpen,
} from "lucide-react";

const CATEGORIE_PROGETTO = [
  { value: "contratto", label: "Contratto", icon: FileCheck },
  { value: "preventivo", label: "Preventivi", icon: FileText },
  { value: "fattura", label: "Fatture", icon: Receipt },
];

const PROGETTO_VALUES = CATEGORIE_PROGETTO.map((c) => c.value);

export default function CantiereProgetto({ cantiere, isCliente = false, soloVisibili = false }) {
  const [documenti, setDocumenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Documento.filter({
        cantiere_id: cantiere.id,
      });
      setDocumenti(data.filter((d) => PROGETTO_VALUES.includes(d.categoria)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cantiere.id]);

  const openNew = () => {
    setEditingDoc(null);
    setFormOpen(true);
  };

  const openEdit = (doc) => {
    setEditingDoc(doc);
    setFormOpen(true);
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return;
    await base44.entities.Documento.delete(doc.id);
    setDocumenti((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const toggleVisibile = async (doc) => {
    await base44.entities.Documento.update(doc.id, {
      visibile_cliente: !doc.visibile_cliente,
    });
    setDocumenti((prev) =>
      prev.map((d) =>
        d.id === doc.id ? { ...d, visibile_cliente: !d.visibile_cliente } : d
      )
    );
  };

  // isCliente: il cliente vede solo i visibili, può caricare ma non modificare/eliminare
  const viewOnly = soloVisibili && !isCliente;
  const visibili = (soloVisibili || isCliente)
    ? documenti.filter((d) => d.visibile_cliente)
    : documenti;
  const canAdd = !viewOnly;
  const canManage = !soloVisibili && !isCliente;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[14px] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          Progetto (contratto, preventivi, fatture)
        </h2>
        {canAdd && (
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi
          </Button>
        )}
      </div>

      {CATEGORIE_PROGETTO.map((cat) => {
        const docs = visibili.filter((d) => d.categoria === cat.value);
        if (docs.length === 0) return null;
        const Icon = cat.icon;
        return (
          <div key={cat.value} className="mb-4 last:mb-0">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </h3>
            <div className="space-y-2">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 bg-secondary/30 border border-border rounded-lg p-3"
                >
                  <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                    <File className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary truncate block"
                    >
                      {d.nome}
                    </a>
                    {d.note && (
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {d.note}
                      </span>
                    )}
                  </div>
                  {canManage && (
                    <>
                      <button
                        onClick={() => toggleVisibile(d)}
                        className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors flex-shrink-0 ${
                          d.visibile_cliente
                            ? "bg-green-500/15 text-green-500"
                            : "bg-secondary text-muted-foreground"
                        }`}
                        title={d.visibile_cliente ? "Visibile al cliente" : "Nascosto al cliente"}
                      >
                        {d.visibile_cliente ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {d.visibile_cliente ? "Visibile" : "Nascosto"}
                      </button>
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded hover:bg-primary/15 text-primary flex-shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        className="p-1.5 rounded hover:bg-destructive/15 text-destructive flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {visibili.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isCliente
            ? "Nessun documento disponibile. Carica un documento usando il pulsante sopra."
            : "Nessun documento. Carica contratto, preventivo o fattura."}
        </p>
      )}

      <DocumentoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        cantiere={cantiere}
        documento={editingDoc}
        onSaved={load}
        isCliente={isCliente}
      />
    </div>
  );
}