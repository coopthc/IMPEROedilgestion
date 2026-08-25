import { base44 } from "@/api/base44Client";

/**
 * Crea notifiche in-app per tutti i collaboratori indicati che hanno un utente collegato.
 * @param {Object} params
 * @param {string[]} params.collaboratoriIds - ID dei collaboratori da notificare
 * @param {"appuntamento"|"aggiornamento"} params.tipo
 * @param {string} params.titolo
 * @param {string} [params.testo]
 * @param {string} [params.url]
 */
export async function creaNotifiche({ collaboratoriIds, tipo, titolo, testo, url }) {
  if (!collaboratoriIds || collaboratoriIds.length === 0) return;
  try {
    const all = await base44.entities.Collaboratore.list();
    const targets = all.filter(
      (c) => collaboratoriIds.includes(c.id) && c.user_id
    );
    if (targets.length === 0) return;
    await base44.entities.Notifica.bulkCreate(
      targets.map((c) => ({
        user_id: c.user_id,
        tipo,
        titolo,
        testo: testo || "",
        url: url || "",
        letto: false,
      }))
    );
  } catch (e) {
    console.error("Errore creazione notifiche:", e);
  }
}