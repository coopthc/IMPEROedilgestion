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

// Verifica se tutte le conferme presenza sono state raccolte:
// il pallino è verde quando tutti i partecipanti (utenti_ids) hanno risposto
// e anche l'utente corrente (se è tra i partecipanti) ha risposto.
export function confermaCompletata(app, user) {
  if (!app?.richiedi_conferma || !user) return false;

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

  if (utentiIds.length === 0) return true;
  return utentiIds.every((uid) => risposte[uid]);
}