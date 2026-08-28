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
import {
  Loader2,
  User,
  HardHat,
  Check,
  Calendar,
  X,
  Search,
  Trash2,
  Briefcase,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Combobox from "@/components/agenda/Combobox";
import TimeSlotPicker from "@/components/agenda/TimeSlotPicker";

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

const DURATE_PILLOLE = [10, 15, 30, 45, 60];

const emptyForm = {
  titolo: "",
  data: "",
  ora: "",
  tipo: "interno",
  categoria: "lavorativo",
  cliente_id: "",
  cantiere_id: "",
  note: "",
  stato: "programmato",
  richiedi_conferma: false,
};

function durataToPillole(durata) {
  if (!durata || durata <= 0) return [60];
  const pillole = [];
  let r = durata;
  while (r >= 60) {
    pillole.push(60);
    r -= 60;
  }
  if (r === 45) pillole.push(45);
  else if (r === 30) pillole.push(30);
  else if (r === 15) pillole.push(15);
  else if (r === 10) pillole.push(10);
  else if (r > 0) pillole.push(r);
  return pillole.length > 0 ? pillole : [60];
}

export default function AppuntamentoForm({
  open,
  onOpenChange,
  appuntamento,
  defaultData,
  onSaved,
}) {
  const { user } = useAuth();
  const isAdmin = ["admin", "mssg_admin"].includes(user?.role);
  const isClienteRole = user?.role === "mssg_cliente";
  const isOperaio = user?.role === "mssg_operaio";
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [clienti, setClienti] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [partecipantiIds, setPartecipantiIds] = useState([]);
  const [pillole, setPillole] = useState([60]);
  const [creaCantiereBozza, setCreaCantiereBozza] = useState(false);
  const [collabSearch, setCollabSearch] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (appuntamento) {
      setForm({
        titolo: appuntamento.titolo || "",
        data: appuntamento.data || "",
        ora: appuntamento.ora || "",
        tipo: appuntamento.tipo || "interno",
        categoria: appuntamento.categoria || "lavorativo",
        cliente_id: appuntamento.cliente_id || "",
        cantiere_id: appuntamento.cantiere_id || "",
        note: appuntamento.note || "",
        stato: appuntamento.stato || "programmato",
        richiedi_conferma: appuntamento.richiedi_conferma || false,
      });
      setPartecipantiIds(
        (appuntamento.partecipanti_ids || "").split(",").filter(Boolean)
      );
      setPillole(durataToPillole(appuntamento.durata_minuti));
    } else {
      const myClienteId = user?.cliente_id || user?.data?.cliente_id || "";
      setForm(isOperaio
        ? { ...emptyForm, data: defaultData || "", categoria: "personale", richiedi_conferma: false }
        : isClienteRole
        ? { ...emptyForm, data: defaultData || "", categoria: "lavorativo", tipo: "richiesta", stato: "in_attesa", cliente_id: myClienteId }
        : { ...emptyForm, data: defaultData || "" });
      setPartecipantiIds([]);
      setPillole([60]);
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
      base44.entities.Collaboratore
        .filter({ attivo: true })
        .then(setCollaboratori)
        .catch(() => {});
    }
  }, [open]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const togglePartecipante = (id) => {
    setPartecipantiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addPillola = (val) => setPillole((prev) => [...prev, val]);
  const removePillola = (idx) =>
    setPillole((prev) => prev.filter((_, i) => i !== idx));
  const resetPillole = () => setPillole([]);

  const durataTotale = pillole.reduce((a, b) => a + b, 0);

  const dataLabel = form.data
    ? new Date(form.data + "T00:00").toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  // Collaboratori abbinati al cantiere selezionato (per evidenziazione)
  const cantiereSelezionato = cantieri.find((c) => c.id === form.cantiere_id);
  const cantiereCollabIds = cantiereSelezionato
    ? (cantiereSelezionato.collaboratori_ids || "")
        .split(",")
        .filter(Boolean)
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titolo.trim() || !form.data) return;
    if (!isClienteRole && !form.ora) return;
    setLoading(true);

    const cliente = clienti.find((c) => c.id === form.cliente_id);
    const cantiere = cantieri.find((c) => c.id === form.cantiere_id);

    const nomi = [];
    if (cliente) nomi.push(cliente.nome);
    collaboratori.forEach((s) => {
      if (partecipantiIds.includes(s.id)) nomi.push(s.nome);
    });

    // RLS: raccoglie gli user_id dei partecipanti + cliente + creatore
    const utentiIds = [];
    collaboratori.forEach((s) => {
      if (partecipantiIds.includes(s.id) && s.user_id) {
        utentiIds.push(s.user_id);
      }
    });
    // Aggiungi l'user_id del cliente (se selezionato o se è il cliente stesso)
    if (form.cliente_id) {
      const clienteObj = clienti.find((c) => c.id === form.cliente_id);
      if (clienteObj?.user_id && !utentiIds.includes(clienteObj.user_id)) {
        utentiIds.push(clienteObj.user_id);
      }
    }
    if (user?.id && !utentiIds.includes(user.id) && !isAdmin) {
      utentiIds.push(user.id);
    }

    // Se l'admin modifica data/ora di una richiesta in_attesa, imposta stato a "proposto"
    let statoFinale = form.stato;
    if (appuntamento && (appuntamento.stato === "in_attesa" || appuntamento.stato === "proposto")) {
      if (form.data !== appuntamento.data || form.ora !== appuntamento.ora) {
        statoFinale = "proposto";
      }
    }

    const payload = {
      ...form,
      stato: statoFinale,
      durata_minuti: durataTotale || 60,
      cliente_nome: cliente?.nome || "",
      cantiere_nome: cantiere?.nome || "",
      partecipanti_ids: partecipantiIds.join(","),
      partecipanti_nomi: nomi.join(", "),
      utenti_ids: utentiIds,
    };

    try {
      let cantiereId = form.cantiere_id;
      let cantiereNome = cantiere?.nome || "";

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

      const payloadFinal = {
        ...payload,
        cantiere_id: cantiereId,
        cantiere_nome: cantiereNome,
      };

      let savedId;
      if (appuntamento) {
        await base44.entities.Appuntamento.update(appuntamento.id, payloadFinal);
        savedId = appuntamento.id;
      } else {
        const created = await base44.entities.Appuntamento.create(payloadFinal);
        savedId = created.id;
      }

      // Invia email + crea notifiche in-app (server-side) a tutti i partecipanti (cliente + collaboratori)
      if (partecipantiIds.length > 0 || form.cliente_id) {
        setSendingEmail(true);
        try {
          await base44.functions.invoke("inviaNotificaAppuntamento", {
            appuntamento_id: savedId,
          });
        } catch (err) {
          console.error("Errore invio email appuntamento:", err);
        }
        setSendingEmail(false);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore salvataggio appuntamento:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appuntamento) return;
    if (!confirm("Eliminare definitivamente questo appuntamento?")) return;
    setDeleting(true);
    try {
      await base44.entities.Appuntamento.delete(appuntamento.id);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Errore eliminazione:", err);
    } finally {
      setDeleting(false);
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
          {/* Categoria: Lavorativo / Personale (nascosto per cliente e operaio) */}
          {!isClienteRole && !isOperaio && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/50 rounded-lg">
              <button
                type="button"
                onClick={() => update("categoria", "lavorativo")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  form.categoria !== "personale" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="w-4 h-4" /> Lavorativo
              </button>
              <button
                type="button"
                onClick={() => update("categoria", "personale")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  form.categoria === "personale" ? "bg-teal-500 text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-4 h-4" /> Personale
              </button>
            </div>
          )}

          {/* Data + Ora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              {defaultData && !appuntamento ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm capitalize">
                  <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate">{dataLabel}</span>
                </div>
              ) : (
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => update("data", e.target.value)}
                  required
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Ora</Label>
              <TimeSlotPicker
                data={form.data}
                ora={form.ora}
                onChange={(v) => update("ora", v)}
                excludeId={appuntamento?.id}
                isAdmin={isAdmin}
              />
              {!form.ora && form.data && (
                <p className="text-[10px] text-muted-foreground">
                  Clicca un orario per selezionarlo
                </p>
              )}
            </div>
          </div>

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

          {/* Durata pillole */}
          <div className="space-y-2">
            <Label>Durata</Label>
            <div className="flex flex-wrap gap-2">
              {DURATE_PILLOLE.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => addPillola(d)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  +{d}min
                </button>
              ))}
            </div>
            {pillole.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {pillole.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold"
                  >
                    {p}min
                    <button
                      type="button"
                      onClick={() => removePillola(i)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  = {durataTotale}min
                </span>
                <button
                  type="button"
                  onClick={resetPillole}
                  className="text-[10px] text-muted-foreground hover:text-destructive ml-1"
                >
                  azzera
                </button>
              </div>
            )}
          </div>

          {!isClienteRole && !isOperaio && form.categoria !== "personale" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => update("tipo", v)}>
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
              <Select value={form.stato} onValueChange={(v) => update("stato", v)}>
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
          )}

          {!isClienteRole && !isOperaio && form.categoria !== "personale" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Combobox
                value={form.cliente_id}
                onChange={(v) => update("cliente_id", v)}
                items={clienti.map((c) => ({ id: c.id, label: c.nome }))}
                placeholder="Cerca cliente..."
                icon={User}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cantiere</Label>
              <Combobox
                value={form.cantiere_id}
                onChange={(v) => update("cantiere_id", v)}
                items={cantieri.map((c) => ({ id: c.id, label: c.nome }))}
                placeholder="Cerca cantiere..."
              />
            </div>
          </div>
          )}

          {/* Crea cantiere in bozza per sopralluogo */}
          {!isClienteRole && !isOperaio && form.categoria !== "personale" && form.cliente_id && !form.cantiere_id && (
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
              <Switch
                checked={creaCantiereBozza}
                onCheckedChange={setCreaCantiereBozza}
              />
              <div>
                <span className="text-sm font-medium">Crea cantiere in bozza</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Per sopralluoghi: crea un cantiere in stato bozza collegato al
                  cliente.
                </p>
              </div>
            </label>
          )}

          {/* Collaboratori partecipanti — tutti gli attivi */}
          {!isClienteRole && !isOperaio && collaboratori.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Collaboratori partecipanti
              </Label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={collabSearch}
                  onChange={(e) => setCollabSearch(e.target.value)}
                  placeholder="Cerca collaboratore..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {form.cliente_id && (
                  <div className="flex items-center gap-2.5 p-2 rounded-md bg-secondary/30">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm">
                      {clienti.find((c) => c.id === form.cliente_id)?.nome ||
                        "Cliente"}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Cliente
                    </span>
                  </div>
                )}
                {collaboratori
                  .filter((s) =>
                    !collabSearch.trim()
                      ? true
                      : s.nome?.toLowerCase().includes(collabSearch.toLowerCase())
                  )
                  .sort((a, b) => {
                    const aIn = cantiereCollabIds.includes(a.id) ? 0 : 1;
                    const bIn = cantiereCollabIds.includes(b.id) ? 0 : 1;
                    return aIn - bIn;
                  })
                  .map((s) => {
                  const abbinato = cantiereCollabIds.includes(s.id);
                  return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary/50 cursor-pointer ${abbinato ? "bg-primary/5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={partecipantiIds.includes(s.id)}
                      onChange={() => togglePartecipante(s.id)}
                      className="accent-primary"
                    />
                    <HardHat className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{s.nome}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1.5">
                      {abbinato && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-semibold">
                          Cantiere
                        </span>
                      )}
                      {s.qualifica}
                    </span>
                  </label>
                  );
                  })}
              </div>
              {partecipantiIds.length > 0 && (
                <p className="text-[11px] text-green-500 mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {partecipantiIds.length} collaboratore/i selezionato/i
                </p>
              )}
            </div>
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

          {!isClienteRole && !isOperaio && (
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
              <Switch
                checked={form.richiedi_conferma || false}
                onCheckedChange={(v) => update("richiedi_conferma", v)}
              />
              <div>
                <span className="text-sm font-medium">Chiedi conferma presenza</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  I partecipanti riceveranno una notifica urgente per confermare la loro presenza (Presente / Assente / In forse).
                </p>
              </div>
            </label>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {appuntamento ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || sendingEmail || deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Elimina
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || sendingEmail || deleting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={loading || sendingEmail || deleting}>
                {(loading || sendingEmail) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {sendingEmail ? "Invio email..." : isClienteRole ? "Invia richiesta" : appuntamento ? "Salva" : "Crea"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}