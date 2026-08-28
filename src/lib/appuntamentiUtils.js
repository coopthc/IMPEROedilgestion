// Utility per filtrare gli appuntamenti in base all'utente corrente.
// Ogni utente vede solo:
//   - i propri appuntamenti personali (categoria=personale creati da lui)
//   - gli appuntamenti lavorativi in cui è esplicitamente partecipante (utenti_ids)
// Nessuna condivisione automatica: gli slot risultano vuoti a meno di abbinamenti voluti dai superiori.

export function isMioAppuntamento(a, userId) {
  if (!userId) return false;
  if (a.categoria === "personale") {
    return a.created_by_id === userId;
  }
  const raw = a.utenti_ids;
  if (!raw) return false;
  if (Array.isArray(raw)) return raw.includes(userId);
  return String(raw).split(",").map((s) => s.trim()).includes(userId);
}

export function filtraAppuntamentiPersonali(appuntamenti, user) {
  if (!user) return [];
  return appuntamenti.filter((a) => isMioAppuntamento(a, user.id));
}

// Stato conferma presenza — 3 livelli:
//   - "rosso"      => manca ancora la risposta di almeno un partecipante
//   - "arancione"  => tutti hanno risposto ma non tutti sono presenti
//   - "verde"      => tutti i partecipanti hanno risposto "presente"
//   - null         => conferma non richiesta o nessun partecipante
export function statoConferma(app, user) {
  if (!app?.richiedi_conferma) return null;

  let risposte = {};
  try {
    risposte = app.risposte_json ? JSON.parse(app.risposte_json) : {};
  } catch {
    risposte = {};
  }

  const utentiIds = Array.isArray(app.utenti_ids)
    ? app.utenti_ids
    : app.utenti_ids
      ? String(app.utenti_ids).split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  if (utentiIds.length === 0) return null;

  const tuttiRisposto = utentiIds.every((uid) => risposte[uid]);
  if (!tuttiRisposto) return "rosso";

  const tuttiPresenti = utentiIds.every((uid) => risposte[uid]?.risposta === "presente");
  return tuttiPresenti ? "verde" : "arancione";
}

// @deprecated usare statoConferma; mantenuto per compatibilità
export function confermaCompletata(app, user) {
  return statoConferma(app, user) === "verde";
}

export const STATO_CONFERMA_STYLE = {
  rosso: "bg-red-500 animate-pulse ring-red-500/30",
  arancione: "bg-orange-500 ring-orange-500/30",
  verde: "bg-green-500 ring-green-500/30",
};

export const STATO_CONFERMA_TITLE = {
  rosso: "Conferma presenza richiesta",
  arancione: "Tutti hanno risposto, non tutti presenti",
  verde: "Tutti i partecipanti presenti",
};