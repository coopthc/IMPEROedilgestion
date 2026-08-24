import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  UserMinus,
  Loader2,
  HardHat,
  Crown,
  User,
} from "lucide-react";

const RUOLI_CANTIERE = [
  { value: "operaio", label: "Operaio" },
  { value: "capo", label: "Capo cantiere" },
  { value: "subappaltatore", label: "Subappaltatore" },
  { value: "supervisore", label: "Supervisore" },
];

function parseRuoli(str) {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

export default function CantiereSquadra({ cantiere, clienti = [], onSaved, onOpenScheda }) {
  const { toast } = useToast();
  const [collaboratori, setCollaboratori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responsabileId, setResponsabileId] = useState(cantiere.responsabile_id || "");
  const [clienteId, setClienteId] = useState(cantiere.cliente_id || "");

  const assignedIds = (cantiere.collaboratori_ids || "")
    .split(",")
    .filter(Boolean);
  const ruoli = parseRuoli(cantiere.collaboratori_ruoli);

  useEffect(() => {
    base44.entities.Collaboratore
      .list()
      .then(setCollaboratori)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (collabId) => {
    const isAssigned = assignedIds.includes(collabId);
    const newIds = isAssigned
      ? assignedIds.filter((id) => id !== collabId)
      : [...assignedIds, collabId];
    const newRuoli = { ...ruoli };
    if (isAssigned) delete newRuoli[collabId];
    else newRuoli[collabId] = "operaio";
    setSaving(true);
    try {
      await base44.entities.Cantiere.update(cantiere.id, {
        collaboratori_ids: newIds.join(","),
        collaboratori_ruoli: JSON.stringify(newRuoli),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const updateRuolo = async (collabId, ruolo) => {
    const newRuoli = { ...ruoli, [collabId]: ruolo };
    setSaving(true);
    try {
      await base44.entities.Cantiere.update(cantiere.id, {
        collaboratori_ruoli: JSON.stringify(newRuoli),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const saveResponsabile = async () => {
    const collab = collaboratori.find((c) => c.id === responsabileId);
    setSaving(true);
    try {
      await base44.entities.Cantiere.update(cantiere.id, {
        responsabile_id: responsabileId || "",
        responsabile_nome: collab?.nome || "",
      });
      onSaved();
      toast({ title: "Responsabile aggiornato" });
    } finally {
      setSaving(false);
    }
  };

  const saveCliente = async () => {
    const cli = clienti.find((c) => c.id === clienteId);
    setSaving(true);
    try {
      await base44.entities.Cantiere.update(cantiere.id, {
        cliente_id: clienteId || "",
        cliente_nome: cli?.nome || "",
      });
      onSaved();
      toast({ title: "Cliente aggiornato" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assigned = collaboratori.filter((c) => assignedIds.includes(c.id));
  const available = collaboratori.filter(
    (c) => !assignedIds.includes(c.id) && c.attivo !== false
  );

  return (
    <div className="space-y-5">
      {/* Cliente abbinato */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Cliente abbinato
        </h3>
        <div className="flex gap-2">
          <Select
            value={clienteId || "__none__"}
            onValueChange={(v) => setClienteId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleziona cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Nessuno —</SelectItem>
              {clienti.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.is_azienda ? c.azienda || c.nome : c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={saveCliente}
            disabled={saving}
          >
            Aggiorna
          </Button>
        </div>
        {cantiere.cliente_nome && (
          <div className="mt-2 text-xs text-muted-foreground">
            Attuale:{" "}
            <button
              onClick={() => {
                const cli = clienti.find((c) => c.id === cantiere.cliente_id);
                if (cli && onOpenScheda) onOpenScheda({ type: "cliente", item: cli });
              }}
              className="text-primary hover:underline"
            >
              {cantiere.cliente_nome}
            </button>
          </div>
        )}
      </div>

      {/* Responsabile */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          Responsabile / Capo cantiere
        </h3>
        <div className="flex gap-2">
          <Select
            value={responsabileId || "__none__"}
            onValueChange={(v) => setResponsabileId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleziona responsabile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Nessuno —</SelectItem>
              {collaboratori
                .filter((c) => c.attivo !== false)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={saveResponsabile}
            disabled={saving}
          >
            Aggiorna
          </Button>
        </div>
        {cantiere.responsabile_nome && (
          <div className="mt-2 text-xs text-muted-foreground">
            Attuale: <strong className="text-foreground">{cantiere.responsabile_nome}</strong>
          </div>
        )}
      </div>

      {/* Assegnati */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Squadra del cantiere ({assigned.length})
        </h3>
        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center bg-secondary/30 rounded-lg">
            Nessun collaboratore assegnato.
          </p>
        ) : (
          <div className="space-y-2">
            {assigned.map((c) => {
              const ruolo = ruoli[c.id] || "operaio";
              const isResp = cantiere.responsabile_id === c.id;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 bg-card border border-border rounded-lg p-3"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    {isResp ? (
                      <Crown className="w-4 h-4 text-primary" />
                    ) : (
                      <HardHat className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onOpenScheda?.({ type: "collaboratore", item: c })}
                      className="text-sm font-medium truncate text-left hover:text-primary hover:underline"
                    >
                      {c.nome}
                      {isResp && (
                        <span className="ml-1.5 text-[10px] text-primary font-semibold">
                          RESPONSABILE
                        </span>
                      )}
                    </button>
                  </div>
                  <Select
                    value={ruolo}
                    onValueChange={(v) => updateRuolo(c.id, v)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RUOLI_CANTIERE.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => toggle(c.id)}
                    disabled={saving}
                    className="p-1.5 rounded hover:bg-destructive/15 text-destructive"
                    title="Rimuovi"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disponibili */}
      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            Aggiungi collaboratori
          </h3>
          <div className="space-y-2">
            {available.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-secondary/30 border border-border rounded-lg p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <HardHat className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() => onOpenScheda?.({ type: "collaboratore", item: c })}
                      className="text-sm truncate text-left hover:text-primary hover:underline block"
                    >
                      {c.nome}
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {c.qualifica}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle(c.id)}
                  disabled={saving}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Assegna
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}