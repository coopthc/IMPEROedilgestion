import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { generateCSVBlobFromRecords, exportDiagrammaPDF } from "@/lib/exportUtils";
import { Database, Loader2, CheckCircle2, FileText, File as FileIcon, Image, Video, Info } from "lucide-react";

const ENTITIES = [
  { name: "Cliente", label: "Clienti", category: "anagrafiche" },
  { name: "Collaboratore", label: "Collaboratori", category: "anagrafiche" },
  { name: "Cantiere", label: "Cantieri", category: "cantieri" },
  { name: "Lavorazione", label: "Lavorazioni", category: "cantieri" },
  { name: "Pagamento", label: "Pagamenti", category: "cantieri" },
  { name: "Presenza", label: "Presenze", category: "presenze" },
  { name: "Appuntamento", label: "Appuntamenti", category: "agenda" },
  { name: "Documento", label: "Documenti", category: "documenti" },
  { name: "Aggiornamento", label: "Aggiornamenti", category: "cantieri" },
  { name: "ChatMessage", label: "Chat", category: "cantieri" },
  { name: "Promemoria", label: "Promemoria", category: "agenda" },
  { name: "Disponibilita", label: "Disponibilità", category: "agenda" },
  { name: "GiornoBloccato", label: "Giorni bloccati", category: "agenda" },
  { name: "ImpostazioneApp", label: "Impostazioni", category: "sistema" },
  { name: "ModelloEmail", label: "Modelli email", category: "sistema" },
];

export default function BackupInterno() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ step: "", current: 0, total: 0 });
  const [lastBackup, setLastBackup] = useState(null);

  const loadLast = async () => {
    try {
      const list = await base44.entities.BackupRecord.filter({ tipo: "interno", status: "completato" }, "-data", 1);
      if (list.length > 0) setLastBackup(list[0]);
    } catch { /* ignora */ }
  };

  useEffect(() => { loadLast(); }, []);

  const runBackup = async () => {
    setRunning(true);
    setProgress({ step: "Inizializzazione...", current: 0, total: 0 });
    const files = [];
    const dateStr = new Date().toISOString().split("T")[0];
    try {
      // 1. CSV per entità
      for (let i = 0; i < ENTITIES.length; i++) {
        const ent = ENTITIES[i];
        setProgress({ step: `Esporto ${ent.label}...`, current: i + 1, total: ENTITIES.length + 2 });
        const records = await base44.entities[ent.name].list();
        if (records.length > 0) {
          const blob = generateCSVBlobFromRecords(records);
          const file = new File([blob], `${ent.category}_${ent.label.toLowerCase()}.csv`, { type: "text/csv;charset=utf-8" });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          files.push({ name: `${ent.label}.csv`, url: file_url, type: "csv", category: ent.category, entity: ent.name, count: records.length });
        }
      }

      // 2. Diagrammi PDF per cantiere
      setProgress({ step: "Genero diagrammi cantieri...", current: ENTITIES.length + 1, total: ENTITIES.length + 2 });
      const [cantieri, clienti, collaboratori, documenti] = await Promise.all([
        base44.entities.Cantiere.list(),
        base44.entities.Cliente.list(),
        base44.entities.Collaboratore.list(),
        base44.entities.Documento.list(),
      ]);
      for (const c of cantieri) {
        const cliente = clienti.find((cl) => cl.id === c.cliente_id);
        const responsabile = collaboratori.find((co) => co.id === c.responsabile_id);
        const collabIds = (c.collaboratori_ids || "").split(",").filter(Boolean);
        const collabs = collaboratori.filter((co) => collabIds.includes(co.id));
        const docs = documenti.filter((d) => d.cantiere_id === c.id);
        const blob = exportDiagrammaPDF({ cantiere: c, cliente, responsabile, collaboratori: collabs, documenti: docs, silent: true });
        const safeName = (c.nome || "cantiere").replace(/[^a-zA-Z0-9]/g, "_");
        const file = new File([blob], `diagramma_${safeName}.pdf`, { type: "application/pdf" });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        files.push({ name: `Diagramma_${c.nome || safeName}.pdf`, url: file_url, type: "pdf", category: "diagrammi" });
      }

      // 3. Documenti fisici (foto, video, PDF, ecc.)
      setProgress({ step: "Collego documenti fisici...", current: ENTITIES.length + 2, total: ENTITIES.length + 2 });
      for (const d of documenti) {
        if (d.file_url) {
          files.push({ name: d.nome || "documento", url: d.file_url, type: d.categoria || "altro", category: "documenti", cantiere: d.cantiere_nome });
        }
      }

      // 4. Salva BackupRecord
      setProgress({ step: "Salvo record backup...", current: ENTITIES.length + 2, total: ENTITIES.length + 2 });
      const record = await base44.entities.BackupRecord.create({
        tipo: "interno",
        data: new Date().toISOString(),
        files_json: JSON.stringify(files),
        file_count: files.length,
        status: "completato",
      });
      setLastBackup(record);
      toast({ title: "Backup interno completato", description: `${files.length} file salvati. Vai a "Ripristino e download" per scaricarli.` });
    } catch (err) {
      toast({ title: "Errore backup", description: err.message, variant: "destructive" });
      await base44.entities.BackupRecord.create({
        tipo: "interno",
        data: new Date().toISOString(),
        status: "errore",
        error_message: err.message,
      }).catch(() => {});
    } finally {
      setRunning(false);
      setProgress({ step: "", current: 0, total: 0 });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Database className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold">Backup interno</h3>
          <p className="text-xs text-muted-foreground">
            Genera tutti i file (CSV per entità, PDF diagrammi per cantiere, foto e video dei documenti)
            e li salva nello storage dell'app. Da qui puoi poi sincronizzarli sul cloud o scaricarli.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="flex items-center gap-1.5 text-xs bg-secondary/30 rounded p-2">
          <FileText className="w-4 h-4 text-green-400" /> CSV per entità
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-secondary/30 rounded p-2">
          <FileIcon className="w-4 h-4 text-red-400" /> PDF diagrammi
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-secondary/30 rounded p-2">
          <Image className="w-4 h-4 text-blue-400" /> Foto
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-secondary/30 rounded p-2">
          <Video className="w-4 h-4 text-purple-400" /> Video
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground bg-primary/5 border border-primary/20 rounded p-2 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary" />
        <span>I file vengono salvati nello storage dell'app. Vai alla sezione <strong>"Ripristino e download"</strong> in fondo alla pagina per scaricarli, sincronizzarli sul cloud o ripristinarli.</span>
      </div>

      {running && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {progress.step}
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {lastBackup && !running && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded p-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Ultimo backup: {new Date(lastBackup.data).toLocaleString("it-IT")} — {lastBackup.file_count} file
        </div>
      )}

      <Button onClick={runBackup} disabled={running} size="sm">
        {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Database className="w-4 h-4 mr-1" />}
        {running ? "Backup in corso..." : "Genera backup interno"}
      </Button>
    </div>
  );
}