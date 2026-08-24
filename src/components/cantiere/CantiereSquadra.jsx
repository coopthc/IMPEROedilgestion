import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus, Loader2, HardHat } from "lucide-react";

const QUALIFICA_LABELS = {
  capo_cantiere: "Capo cantiere",
  operaio: "Operaio",
  tecnico: "Tecnico",
  amministrazione: "Amministrazione",
  altro: "Altro",
};

export default function CantiereSquadra({ cantiere, onSaved }) {
  const [collaboratori, setCollaboratori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const assignedIds = (cantiere.collaboratori_ids || "")
    .split(",")
    .filter(Boolean);

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
    setSaving(true);
    try {
      await base44.entities.Cantiere.update(cantiere.id, {
        collaboratori_ids: newIds.join(","),
      });
      onSaved();
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
    <div className="space-y-4">
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
            {assigned.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <HardHat className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.nome}</div>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                      {QUALIFICA_LABELS[c.qualifica] || c.qualifica}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle(c.id)}
                  disabled={saving}
                  className="text-destructive hover:text-destructive"
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1" />
                  Rimuovi
                </Button>
              </div>
            ))}
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
                    <div className="text-sm truncate">{c.nome}</div>
                    <span className="text-[10px] text-muted-foreground">
                      {QUALIFICA_LABELS[c.qualifica] || c.qualifica}
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