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
      prompt: `Sei un assistente che interpreta comandi vocali per un gestionale edile (EdilGestion). Analizza questo comando e restituisci un JSON strutturato.
Comando dell'utente: "${transcript}"
Data di oggi: ${today} (formato YYYY-MM-DD).

Determina cosa vuole creare l'utente tra: "appuntamento", "promemoria", "cliente", "collaboratore", "cantiere", "lavorazione".

Regole per tipo:
- appuntamento: titolo, data (YYYY-MM-DD, risolvi "domani"/"lunedì"/"25 agosto" ecc.), ora (HH:MM default "09:00"), durata_minuti (default 60), categoria ("lavorativo" o "personale" default "lavorativo").
- promemoria: titolo, data (YYYY-MM-DD), ora (HH:MM se menzionata altrimenti stringa vuota).
- cliente: nome (obbligatorio), azienda, is_azienda (true se nomina un'azienda), email, telefono, indirizzo, citta, cap, provincia, piva, codice_fiscale, note.
- collaboratore: nome (obbligatorio), qualifica ("capo_cantiere"/"operaio"/"tecnico"/"amministrazione"/"altro"), costo_orario, email, telefono, is_azienda, azienda.
- cantiere: titolo (usato come nome cantiere), cliente_nome (nome del cliente se menzionato), indirizzo, citta, stato ("attivo" default), data_inizio, data_fine, budget, descrizione.
- lavorazione: titolo, cantiere_nome (nome del cantiere esistente), descrizione, percentuale_prevista (numero 0-100), costo.

Se un campo non è menzionato, usa null. Rispondi SOLO con JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["appuntamento", "promemoria", "cliente", "collaboratore", "cantiere", "lavorazione"] },
          titolo: { type: "string" },
          data: { type: "string" },
          ora: { type: "string" },
          durata_minuti: { type: "number" },
          categoria: { type: "string" },
          nome: { type: "string" },
          azienda: { type: "string" },
          is_azienda: { type: "boolean" },
          email: { type: "string" },
          telefono: { type: "string" },
          indirizzo: { type: "string" },
          citta: { type: "string" },
          cap: { type: "string" },
          provincia: { type: "string" },
          piva: { type: "string" },
          codice_fiscale: { type: "string" },
          qualifica: { type: "string" },
          costo_orario: { type: "number" },
          note: { type: "string" },
          cliente_nome: { type: "string" },
          stato: { type: "string" },
          data_inizio: { type: "string" },
          data_fine: { type: "string" },
          budget: { type: "number" },
          descrizione: { type: "string" },
          cantiere_nome: { type: "string" },
          percentuale_prevista: { type: "number" },
          costo: { type: "number" },
        },
        required: ["tipo"],
      },
    });

    // Pulisci valori "null"/"undefined" stringa restituiti dall'LLM per i campi vuoti
    Object.keys(res).forEach((k: string) => {
      const v = res[k];
      if (v === "null" || v === "undefined" || v === null || v === "") delete res[k];
    });

    const tipo: string = res.tipo;
    let record: any;
    let message: string;

    if (tipo === "appuntamento") {
      record = await base44.entities.Appuntamento.create({
        titolo: res.titolo || "Appuntamento",
        data: res.data || today,
        ora: res.ora || "09:00",
        durata_minuti: res.durata_minuti || 60,
        categoria: res.categoria || "lavorativo",
        stato: "programmato",
      });
      message = "Appuntamento creato";
    } else if (tipo === "promemoria") {
      record = await base44.entities.Promemoria.create({
        titolo: res.titolo || "Promemoria",
        data: res.data || today,
        ora: res.ora || "",
      });
      message = "Promemoria creato";
    } else if (tipo === "cliente") {
      record = await base44.entities.Cliente.create({
        nome: res.nome || res.titolo || "Nuovo cliente",
        ...(res.azienda ? { azienda: res.azienda } : {}),
        ...(res.is_azienda ? { is_azienda: true } : {}),
        ...(res.email ? { email: res.email } : {}),
        ...(res.telefono ? { telefono: res.telefono } : {}),
        ...(res.indirizzo ? { indirizzo: res.indirizzo } : {}),
        ...(res.citta ? { citta: res.citta } : {}),
        ...(res.cap ? { cap: res.cap } : {}),
        ...(res.provincia ? { provincia: res.provincia } : {}),
        ...(res.piva ? { piva: res.piva } : {}),
        ...(res.codice_fiscale ? { codice_fiscale: res.codice_fiscale } : {}),
        ...(res.note ? { note: res.note } : {}),
      });
      message = "Cliente creato";
    } else if (tipo === "collaboratore") {
      record = await base44.entities.Collaboratore.create({
        nome: res.nome || res.titolo || "Nuovo collaboratore",
        ...(res.qualifica ? { qualifica: res.qualifica } : {}),
        ...(res.costo_orario ? { costo_orario: res.costo_orario } : {}),
        ...(res.email ? { email: res.email } : {}),
        ...(res.telefono ? { telefono: res.telefono } : {}),
        ...(res.azienda ? { azienda: res.azienda, is_azienda: true } : {}),
      });
      message = "Collaboratore creato";
    } else if (tipo === "cantiere") {
      let cliente_id = "";
      let cliente_nome = "";
      if (res.cliente_nome) {
        const clienti = await base44.entities.Cliente.list();
        const search = res.cliente_nome.toLowerCase();
        const match = clienti.find((c: any) =>
          (c.nome || "").toLowerCase().includes(search) ||
          (c.azienda || "").toLowerCase().includes(search)
        );
        if (match) {
          cliente_id = match.id;
          cliente_nome = match.nome || match.azienda || "";
        }
      }
      record = await base44.entities.Cantiere.create({
        nome: res.titolo || res.nome || "Nuovo cantiere",
        ...(cliente_id ? { cliente_id, cliente_nome } : {}),
        ...(res.indirizzo ? { indirizzo: res.indirizzo } : {}),
        ...(res.citta ? { citta: res.citta } : {}),
        stato: res.stato || "attivo",
        ...(res.data_inizio ? { data_inizio: res.data_inizio } : {}),
        ...(res.data_fine ? { data_fine: res.data_fine } : {}),
        ...(res.budget ? { budget: res.budget } : {}),
        ...(res.descrizione ? { descrizione: res.descrizione } : {}),
      });
      message = cliente_id ? "Cantiere creato e collegato al cliente" : "Cantiere creato (cliente non trovato)";
    } else if (tipo === "lavorazione") {
      let cantiere_id = "";
      let cantiere_nome = "";
      if (res.cantiere_nome) {
        const cantieri = await base44.entities.Cantiere.list();
        const search = res.cantiere_nome.toLowerCase();
        const match = cantieri.find((c: any) =>
          (c.nome || "").toLowerCase().includes(search)
        );
        if (match) {
          cantiere_id = match.id;
          cantiere_nome = match.nome || "";
        }
      }
      if (!cantiere_id) {
        return Response.json({
          error: "Cantiere non trovato. Specifica il nome di un cantiere esistente nel comando."
        }, { status: 400 });
      }
      record = await base44.entities.Lavorazione.create({
        cantiere_id,
        cantiere_nome,
        titolo: res.titolo || "Nuova lavorazione",
        ...(res.descrizione ? { descrizione: res.descrizione } : {}),
        percentuale_prevista: res.percentuale_prevista || 0,
        ...(res.costo ? { costo: res.costo } : {}),
      });
      message = "Lavorazione creata";
    } else {
      return Response.json({ error: "Tipo non riconosciuto" }, { status: 400 });
    }

    return Response.json({ tipo, record, message });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}