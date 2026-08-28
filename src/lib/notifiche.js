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
/**
 * Crea una notifica in-app per l'utente collegato al cliente di un cantiere.
 * @param {Object} params
 * @param {string} params.clienteId - ID del cliente
 * @param {"appuntamento"|"aggiornamento"} params.tipo
 * @param {string} params.titolo
 * @param {string} [params.testo]
 * @param {string} [params.url]
 */
export async function creaNotificaCliente({ clienteId, tipo, titolo, testo, url }) {
  if (!clienteId) return;
  try {
    const cliente = await base44.entities.Cliente.get(clienteId);
    if (cliente?.user_id) {
      await base44.entities.Notifica.create({
        user_id: cliente.user_id,
        tipo,
        titolo,
        testo: testo || "",
        url: url || "",
        letto: false,
      });
    }
  } catch (e) {
    console.error("Errore creazione notifica cliente:", e);
  }
}

export async function creaNotifiche({ collaboratoriIds, tipo, titolo, testo, url }) {
  if (!collaboratoriIds || collaboratoriIds.length === 0) return;
  try {
    const all = await base44.entities.Collaboratore.list();
    const targets = all.filter(
      (c) => collaboratoriIds.includes(c.id) && c.user_id
    );
    if (targets.length > 0) {
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
    }
    // Email di fallback per collaboratori senza account utente
    await base44.functions.invoke("notificaEmailFallback", {
      collaboratoriIds,
      tipo,
      titolo,
      testo: testo || "",
      url: url || "",
    });
  } catch (e) {
    console.error("Errore creazione notifiche:", e);
  }
}