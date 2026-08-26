import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Network } from "lucide-react";
import { exportDiagrammaPDF } from "@/lib/exportUtils";

export default function DiagrammaCollegamenti({ cantieri, clienti, collaboratori, documenti }) {
  const [selectedId, setSelectedId] = useState("");
  const [exporting, setExporting] = useState(false);

  const cantieriAttivi = useMemo(
    () => (cantieri || []).filter((c) => !c.archiviato),
    [cantieri]
  );

  const selected = cantieriAttivi.find((c) => c.id === selectedId);

  const handleExport = () => {
    if (!selected) return;
    setExporting(true);
    try {
      const cliente = (clienti || []).find((cl) => cl.id === selected.cliente_id);
      const responsabile = (collaboratori || []).find((co) => co.id === selected.responsabile_id);
      const collabIds = (selected.collaboratori_ids || "").split(",").filter(Boolean);
      const collabs = collabIds
        .map((id) => (collaboratori || []).find((co) => co.id === id))
        .filter(Boolean);
      const docs = (documenti || []).filter((d) => d.cantiere_id === selected.id);

      exportDiagrammaPDF({
        cantiere: selected,
        cliente,
        responsabile,
        collaboratori: collabs,
        documenti: docs,
        filename: `diagramma-${(selected.nome || "cantiere").replace(/\s/g, "-").toLowerCase()}`,
      });
    } finally {
      setExporting(false);
    }
  };

  const docCount = selected
    ? (documenti || []).filter((d) => d.cantiere_id === selected.id).length
    : 0;
  const collabCount = selected
    ? (selected.collaboratori_ids || "").split(",").filter(Boolean).length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs text-muted-foreground">Seleziona cantiere</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="" className="bg-card">— Seleziona cantiere —</option>
            {cantieriAttivi.map((c) => (
              <option key={c.id} value={c.id} className="bg-card">{c.nome}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleExport} disabled={!selected || exporting} size="sm">
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-1" />
          )}
          Esporta PDF
        </Button>
      </div>

      {selected ? (
        <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3">
          <div className="text-xs text-muted-foreground">
            Il PDF includerà: dati cantiere (con descrizione e note), cliente, responsabile,
            collaboratori assegnati e documenti collegati (nome e categoria).
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-card border border-border rounded p-2">
              <div className="text-muted-foreground">Cliente</div>
              <div className="font-medium truncate">
                {(() => {
                  const cl = (clienti || []).find((c) => c.id === selected.cliente_id);
                  return cl ? (cl.is_azienda ? cl.azienda || cl.nome : cl.nome) : "—";
                })()}
              </div>
            </div>
            <div className="bg-card border border-border rounded p-2">
              <div className="text-muted-foreground">Responsabile</div>
              <div className="font-medium truncate">
                {(collaboratori || []).find((co) => co.id === selected.responsabile_id)?.nome || "—"}
              </div>
            </div>
            <div className="bg-card border border-border rounded p-2">
              <div className="text-muted-foreground">Collaboratori</div>
              <div className="font-medium">{collabCount}</div>
            </div>
            <div className="bg-card border border-border rounded p-2">
              <div className="text-muted-foreground">Documenti</div>
              <div className="font-medium">{docCount}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 border border-dashed border-border rounded-lg p-4">
          <Network className="w-4 h-4" />
          Seleziona un cantiere per esportare il diagramma dei collegamenti in PDF.
        </div>
      )}
    </div>
  );
}