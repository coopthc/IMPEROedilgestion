import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  FileText,
  Image as ImageIcon,
  File,
  Camera,
  Video,
} from "lucide-react";

const CATEGORIE = [
  { value: "foto", label: "Foto" },
  { value: "video", label: "Video" },
  { value: "contratto", label: "Contratto" },
  { value: "planimetria", label: "Planimetria" },
  { value: "permesso", label: "Permesso" },
  { value: "sicurezza", label: "Sicurezza" },
  { value: "altro", label: "Altro" },
];

export default function CantiereDocumenti({ cantiere }) {
  const { toast } = useToast();
  const [documenti, setDocumenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filtroCat, setFiltroCat] = useState("tutti");
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Documento.filter({
        cantiere_id: cantiere.id,
      });
      setDocumenti(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cantiere.id]);

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const categoria = isImage ? "foto" : isVideo ? "video" : "altro";
      await base44.entities.Documento.create({
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome,
        nome: file.name,
        file_url,
        tipo_file: file.type,
        categoria,
        visibile_cliente: false,
      });
      load();
      toast({ title: "File caricato" });
    } catch (err) {
      toast({
        title: "Errore upload",
        description: "Impossibile caricare il file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (photoRef.current) photoRef.current.value = "";
      if (videoRef.current) videoRef.current.value = "";
    }
  };

  const handleUpload = (e) => uploadFile(e.target.files?.[0]);

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

  const handleDelete = async (doc) => {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return;
    await base44.entities.Documento.delete(doc.id);
    setDocumenti((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const filtered =
    filtroCat === "tutti"
      ? documenti
      : documenti.filter((d) => d.categoria === filtroCat);

  const foto = filtered.filter((d) => d.categoria === "foto");
  const video = filtered.filter((d) => d.categoria === "video");
  const altriDoc = filtered.filter(
    (d) => d.categoria !== "foto" && d.categoria !== "video"
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload + filtri */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFiltroCat("tutti")}
            className={`px-2.5 py-1 rounded-md text-xs ${
              filtroCat === "tutti"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            Tutti
          </button>
          {CATEGORIE.map((c) => (
            <button
              key={c.value}
              onClick={() => setFiltroCat(c.value)}
              className={`px-2.5 py-1 rounded-md text-xs ${
                filtroCat === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            ref={fileRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
          />
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleUpload}
            className="hidden"
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => photoRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-1" />
            )}
            Foto
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => videoRef.current?.click()}
            disabled={uploading}
          >
            <Video className="w-4 h-4 mr-1" />
            Video
          </Button>
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            Carica file
          </Button>
        </div>
      </div>

      {/* Foto grid */}
      {foto.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Foto
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {foto.map((d) => (
              <div
                key={d.id}
                className="relative group bg-card border border-border rounded-lg overflow-hidden"
              >
                <img
                  src={d.file_url}
                  alt={d.nome}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{d.nome}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <button
                      onClick={() => toggleVisibile(d)}
                      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        d.visibile_cliente
                          ? "bg-green-500/15 text-green-500"
                          : "bg-secondary text-muted-foreground"
                      }`}
                      title={
                        d.visibile_cliente
                          ? "Visibile al cliente"
                          : "Nascosto al cliente"
                      }
                    >
                      {d.visibile_cliente ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                      {d.visibile_cliente ? "Visibile" : "Nascosto"}
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="p-1 rounded hover:bg-destructive/15 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video grid */}
      {video.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Video
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {video.map((d) => (
              <div
                key={d.id}
                className="relative group bg-card border border-border rounded-lg overflow-hidden"
              >
                <video
                  src={d.file_url}
                  controls
                  className="w-full h-40 object-cover bg-black"
                />
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{d.nome}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <button
                      onClick={() => toggleVisibile(d)}
                      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        d.visibile_cliente
                          ? "bg-green-500/15 text-green-500"
                          : "bg-secondary text-muted-foreground"
                      }`}
                      title={
                        d.visibile_cliente
                          ? "Visibile al cliente"
                          : "Nascosto al cliente"
                      }
                    >
                      {d.visibile_cliente ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                      {d.visibile_cliente ? "Visibile" : "Nascosto"}
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="p-1 rounded hover:bg-destructive/15 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documenti tabella */}
      {altriDoc.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Documenti
          </h3>
          <div className="space-y-2">
            {altriDoc.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
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
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {d.categoria}
                  </span>
                </div>
                <button
                  onClick={() => toggleVisibile(d)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors flex-shrink-0 ${
                    d.visibile_cliente
                      ? "bg-green-500/15 text-green-500"
                      : "bg-secondary text-muted-foreground"
                  }`}
                  title={
                    d.visibile_cliente
                      ? "Visibile al cliente"
                      : "Nascosto al cliente"
                  }
                >
                  {d.visibile_cliente ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                  {d.visibile_cliente ? "Visibile" : "Nascosto"}
                </button>
                <button
                  onClick={() => handleDelete(d)}
                  className="p-1.5 rounded hover:bg-destructive/15 text-destructive flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nessun documento. Carica il primo file.
        </p>
      )}
    </div>
  );
}