import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const transcript: string = (body?.transcript || '').trim();
    if (!transcript) return Response.json({ error: 'Comando mancante' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Sei un assistente che interpreta comandi vocali per un gestionale edile. Analizza questo comando e restituisci un JSON strutturato.
Comando dell'utente: "${transcript}"
Data di oggi: ${today} (formato YYYY-MM-DD).
Regole:
- Determina se l'utente vuole creare un "appuntamento" o un "promemoria".
- Risolvi date relative ("domani", "dopodomani", "lunedì", "venerdì", "25 agosto") in formato YYYY-MM-DD rispetto alla data di oggi.
- Per appuntamento: estrai titolo, data, ora (HH:MM, default "09:00"), durata_minuti (numero, default 60), categoria ("lavorativo" o "personale", default "lavorativo").
- Per promemoria: estrai titolo, data, ora (HH:MM se menzionata, altrimenti stringa vuota).
- Se un campo non è menzionato, usa valori sensati di default.
Rispondi SOLO con JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["appuntamento", "promemoria"] },
          titolo: { type: "string" },
          data: { type: "string" },
          ora: { type: "string" },
          durata_minuti: { type: "number" },
          categoria: { type: "string" },
        },
        required: ["tipo", "titolo", "data"],
      },
    });

    return Response.json(res);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}