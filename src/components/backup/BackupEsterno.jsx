import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Cloud, Loader2, CheckCircle2, AlertCircle, Upload } from "lucide-react";

export default function BackupEsterno() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState(null);
  const [lastInternal, setLastInternal] = useState(null);
  const [lastExternal, setLastExternal] = useState(null);
  const [result, setResult] = useState(null);

  const load = async () => {
    try {
      const configs = await base44.entities.CloudBackupConfig.list();
      if (configs.length > 0) setConfig(configs[0]);
      const internal = await base44.entities.BackupRecord.filter({ tipo: "interno", status: "completato" }, "-data", 1);
      if (internal.length > 0) setLastInternal(internal[0]);
      const external = await base44.entities.BackupRecord.filter({ tipo: "esterno" }, "-data", 1);
      if (external.length > 0) setLastExternal(external[0]);
    } catch { /* ignora */ }
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("backupSuCloud", {});
      setResult(res.data);
      if (res.data.errors && res.data.errors.length > 0) {
        toast({ title: "Backup cloud completato con errori", description: `${res.data.uploaded}/${res.data.total} file caricati`, variant: "destructive" });
      } else {
        toast({ title: "Backup cloud completato", description: `${res.data.uploaded} file caricati sul cloud` });
      }
      load();
    } catch (err) {
      toast({ title: "Errore backup cloud", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const providerLabel = { google_drive: "Google Drive", onedrive: "OneDrive", dropbox: "Dropbox", amazon_s3: "Amazon S3" };
  const ready = config && config.credentials_json && config.credentials_json !== "{}" && lastInternal;

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Cloud className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold">Backup esterno (cloud)</h3>
          <p className="text-xs text-muted-foreground">
            Sincronizza i file dell'ultimo backup interno sul provider cloud configurato,
            organizzati in sottocartelle per categoria.
          </p>
        </div>
      </div>

      {/* Stato configurazione */}
      <div className="space-y-1 text-xs">
        {!config && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            Configura un provider cloud nella sezione sopra
          </div>
        )}
        {config && (!config.credentials_json || config.credentials_json === "{}") && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            Inserisci le credenziali {providerLabel[config.provider]} e salva
          </div>
        )}
        {config && config.credentials_json && config.credentials_json !== "{}" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Provider: {providerLabel[config.provider]} — Cartella: {config.folder_path || "EdilGestion/Backup"}
          </div>
        )}
        {!lastInternal && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            Genera prima un backup interno
          </div>
        )}
        {lastInternal && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Backup interno disponibile: {lastInternal.file_count} file ({new Date(lastInternal.data).toLocaleString("it-IT")})
          </div>
        )}
      </div>

      {/* Risultato */}
      {result && (
        <div className={`text-xs rounded p-2 ${result.errors?.length > 0 ? "bg-orange-500/10 text-orange-300" : "bg-green-500/10 text-green-300"}`}>
          <strong>{result.uploaded}/{result.total}</strong> file caricati su {providerLabel[config.provider]}
          {result.errors?.length > 0 && (
            <ul className="mt-1 ml-4 list-disc text-orange-300/80">
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Ultimo backup esterno */}
      {lastExternal && !running && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded p-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Ultimo sync cloud: {new Date(lastExternal.data).toLocaleString("it-IT")} — {lastExternal.file_count} file
          {lastExternal.error_message && <span className="text-orange-400"> — {lastExternal.error_message}</span>}
        </div>
      )}

      <Button onClick={handleSync} disabled={running || !ready} size="sm">
        {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
        {running ? "Sincronizzazione..." : "Sincronizza sul cloud"}
      </Button>
    </div>
  );
}