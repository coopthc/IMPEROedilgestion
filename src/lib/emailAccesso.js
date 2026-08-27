import { base44 } from "@/api/base44Client";

// Invia (o re-invia) l'email di accesso brandizzata da EdilGestion.
// Funziona solo con utenti già registrati (che hanno impostato la password).
export async function inviaEmailAccesso(email, nome, tipo) {
  return await base44.functions.invoke("inviaEmailBenvenuto", { email, nome, tipo });
}

// Re-invia il link di accesso tramite la piattaforma (reset password).
// Funziona con qualsiasi email, registrata o meno.
export async function reinviaLinkAccesso(email) {
  await base44.auth.resetPasswordRequest(email);
}