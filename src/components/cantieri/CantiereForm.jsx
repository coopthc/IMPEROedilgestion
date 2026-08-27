import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, ImagePlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image as UIImage } from "@/components/ui/image";

const STATI = [
  { value: "bozza", label: "Bozza" },
  { value: "attivo", label: "Attivo" },
  { value: "sospeso", label: "Sospeso" },
  { value: "completato", label: "Completato" },
  { value: "chiuso", label: "Chiuso" },
];

const emptyForm = {
  nome: "",
  cliente_id: "",
  cliente_nome: "",
  indirizzo: "",
  citta: "",
  stato: "attivo",
  data_inizio: "",
  data_fine: "",
  budget: "",
  descrizione: "",
  foto_url: "",
  note_interne: "",
};

export default function CantiereForm({ open, onOpenChange, cantiere, clienti, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cantiere) {
      setForm({
        nome: cantiere.nome || "",
        cliente_id: cantiere.cliente_id || "",
        cliente_nome: cantiere.cliente_nome || "",
        indirizzo: cantiere.indirizzo || "",
        citta: cantiere.citta || "",
        stato: cantiere.stato || "attivo",
        data_inizio: cantiere.data_inizio || "",
        data_fine: cantiere.data_fine || "",
        budget: cantiere.budget ?? "",
        descrizione: cantiere.descrizione || "",
        foto_url: cantiere.foto_url || "",
        note_interne: cantiere.note_interne || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [cantiere, open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update("foto_url", file_url);
    } catch (err) {
      console.error("Errore upload foto:", err);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => update("foto_url", "");

  const handleClienteChange = (clienteId) => {
    const cliente = clienti.find((c) => c.id === clienteId);
    update("cliente_id", clienteId);
    update("cliente_nome", cliente ? cliente.nome : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        budget: form.budget === "" ? null : Number(form.budget),
        data_inizio: form.data_inizio || null,
        data_fine: form.data_fine || null,
      };
      let cantiereId = cantiere?.id;
      if (cantiere) {
        await base44.entities.Cantiere.update(cantiere.id, payload);
      } else {
        const nuovo = await base44.entities.Cantiere.create(payload);
        cantiereId = nuovo.id;
      }
      if (cantiereId) {
        try {
          await base44.functions.invoke("sincronizzaCantieriUtente", {
            cantiere_id: cantiereId,
          });
        } catch (e) {
          console.error("Sync cantieri fallita:", e);
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio cantiere:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cantiere ? "Modifica cantiere" : "Nuovo cantiere"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome cantiere *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="es. Ristrutturazione Villa Rossi"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Select
              value={form.cliente_id || "nessuno"}
              onValueChange={(v) => (v === "nessuno" ? handleClienteChange("") : handleClienteChange(v))}
            >
              <SelectTrigger id="cliente">
                <SelectValue placeholder="Seleziona cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nessuno">— Nessun cliente —</SelectItem>
                {clienti.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="indirizzo">Indirizzo</Label>
              <Input
                id="indirizzo"
                value={form.indirizzo}
                onChange={(e) => update("indirizzo", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="citta">Città</Label>
              <Input
                id="citta"
                value={form.citta}
                onChange={(e) => update("citta", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stato">Stato</Label>
              <Select value={form.stato} onValueChange={(v) => update("stato", v)}>
                <SelectTrigger id="stato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (€)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="100"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data_inizio">Data inizio</Label>
              <Input
                id="data_inizio"
                type="date"
                value={form.data_inizio}
                onChange={(e) => update("data_inizio", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_fine">Data fine</Label>
              <Input
                id="data_fine"
                type="date"
                value={form.data_fine}
                onChange={(e) => update("data_fine", e.target.value)}
              />
            </div>
          </div>

          {/* Foto cantiere */}
          <div className="space-y-1.5">
            <Label>Foto cantiere</Label>
            {form.foto_url ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-secondary">
                <UIImage
                  src={form.foto_url}
                  alt="Anteprima cantiere"
                  className="w-full h-full"
                  fittingType="cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-background/80 hover:bg-background flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-secondary/30">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Carica una foto
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              rows={3}
              value={form.descrizione}
              onChange={(e) => update("descrizione", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note_interne" className="flex items-center gap-1.5">
              Note interne
              <span className="text-[10px] text-muted-foreground font-normal">
                (mai visibili al cliente)
              </span>
            </Label>
            <Textarea
              id="note_interne"
              rows={2}
              value={form.note_interne}
              onChange={(e) => update("note_interne", e.target.value)}
              placeholder="Appunti privati del titolare..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {cantiere ? "Salva" : "Crea cantiere"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}