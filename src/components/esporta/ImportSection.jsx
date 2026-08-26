import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { parseCSV } from "@/lib/exportUtils";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const ENTITY_OPTIONS = [
  { value: "Cliente", label: "Clienti" },
  { value: "Collaboratore", label: "Collaboratori" },
  { value: "Cantiere", label: "Cantieri" },
  { value: "Lavorazione", label: "Lavorazioni" },
  { value: "Pagamento", label: "Pagamenti" },
  { value: "Appuntamento", label: "Appuntamenti" },
  { value: "Presenza", label: "Presenze" },
];

export default function ImportSection() {
  const { toast } = useToast();
  const [entity, setEntity] = useState("Cliente");
  const [parsed, setParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      setParsed(rows);
      if (rows.length === 0) {
        toast({ title: "File vuoto o non valido", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore lettura file", variant: "destructive" });
      setParsed(null);
    }
  };

  const handleImport = async () => {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      // Pulisce i record: rimuove campi vuoti e converte numeri
      const clean = parsed.map((row) => {
        const obj = {};
        Object.entries(row).forEach(([k, v]) => {
          if (v === "" || v == null) return;
          // converte campi numerici comuni
          if (["budget", "costo", "importo", "percentuale", "ore_totali", "ore_straordinarie", "ore_previste", "costo_orario", "appuntamenti_contemporanei", "percentuale_prevista", "percentuale_completata"].includes(k)) {
            const num = Number(String(v).replace(",", "."));
            if (!isNaN(num)) obj[k] = num;
          } else if (["is_azienda", "attivo", "visibile_cliente", "aggiunta_al_budget", "completato", "avviso_email"].includes(k)) {
            obj[k] = /^(true|si|sì|1)$/i.test(String(v).trim());
          } else {
            obj[k] = v;
          }
        });
        return obj;
      });
      const result = await base44.entities[entity].bulkCreate(clean);
      toast({
        title: "Import completato",
        description: `${clean.length} record importati in ${entity}`,
      });
      setParsed(null);
      setFileName("");
    } catch (err) {
      toast({ title: "Errore importazione", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" /> Importa dati
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Carica un file CSV per importare record. Le colonne del CSV devono
          corrispondere ai campi dell'entità scelta.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Entità di destinazione</Label>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-card">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">File CSV</Label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary w-full justify-center">
            <Upload className="w-3.5 h-3.5" />
            {fileName || "Seleziona file CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </div>
      </div>

      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>
              {parsed.length} record pronti per l'importazione in{" "}
              <strong>{entity}</strong>
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto border border-border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  {Object.keys(parsed[0] || {}).slice(0, 6).map((k) => (
                    <th key={k} className="text-left px-2 py-1.5 font-medium">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {Object.values(row).slice(0, 6).map((v, j) => (
                      <td key={j} className="px-2 py-1 truncate max-w-[120px]">
                        {String(v).substring(0, 30)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 10 && (
              <div className="text-[11px] text-muted-foreground text-center py-1.5 border-t border-border">
                ... e altre {parsed.length - 10} righe
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-[11px] text-muted-foreground">
              L'import aggiunge nuovi record. Non aggiorna record esistenti.
            </span>
          </div>
          <Button onClick={handleImport} disabled={importing} size="sm">
            {importing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Conferma import ({parsed.length} record)
          </Button>
        </div>
      )}
    </div>
  );
}