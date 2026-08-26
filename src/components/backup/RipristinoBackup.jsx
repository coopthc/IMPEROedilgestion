import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { parseCSV } from "@/lib/exportUtils";
import {
  RotateCcw, Loader2, Download, FileText, File as FileIcon, Image, Video,
  Cloud, Database, AlertTriangle, Package, ArchiveRestore,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FILE_TO_ENTITY = {
  "Clienti.csv": "Cliente",
  "Collaboratori.csv": "Collaboratore",
  "Cantieri.csv": "Cantiere",
  "Lavorazioni.csv": "Lavorazione",
  "Pagamenti.csv": "Pagamento",
  "Presenze.csv": "Presenza",
  "Appuntamenti.csv": "Appuntamento",
  "Documenti.csv": "Documento",
  "Aggiornamenti.csv": "Aggiornamento",
  "Chat.csv": "ChatMessage",
  "Promemoria.csv": "Promemoria",
  "Disponibilità.csv": "Disponibilita",
  "Giorni bloccati.csv": "GiornoBloccato",
  "Impostazioni.csv": "ImpostazioneApp",
  "Modelli email.csv": "ModelloEmail",
};

const TYPE_ICONS = {
  csv: FileText, pdf: FileIcon, foto: Image, video: Video,
  contratto: FileIcon, planimetria: FileIcon, permesso: FileIcon,
  sicurezza: FileIcon, fattura: FileIcon, preventivo: FileIcon, altro: FileIcon,
};

export default function RipristinoBackup() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState({ step: "", current: 0, total: 0 });
  const [downloadingAll, setDownloadingAll] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.BackupRecord.list("-data", 20);
      setRecords(list);
    } catch { /* ignora */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDownload = async (file) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(file.url, "_blank");
    }
  };

  const handleDownloadAll = async (backup) => {
    const files = JSON.parse(backup.files_json || "[]");
    setDownloadingAll(backup.id);
    try {
      for (let i = 0; i < files.length; i++) {
        await handleDownload(files[i]);
        if (i < files.length - 1) await new Promise((r) => setTimeout(r, 400));
      }
      toast({ title: "Download completato", description: `${files.length} file scaricati` });
    } catch (err) {
      toast({ title: "Errore download", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingAll(null);
    }
  };

  const handleRestoreClick = (backup, replace) => {
    setRestoreTarget(backup);
    setReplaceMode(replace);
  };

  const executeRestore = async () => {
    const backup = restoreTarget;
    setRestoreTarget(null);
    setRestoring(true);
    try {
      const files = JSON.parse(backup.files_json || "[]");
      const csvFiles = files.filter((f) => f.type === "csv");
      let restored = 0;
      const errors = [];
      const schemaCache = {};

      for (let i = 0; i < csvFiles.length; i++) {
        const file = csvFiles[i];
        const entityName = file.entity || FILE_TO_ENTITY[file.name];
        if (!entityName) { errors.push(`${file.name}: entità non riconosciuta`); continue; }

        setRestoreProgress({ step: `Ripristino ${file.name}`, current: i + 1, total: csvFiles.length });

        try {
          // Fetch schema for type normalization
          if (!schemaCache[entityName]) {
            schemaCache[entityName] = await base44.entities[entityName].schema();
          }
          const schema = schemaCache[entityName];
          const numFields = Object.entries(schema.properties || {}).filter(([, v]) => v.type === "number").map(([k]) => k);
          const boolFields = Object.entries(schema.properties || {}).filter(([, v]) => v.type === "boolean").map(([k]) => k);

          const response = await fetch(file.url);
          const text = await response.text();
          const csvRecords = parseCSV(text);

          const normalized = csvRecords.map((r) => {
            const obj = {};
            for (const [key, val] of Object.entries(r)) {
              if (["id", "created_date", "updated_date", "created_by_id"].includes(key)) continue;
              if (val === undefined || val === "") continue;
              if (boolFields.includes(key)) obj[key] = val === "true" || val === true;
              else if (numFields.includes(key) && !isNaN(Number(val))) obj[key] = Number(val);
              else obj[key] = val;
            }
            return obj;
          }).filter((r) => Object.keys(r).length > 0);

          if (replaceMode) {
            await base44.entities[entityName].deleteMany({});
          }

          if (normalized.length > 0) {
            await base44.entities[entityName].bulkCreate(normalized);
            restored += normalized.length;
          }
        } catch (e) {
          errors.push(`${file.name}: ${e.message}`);
        }
      }

      toast({
        title: "Ripristino completato",
        description: `${restored} record ripristinati${errors.length > 0 ? `, ${errors.length} errori` : ""}`,
        variant: errors.length > 0 ? "destructive" : "default",
      });
      if (errors.length > 0) console.warn("Errori ripristino:", errors);
    } catch (err) {
      toast({ title: "Errore ripristino", description: err.message, variant: "destructive" });
    } finally {
      setRestoring(false);
      setRestoreProgress({ step: "", current: 0, total: 0 });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-start gap-3">
        <ArchiveRestore className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold">Ripristino e download</h3>
          <p className="text-xs text-muted-foreground">
            Storico dei backup generati. Scarica i singoli file, tutti insieme, o ripristina i dati nel gestionale.
          </p>
        </div>
      </div>

      {restoring && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded p-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {restoreProgress.step} ({restoreProgress.current}/{restoreProgress.total})
          </div>
          {restoreProgress.total > 0 && (
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(restoreProgress.current / restoreProgress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && records.length === 0 && (
        <p className="text-xs text-muted-foreground italic text-center py-4">
          Nessun backup disponibile. Genera prima un backup interno.
        </p>
      )}

      <div className="space-y-2">
        {records.map((rec) => {
          let files = [];
          try { files = JSON.parse(rec.files_json || "[]"); } catch { /* ignora */ }
          const csvCount = files.filter((f) => f.type === "csv").length;
          const docCount = files.length - csvCount;
          const isOpen = expanded === rec.id;
          const Icon = rec.tipo === "esterno" ? Cloud : Database;
          return (
            <div key={rec.id} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : rec.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left"
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${rec.tipo === "esterno" ? "text-cyan-400" : "text-primary"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">
                    {new Date(rec.data).toLocaleString("it-IT")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {rec.tipo === "esterno" ? "Backup esterno" : "Backup interno"}
                    {rec.provider && ` — ${rec.provider}`}
                    {" — "}{csvCount} CSV + {docCount} documenti
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  rec.status === "completato" ? "bg-green-500/20 text-green-400" :
                  rec.status === "errore" ? "bg-red-500/20 text-red-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {rec.status}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border">
                  {/* Azioni */}
                  <div className="flex flex-wrap gap-2 p-3 bg-secondary/20 border-b border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadAll(rec)}
                      disabled={downloadingAll === rec.id || files.length === 0}
                    >
                      {downloadingAll === rec.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Package className="w-4 h-4 mr-1" />}
                      {downloadingAll === rec.id ? "Download..." : "Scarica tutti"}
                    </Button>
                    {rec.tipo === "interno" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreClick(rec, false)}
                          disabled={restoring || csvCount === 0}
                        >
                          <ArchiveRestore className="w-4 h-4 mr-1" /> Ripristina (aggiungi)
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRestoreClick(rec, true)}
                          disabled={restoring || csvCount === 0}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" /> Ripristina (sostituisci)
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Lista file */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {files.map((file, i) => {
                      const FIcon = TYPE_ICONS[file.type] || FileIcon;
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/20 text-xs border-b border-border/50">
                          <FIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 truncate">{file.name}</span>
                          {file.category && <span className="text-[10px] text-muted-foreground">{file.category}</span>}
                          <button onClick={() => handleDownload(file)} className="text-primary hover:text-primary/80" title="Scarica">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {rec.error_message && (
                    <div className="p-2 text-xs text-red-400 bg-red-500/5 border-t border-border">
                      {rec.error_message}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {records.length > 0 && (
        <Button onClick={load} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-1" /> Aggiorna storico
        </Button>
      )}

      {/* Dialog conferma ripristino */}
      <AlertDialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma ripristino dati</AlertDialogTitle>
            <AlertDialogDescription>
              {replaceMode
                ? "ATTENZIONE: verranno eliminati TUTTI i record esistenti delle entità e sostituiti con quelli del backup. Questa operazione non è reversibile."
                : "Verranno creati nuovi record dai file CSV del backup. I record esistenti non verranno eliminati (possono verificarsi duplicati)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRestore}
              className={replaceMode ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {replaceMode ? "Sostituisci tutti i dati" : "Aggiungi record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}