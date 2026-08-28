import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import DocumentoForm from "@/components/cantiere/DocumentoForm";
import { Plus, Trash2, Loader2, File, Upload } from "lucide-react";

const PROGETTO_CATEGORIES = ["contratto", "fattura", "preventivo"];

export default function CantiereDocumentiCliente({ cantiere }) {
  const [documenti, setDocumenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Documento.filter({
        cantiere_id: cantiere.id,
      });
      // Il cliente vede solo documenti visibili, escludendo quelli del progetto
      setDocumenti(data.filter((d) => d.visibile_cliente && !PROGETTO_CATEGORIES.includes(d.categoria)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cantiere.id]);

  const handleDelete = async (doc) => {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return;
    await base44.entities.Documento.delete(doc.id);
    setDocumenti((prev) => prev.filter((d) => d.id !== doc.id));
  };

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
          <Upload className="w-4 h-4 text-primary" />
          I miei documenti
        </h2>
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Carica documento
        </Button>
      </div>

      {documenti.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nessun documento caricato. Carica foto, planimetrie o altri documenti.
        </p>
      ) : (
        <div className="space-y-2">
          {documenti.map((d) => (
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
                {!d.note && (
                  <span className="text-[10px] text-muted-foreground capitalize">{d.categoria}</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(d)}
                className="p-1.5 rounded hover:bg-destructive/15 text-destructive flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <DocumentoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        cantiere={cantiere}
        onSaved={load}
        isCliente={true}
      />
    </div>
  );
}