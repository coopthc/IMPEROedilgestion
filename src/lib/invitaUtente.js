import { base44 } from "@/api/base44Client";

// inviteUser della piattaforma accetta solo "user" o "admin".
// Per i ruoli personalizzati (mssg_*), invitiamo con il ruolo base
// e poi impostiamo il ruolo specifico sul record utente.
// Infine inviamo un'email di benvenuto brandizzata da EdilGestion
// (non l'invito generico della piattaforma Base44).
export async function invitaUtenteConRuolo(email, ruoloCustom, dataExtra = {}, nome = "") {
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
    // Invia email di benvenuto brandizzata da EdilGestion
    const tipo = dataExtra?.cliente_id
      ? "cliente"
      : dataExtra?.collaboratore_id
      ? "collaboratore"
      : "amministratore";
    try {
      await base44.functions.invoke("inviaEmailBenvenuto", {
        email,
        nome: nome || nu?.full_name || "",
        tipo,
      });
    } catch (e) {
      console.error("Invio email benvenuto fallito:", e);
    }
    // Sincronizza cantieri: se l'utente è appena stato collegato a un cliente
    // o collaboratore, assicura che i cantieri esistenti vengano abbinati all'utente.
    if (dataExtra?.cliente_id || dataExtra?.collaboratore_id) {
      try {
        await base44.functions.invoke("sincronizzaCantieriUtente", {});
      } catch (e) {
        console.error("Sync cantieri fallita:", e);
      }
    }
    return nu || null;
  } catch (e) {
    console.error("Errore aggiornamento ruolo utente:", e);
  }
  return null;
}