import { base44 } from "@/api/base44Client";

// inviteUser della piattaforma accetta solo "user" o "admin".
// Per i ruoli personalizzati (mssg_*), invitiamo con il ruolo base
// e poi impostiamo il ruolo specifico sul record utente.
export async function invitaUtenteConRuolo(email, ruoloCustom, dataExtra = {}) {
  const baseRole = ruoloCustom === "admin" ? "admin" : "user";
  await base44.users.inviteUser(email, baseRole);
  try {
    const users = await base44.entities.User.list();
    const nu = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (nu) {
      await base44.entities.User.update(nu.id, { role: ruoloCustom, ...dataExtra });
    }
  } catch {
    /* l'invito è comunque partito */
  }
  return true;
}