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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, HardHat, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { creaNotifiche } from "@/lib/notifiche";

const TIPI = [
  { value: "interno", label: "Interno" },
  { value: "richiesta", label: "Richiesta (da confermare)" },
  { value: "confermato", label: "Confermato" },
  { value: "admin_fissato", label: "Fissato da admin" },
];

const STATI = [
  { value: "in_attesa", label: "In attesa di conferma" },
  { value: "programmato", label: "Programmato" },
  { value: "proposto", label: "Proposto (nuovo orario)" },
  { value: "completato", label: "Completato" },
  { value: "annullato", label: "Annullato" },
];

const emptyForm = {
  titolo: "",
  data: "",
  ora: "",
  durata_minuti: 60,
  tipo: "interno",
  cliente_id: "",
  cantiere_id: "",
  note: "",
  stato: "programmato",
};

export default function AppuntamentoForm({
  open,
  onOpenChange,
  appuntamento,
  defaultData,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [squadra, setSquadra] = useState([]);
  const [partecipantiIds, setPartecipantiIds] = useState([]);
  const [creaCantiereBozza, setCreaCantiereBozza] = useState(false);

  useEffect(() => {
    if (appuntamento) {
      setForm({
        titolo: appuntamento.titolo || "",
        data: appuntamento.data || "",
        ora: appuntamento.ora || "",
        durata_minuti: appuntamento.durata_minuti ?? 60,
        tipo: appuntamento.tipo || "interno",
        cliente_id: appuntamento.cliente_id || "",
        cantiere_id: appuntamento.cantiere_id || "",
        note: appuntamento.note || "",
        stato: appuntamento.stato || "programmato",
      });
      setPartecipantiIds(
        (appuntamento.partecipanti_ids || "").split(",").filter(Boolean)
      );
    } else {
      setForm({ ...emptyForm, data: defaultData || "" });
      setPartecipantiIds([]);
      setCreaCantiereBozza(false);
    }
  }, [appuntamento, open, defaultData]);

  useEffect(() => {
    if (open) {
      base44.entities.Cliente.list().then(setClienti).catch(() => {});
      base44.entities.Cantiere
        .filter({ archiviato: false })
        .then(setCantieri)
        .catch(() => {});
    }
  }, [open]);

  // Quando cambia il cantiere, carica la squadra
  useEffect(() => {
    if (!form.cantiere_id) {
      setSquadra([]);
      return;
    }
    base44.entities.Cantiere.get(form.cantiere_id).then((c) => {
      const ids = (c.collaboratori_ids || "").split(",").filter(Boolean);
      if (ids.length === 0) {
        setSquadra([]);
        return;
      }
      base44.entities.Collaboratore.list().then((all) => {
        setSquadra(all.filter((coll) => ids.includes(coll.id)));
      });
    });
  }, [form.cantiere_id]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const togglePartecipante = (id) => {
    setPartecipantiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titolo.trim() || !form.data || !form.ora) return;
    setLoading(true);

    const cliente = clienti.find((c) => c.id === form.cliente_id);
    const cantiere = cantieri.find((c) => c.id === form.cantiere_id);

    // Costruisci nomi partecipanti
    const nomi = [];
    if (cliente) nomi.push(cliente.nome);
    squadra.forEach((s) => {
      if (partecipantiIds.includes(s.id)) nomi.push(s.nome);
    });

    const payload = {
      ...form,
      durata_minuti: Number(form.durata_minuti) || 60,
      cliente_nome: cliente?.nome || "",
      cantiere_nome: cantiere?.nome || "",
      partecipanti_ids: partecipantiIds.join(","),
      partecipanti_nomi: nomi.join(", "),
    };

    try {
      let cantiereId = form.cantiere_id;
      let cantiereNome = cantiere?.nome || "";

      // Crea cantiere in bozza per sopralluogo
      if (creaCantiereBozza && form.cliente_id && !cantiereId) {
        const clienteObj = clienti.find((c) => c.id === form.cliente_id);
        const nuovoCant = await base44.entities.Cantiere.create({
          nome:
            clienteObj?.is_azienda && clienteObj?.azienda
              ? `Sopralluogo - ${clienteObj.azienda}`
              : `Sopralluogo - ${clienteObj?.nome || "Nuovo"}`,
          cliente_id: form.cliente_id,
          cliente_nome: clienteObj?.nome || "",
          indirizzo: clienteObj?.indirizzo || "",
          citta: clienteObj?.citta || "",
          stato: "bozza",
        });
        cantiereId = nuovoCant.id;
        cantiereNome = nuovoCant.nome;
      }

      const payloadFinal = { ...payload, cantiere_id: cantiereId, cantiere_nome: cantiereNome };

      if (appuntamento) {
        await base44.entities.Appuntamento.update(appuntamento.id, payloadFinal);
      } else {
        await base44.entities.Appuntamento.create(payloadFinal);
      }
      // Notifica in-app tutti i partecipanti (collaboratori con utente collegato)
      await creaNotifiche({
        collaboratoriIds: partecipantiIds,
        tipo: "appuntamento",
        titolo: `Appuntamento: ${form.titolo}`,
        testo: `${form.data} alle ${form.ora}${cantiere ? " — " + cantiere.nome : ""}`,
        url: "/agenda",
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio appuntamento:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appuntamento ? "Modifica appuntamento" : "Nuovo appuntamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="titolo">Titolo *</Label>
            <Input
              id="titolo"
              value={form.titolo}
              onChange={(e) => update("titolo", e.target.value)}
              placeholder="es. sopralluogo cantiere"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={form.data}
                onChange={(e) => update("data", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ora">Ora *</Label>
              <Input
                id="ora"
                type="time"
                value={form.ora}
                onChange={(e) => update("ora", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durata">Durata (min)</Label>
              <Input
                id="durata"
                type="number"
                min="5"
                step="5"
                value={form.durata_minuti}
                onChange={(e) => update("durata_minuti", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => update("tipo", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPI.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select
                value={form.stato}
                onValueChange={(v) => update("stato", v)}
              >
                <SelectTrigger>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id || "__none__"}
                onValueChange={(v) =>
                  update("cliente_id", v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {clienti.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cantiere</Label>
              <Select
                value={form.cantiere_id || "__none__"}
                onValueChange={(v) =>
                  update("cantiere_id", v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {cantieri.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Crea cantiere in bozza per sopralluogo */}
          {form.cliente_id && !form.cantiere_id && (
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
              <Switch
                checked={creaCantiereBozza}
                onCheckedChange={setCreaCantiereBozza}
              />
              <div>
                <span className="text-sm font-medium">Crea cantiere in bozza</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Per sopralluoghi: crea un cantiere in stato bozza collegato al cliente. Se il lavoro viene preso, si prosegue; altrimenti si archivia.
                </p>
              </div>
            </label>
          )}

          {/* Partecipanti — sezione critica 5.3 */}
          {form.cantiere_id && squadra.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Partecipanti (squadra del cantiere)
              </Label>
              <div className="space-y-1.5">
                {form.cliente_id && (
                  <label className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="accent-primary"
                    />
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm">
                      {clienti.find((c) => c.id === form.cliente_id)?.nome || "Cliente"}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Cliente
                    </span>
                  </label>
                )}
                {squadra.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={partecipantiIds.includes(s.id)}
                      onChange={() => togglePartecipante(s.id)}
                      className="accent-primary"
                    />
                    <HardHat className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{s.nome}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Collaboratore
                    </span>
                  </label>
                ))}
              </div>
              {partecipantiIds.length > 0 && (
                <p className="text-[11px] text-green-500 mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {partecipantiIds.length} collaboratore/i selezionato/i
                </p>
              )}
            </div>
          )}
          {form.cantiere_id && squadra.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nessun collaboratore assegnato a questo cantiere. Assegna la
              squadra dalla scheda cantiere per poterla invitare agli
              appuntamenti.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              rows={2}
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
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
              {appuntamento ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}