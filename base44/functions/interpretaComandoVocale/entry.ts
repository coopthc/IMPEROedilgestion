import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Normalizza un nome: lowercase, rimuove articoli/preposizioni italiani iniziali
function normalizzaNome(s: string): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/^(il|la|lo|l'|le|i|gli|un|una|un'|e|ed|di|del|della|dei|delle|per|a|al|allo|alla|ai|agli|alle|dal|dallo|dalla|dai|dagli|dalle)\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) d[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

// Trova il miglior match per nome tra una lista di record, provando più strategie
function matchByNome(search: string, items: any[], fields: string[]): any | null {
  if (!search || !items.length) return null;
  const normSearch = normalizzaNome(search);
  if (!normSearch) return null;

  // 1. Match esatto (normalizzato)
  let match = items.find((c: any) => fields.some((f: string) => normalizzaNome(String(c[f] || "")) === normSearch));
  if (match) return match;

  // 2. Match per contenuto (normalizzato)
  match = items.find((c: any) => fields.some((f: string) => {
    const v = normalizzaNome(String(c[f] || ""));
    return v && (v.includes(normSearch) || normSearch.includes(v));
  }));
  if (match) return match;

  // 3. Match per token — tutti i token significativi della ricerca appaiono nel campo
  const searchTokens = normSearch.split(" ").filter((t: string) => t.length > 2);
  if (searchTokens.length > 0) {
    match = items.find((c: any) => fields.some((f: string) => {
      const v = normalizzaNome(String(c[f] || ""));
      return v && searchTokens.every((t: string) => v.includes(t));
    }));
    if (match) return match;
  }

  // 4. Match fuzzy — distanza di Levenshtein entro il 30% della lunghezza
  let bestMatch: any = null;
  let bestDist = Infinity;
  for (const c of items) {
    for (const f of fields) {
      const v = normalizzaNome(String(c[f] || ""));
      if (!v) continue;
      const dist = levenshtein(normSearch, v);
      const maxLen = Math.max(normSearch.length, v.length);
      if (maxLen > 0 && dist <= Math.ceil(maxLen * 0.3) && dist < bestDist) {
        bestDist = dist;
        bestMatch = c;
      }
    }
  }
  return bestMatch;
}

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
- cliente: nome (obbligatorio, SOLO nome e cognome senza articoli), azienda, is_azienda (true se nomina un'azienda), email, telefono, indirizzo, citta, cap, provincia, piva, codice_fiscale, note.
- collaboratore: nome (obbligatorio, SOLO nome e cognome senza articoli), qualifica ("capo_cantiere"/"operaio"/"tecnico"/"amministrazione"/"altro"), costo_orario, email, telefono, is_azienda, azienda.
- cantiere: titolo (usato come nome cantiere), cliente_nome (SOLO il nome del cliente esistente, SENZA articoli o preposizioni — es. "Bianchi" non "il Bianchi" o "e Bianchi"), indirizzo, citta, stato ("attivo" default), data_inizio, data_fine, budget, descrizione.
- lavorazione: titolo, cantiere_nome (SOLO il nome del cantiere esistente, senza articoli), descrizione, percentuale_prevista (numero 0-100), costo.

IMPORTANTISSIMO: per cliente_nome e cantiere_nome estrai SOLO il nome proprio senza articoli ("il", "la", "l'", "e", "per", "di", "del"). Se il comando dice "per il cliente Bianchi", estrai solo "Bianchi".
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
        const match = matchByNome(res.cliente_nome, clienti, ["nome", "azienda"]);
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
        const match = matchByNome(res.cantiere_nome, cantieri, ["nome"]);
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