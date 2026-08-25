import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Camera, Video, Loader2 } from "lucide-react";

const CATEGORIE = [
  { value: "foto", label: "Foto" },
  { value: "video", label: "Video" },
  { value: "contratto", label: "Contratto" },
  { value: "planimetria", label: "Planimetria" },
  { value: "permesso", label: "Permesso" },
  { value: "sicurezza", label: "Sicurezza" },
  { value: "altro", label: "Altro" },
];

export default function DocumentoForm({ open, onClose, cantiere, documento, onSaved }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    categoria: "altro",
    descrizione: "",
    visibile_cliente: false,
  });
  const [saving, setSaving] = useState(false);

  const isEdit = !!documento;

  useEffect(() => {
    if (documento) {
      setFile(null);
      setForm({
        nome: documento.nome || "",
        categoria: documento.categoria || "altro",
        descrizione: documento.note || "",
        visibile_cliente: documento.visibile_cliente || false,
      });
    } else {
      setFile(null);
      setForm({ nome: "", categoria: "altro", descrizione: "", visibile_cliente: false });
    }
  }, [documento, open]);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    setForm((prev) => ({
      ...prev,
      nome: prev.nome || f.name,
      categoria: isImage ? "foto" : isVideo ? "video" : prev.categoria,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await base44.entities.Documento.update(documento.id, {
          nome: form.nome,
          categoria: form.categoria,
          note: form.descrizione,
          visibile_cliente: form.visibile_cliente,
        });
      } else {
        if (!file) {
          toast({
            title: "Nessun file",
            description: "Seleziona un file da caricare",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.Documento.create({
          cantiere_id: cantiere.id,
          cantiere_nome: cantiere.nome,
          nome: form.nome || file.name,
          file_url,
          tipo_file: file.type,
          categoria: form.categoria,
          note: form.descrizione,
          visibile_cliente: form.visibile_cliente,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast({
        title: "Errore",
        description: isEdit ? "Modifica non riuscita" : "Caricamento non riuscito",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica documento" : "Nuovo documento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div>
              <Label className="text-sm mb-2">File</Label>
              <input ref={fileRef} type="file" onChange={(e) => pickFile(e.target.files?.[0])} className="hidden" />
              <input ref={photoRef} type="file" accept="image/*" capture="environment" onChange={(e) => pickFile(e.target.files?.[0])} className="hidden" />
              <input ref={videoRef} type="file" accept="video/*" capture="environment" onChange={(e) => pickFile(e.target.files?.[0])} className="hidden" />
              <div className="flex gap-1.5 flex-wrap">
                <Button size="sm" variant="outline" type="button" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" /> Da file
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => photoRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" /> Foto
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => videoRef.current?.click()}>
                  <Video className="w-4 h-4 mr-1" /> Video
                </Button>
              </div>
              {file && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  Selezionato: {file.name}
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="text-sm mb-1.5">Nome</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Nome documento"
            />
          </div>

          <div>
            <Label className="text-sm mb-1.5">Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIE.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm mb-1.5">Descrizione</Label>
            <Textarea
              value={form.descrizione}
              onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              placeholder="Descrizione (opzionale)"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Visibile al cliente</div>
              <div className="text-[11px] text-muted-foreground">
                Il cliente potrà vedere questo documento
              </div>
            </div>
            <Switch
              checked={form.visibile_cliente}
              onCheckedChange={(v) => setForm((f) => ({ ...f, visibile_cliente: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {isEdit ? "Salva" : "Carica"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}