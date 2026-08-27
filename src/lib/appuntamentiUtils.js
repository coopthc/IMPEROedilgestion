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