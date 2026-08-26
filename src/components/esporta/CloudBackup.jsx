import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Save, Loader2, CheckCircle2, Cloud, FolderTree } from "lucide-react";

const PROVIDERS = {
  google_drive: {
    label: "Google Drive",
    color: "text-blue-400",
    fields: [
      { key: "service_account_json", label: "Service Account JSON", type: "textarea", placeholder: "Incolla qui il JSON della service account di Google Cloud…" },
    ],
  },
  onedrive: {
    label: "OneDrive",
    color: "text-cyan-400",
    fields: [
      { key: "client_id", label: "Client ID (Azure AD)", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
      { key: "tenant_id", label: "Tenant ID", type: "text" },
      { key: "user_email", label: "Email account OneDrive", type: "text" },
    ],
  },
  dropbox: {
    label: "Dropbox",
    color: "text-sky-400",
    fields: [
      { key: "access_token", label: "Access Token", type: "password" },
    ],
  },
  amazon_s3: {
    label: "Amazon S3",
    color: "text-orange-400",
    fields: [
      { key: "access_key_id", label: "Access Key ID", type: "text" },
      { key: "secret_access_key", label: "Secret Access Key", type: "password" },
      { key: "bucket", label: "Bucket name", type: "text" },
      { key: "region", label: "Regione", type: "text", placeholder: "es. eu-west-1" },
    ],
  },
};

export default function CloudBackup() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.CloudBackupConfig.list();
        if (list.length > 0) {
          setConfig(list[0]);
          try {
            setCreds(JSON.parse(list[0].credentials_json || "{}"));
          } catch {
            setCreds({});
          }
        } else {
          setConfig({
            provider: "google_drive",
            folder_path: "EdilGestion/Backup",
            frequency: "manuale",
            enabled: false,
          });
        }
      } catch {
        setConfig({
          provider: "google_drive",
          folder_path: "EdilGestion/Backup",
          frequency: "manuale",
          enabled: false,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (patch) => setConfig((c) => ({ ...c, ...patch }));
  const updateCred = (key, val) => setCreds((c) => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...config,
        credentials_json: JSON.stringify(creds),
      };
      if (config.id) {
        await base44.entities.CloudBackupConfig.update(config.id, payload);
      } else {
        const created = await base44.entities.CloudBackupConfig.create(payload);
        setConfig(created);
      }
      toast({ title: "Configurazione cloud salvata" });
    } catch (err) {
      toast({ title: "Errore salvataggio", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const providerConfig = PROVIDERS[config.provider];

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <p className="text-xs text-muted-foreground">
        Inserisci le credenziali del tuo provider cloud per salvare automaticamente i backup
        in una cartella scelta, suddivisa per sottocartelle.
      </p>

      {/* Provider selection */}
      <div className="space-y-2">
        <Label className="text-xs">Provider cloud</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(PROVIDERS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => {
                update({ provider: key });
                setCreds({});
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors ${
                config.provider === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 hover:bg-secondary"
              }`}
            >
              <Cloud className={`w-5 h-5 ${config.provider === key ? "text-primary" : p.color}`} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Credentials */}
      <div className="space-y-3">
        <Label className="text-xs">Credenziali {providerConfig.label}</Label>
        {providerConfig.fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
            {f.type === "textarea" ? (
              <textarea
                value={creds[f.key] || ""}
                onChange={(e) => updateCred(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono min-h-[100px] focus-visible:ring-1 focus-visible:ring-ring"
              />
            ) : (
              <Input
                type={f.type}
                value={creds[f.key] || ""}
                onChange={(e) => updateCred(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="text-xs"
              />
            )}
          </div>
        ))}
      </div>

      {/* Folder path */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <FolderTree className="w-3.5 h-3.5" /> Cartella di destinazione
        </Label>
        <Input
          value={config.folder_path || ""}
          onChange={(e) => update({ folder_path: e.target.value })}
          placeholder="es. EdilGestion/Backup"
          className="text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          I backup saranno suddivisi in sottocartelle (anagrafiche, cantieri, documenti, ecc.)
        </p>
      </div>

      {/* Frequency + enabled */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Frequenza backup automatico</Label>
          <select
            value={config.frequency}
            onChange={(e) => update({ frequency: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="manuale" className="bg-card">Manuale</option>
            <option value="giornaliero" className="bg-card">Ogni giorno</option>
            <option value="settimanale" className="bg-card">Ogni settimana</option>
            <option value="mensile" className="bg-card">Ogni mese</option>
          </select>
        </div>
        <div className="flex items-end pb-1">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => update({ enabled: v })}
            />
            <Label className="text-xs">Backup automatico attivo</Label>
          </div>
        </div>
      </div>

      {/* Last backup */}
      {config.last_backup_date && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded p-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Ultimo backup: {new Date(config.last_backup_date).toLocaleString("it-IT")}
          {config.last_backup_status && ` — ${config.last_backup_status}`}
        </div>
      )}

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
        Salva configurazione
      </Button>
    </div>
  );
}