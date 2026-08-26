import { base44 } from "@/api/base44Client";

// inviteUser della piattaforma accetta solo "user" o "admin".
// Per i ruoli personalizzati (mssg_*), invitiamo con il ruolo base
// e poi impostiamo il ruolo specifico sul record utente.
export async function invitaUtenteConRuolo(email, ruoloCustom, dataExtra = {}) {
  const baseRole = ruoloCustom === "admin" ? "admin" : "user";
  try {
    await base44.users.inviteUser(email, baseRole);
  } catch (e) {
    // Utente già esistente: procedo comunque ad aggiornare il ruolo
    console.warn("inviteUser fallito (utente esistente?):", e);
  }
  try {
    const users = await base44.entities.User.list();
    const nu = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (nu) {
      await base44.entities.User.update(nu.id, { role: ruoloCustom, ...dataExtra });
      return nu;
    }
  } catch (e) {
    console.error("Errore aggiornamento ruolo utente:", e);
  }
  return null;
}