import { base44 } from "@/api/base44Client";

// Invia (o re-invia) l'email di accesso brandizzata da EdilGestion.
// L'email contiene il link per impostare la password (/forgot-password).
export async function inviaEmailAccesso(email, nome, tipo) {
  return await base44.functions.invoke("inviaEmailBenvenuto", { email, nome, tipo });
}