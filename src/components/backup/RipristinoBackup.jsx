import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RotateCcw, Loader2, Download, FileText, File as FileIcon, Image, Video, Cloud, Database } from "lucide-react";

const TYPE_ICONS = {
  csv: FileText,
  pdf: FileIcon,
  foto: Image,
  video: Video,
  contratto: FileIcon,
  planimetria: FileIcon,
  permesso: FileIcon,
  sicurezza: FileIcon,
  fattura: FileIcon,
  preventivo: FileIcon,
  altro: FileIcon,
};

export default function RipristinoBackup() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.BackupRecord.list("-data", 20);
      setRecords(list);
    } catch { /* ignora */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDownload = (file) => {
    window.open(file.url, "_blank");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-start gap-3">
        <RotateCcw className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold">Ripristino e download</h3>
          <p className="text-xs text-muted-foreground">
            Storico dei backup generati. Scarica i singoli file o l'intero set per ripristinare i dati.
          </p>
        </div>
      </div>

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
                    {rec.cloud_folder && ` — ${rec.cloud_folder}`}
                    {" — "}
                    {rec.file_count || files.length} file
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
              {isOpen && files.length > 0 && (
                <div className="border-t border-border max-h-[300px] overflow-y-auto">
                  {files.map((file, i) => {
                    const FIcon = TYPE_ICONS[file.type] || FileIcon;
                    return (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/20 text-xs border-b border-border/50">
                        <FIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate">{file.name}</span>
                        {file.category && <span className="text-[10px] text-muted-foreground">{file.category}</span>}
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-primary hover:text-primary/80"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {isOpen && rec.error_message && (
                <div className="border-t border-border p-2 text-xs text-red-400 bg-red-500/5">
                  {rec.error_message}
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
    </div>
  );
}