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
    await base44.functions.invoke("aggiornaUtenteGestionale", {
      email,
      data: { role: ruoloCustom, ...dataExtra },
    });
    const nu = await base44.functions.invoke("getUtenteGestionale", { email });
    return nu || null;
  } catch (e) {
    console.error("Errore aggiornamento ruolo utente:", e);
  }
  return null;
}