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

function matchByNome(search: string, items: any[], fields: string[]): any | null {
  if (!search || !items.length) return null;
  const normSearch = normalizzaNome(search);
  if (!normSearch) return null;

  let match = items.find((c: any) => fields.some((f: string) => normalizzaNome(String(c[f] || "")) === normSearch));
  if (match) return match;

  match = items.find((c: any) => fields.some((f: string) => {
    const v = normalizzaNome(String(c[f] || ""));
    return v && (v.includes(normSearch) || normSearch.includes(v));
  }));
  if (match) return match;

  const searchTokens = normSearch.split(" ").filter((t: string) => t.length > 2);
  if (searchTokens.length > 0) {
    match = items.find((c: any) => fields.some((f: string) => {
      const v = normalizzaNome(String(c[f] || ""));
      return v && searchTokens.every((t: string) => v.includes(t));
    }));
    if (match) return match;
  }

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

Prima determina l'AZIONE:
- "crea" se l'utente vuole creare qualcosa di nuovo (es: "nuovo", "crea", "aggiungi", "registra")
- "aggiorna" se l'utente vuole modificare un record esistente (es: "apri", "modifica", "aggiorna", "cambia", "imposta", "inserisci")

Poi determina il TIPO tra: "appuntamento", "promemoria", "cliente", "collaboratore", "cantiere", "lavorazione".

Per AGGIORNA, estrai "ricerca_nome" = il nome del record da trovare (SOLO il nome proprio, senza articoli). Es: "modifica budget cantiere Ristrutturazione Bagno" → ricerca_nome="Ristrutturazione Bagno", budget=X. "aggiorna cellulare cliente Mario Rossi con 333" → ricerca_nome="Mario Rossi", telefono="333".

Regole per tipo (campi aggiornabili in parentesi):
- cliente: ricerca_nome (nome/azienda), telefono, email, indirizzo, citta, cap, provincia, piva, codice_fiscale, note, azienda, is_azienda.
- collaboratore: ricerca_nome (nome), telefono, email, costo_orario, qualifica ("capo_cantiere"/"operaio"/"tecnico"/"amministrazione"/"altro"), indirizzo, citta.
- cantiere: ricerca_nome (nome), budget, stato ("bozza"/"attivo"/"sospeso"/"completato"/"chiuso"), data_inizio, data_fine, indirizzo, citta, descrizione.
- lavorazione: ricerca_nome (titolo), stato ("da_fare"/"in_corso"/"completata"/"bloccata"/"annullata"), percentuale_completata, percentuale_prevista, costo, descrizione.
- appuntamento: ricerca_nome (titolo), data, ora, durata_minuti, categoria, stato, note.
- promemoria: ricerca_nome (titolo), data, ora, completato (boolean), nota.

Per CREA, usa le stesse regole di prima:
- appuntamento: titolo, data (YYYY-MM-DD), ora (HH:MM default "09:00"), durata_minuti (default 60), categoria ("lavorativo"/"personale").
- promemoria: titolo, data (YYYY-MM-DD), ora (HH:MM o "").
- cliente: nome, azienda, is_azienda, email, telefono, indirizzo, citta, cap, provincia, piva, codice_fiscale, note.
- collaboratore: nome, qualifica, costo_orario, email, telefono, is_azienda, azienda.
- cantiere: titolo (nome cantiere), cliente_nome (SOLO nome cliente, senza articoli), indirizzo, citta, stato, data_inizio, data_fine, budget, descrizione.
- lavorazione: titolo, cantiere_nome (SOLO nome cantiere esistente), descrizione, percentuale_prevista, costo.

IMPORTANTISSIMO: per ricerca_nome, cliente_nome e cantiere_nome estrai SOLO il nome proprio senza articoli ("il", "la", "l'", "e", "per", "di", "del"). Se il comando dice "per il cliente Bianchi", estrai solo "Bianchi".
Se un campo non è menzionato, usa null. Rispondi SOLO con JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          azione: { type: "string", enum: ["crea", "aggiorna"] },
          tipo: { type: "string", enum: ["appuntamento", "promemoria", "cliente", "collaboratore", "cantiere", "lavorazione"] },
          ricerca_nome: { type: "string" },
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
          nota: { type: "string" },
          completato: { type: "boolean" },
          cliente_nome: { type: "string" },
          stato: { type: "string" },
          data_inizio: { type: "string" },
          data_fine: { type: "string" },
          budget: { type: "number" },
          descrizione: { type: "string" },
          cantiere_nome: { type: "string" },
          percentuale_prevista: { type: "number" },
          percentuale_completata: { type: "number" },
          costo: { type: "number" },
        },
        required: ["azione", "tipo"],
      },
    });

    // Pulisci valori "null"/"undefined" stringa
    Object.keys(res).forEach((k: string) => {
      const v = res[k];
      if (v === "null" || v === "undefined" || v === null || v === "") delete res[k];
    });

    const tipo: string = res.tipo;
    const azione: string = res.azione || "crea";

    // === AGGIORNA ===
    if (azione === "aggiorna") {
      const searchName = res.ricerca_nome || res.nome || res.titolo;
      if (!searchName) {
        return Response.json({ error: "Specifica il nome del record da aggiornare." }, { status: 400 });
      }

      let found: any = null;
      let updateFields: any = {};

      if (tipo === "cliente") {
        const list = await base44.entities.Cliente.list();
        found = matchByNome(searchName, list, ["nome", "azienda"]);
        updateFields = {
          ...(res.telefono ? { telefono: res.telefono } : {}),
          ...(res.email ? { email: res.email } : {}),
          ...(res.indirizzo ? { indirizzo: res.indirizzo } : {}),
          ...(res.citta ? { citta: res.citta } : {}),
          ...(res.cap ? { cap: res.cap } : {}),
          ...(res.provincia ? { provincia: res.provincia } : {}),
          ...(res.piva ? { piva: res.piva } : {}),
          ...(res.codice_fiscale ? { codice_fiscale: res.codice_fiscale } : {}),
          ...(res.note ? { note: res.note } : {}),
          ...(res.azienda ? { azienda: res.azienda } : {}),
          ...(res.is_azienda !== undefined ? { is_azienda: res.is_azienda } : {}),
        };
      } else if (tipo === "collaboratore") {
        const list = await base44.entities.Collaboratore.list();
        found = matchByNome(searchName, list, ["nome"]);
        updateFields = {
          ...(res.telefono ? { telefono: res.telefono } : {}),
          ...(res.email ? { email: res.email } : {}),
          ...(res.costo_orario !== undefined ? { costo_orario: res.costo_orario } : {}),
          ...(res.qualifica ? { qualifica: res.qualifica } : {}),
          ...(res.indirizzo ? { indirizzo: res.indirizzo } : {}),
          ...(res.citta ? { citta: res.citta } : {}),
        };
      } else if (tipo === "cantiere") {
        const list = await base44.entities.Cantiere.list();
        found = matchByNome(searchName, list, ["nome"]);
        updateFields = {
          ...(res.budget !== undefined ? { budget: res.budget } : {}),
          ...(res.stato ? { stato: res.stato } : {}),
          ...(res.data_inizio ? { data_inizio: res.data_inizio } : {}),
          ...(res.data_fine ? { data_fine: res.data_fine } : {}),
          ...(res.indirizzo ? { indirizzo: res.indirizzo } : {}),
          ...(res.citta ? { citta: res.citta } : {}),
          ...(res.descrizione ? { descrizione: res.descrizione } : {}),
        };
      } else if (tipo === "lavorazione") {
        const list = await base44.entities.Lavorazione.list();
        found = matchByNome(searchName, list, ["titolo"]);
        updateFields = {
          ...(res.stato ? { stato: res.stato } : {}),
          ...(res.percentuale_completata !== undefined ? { percentuale_completata: res.percentuale_completata } : {}),
          ...(res.percentuale_prevista !== undefined ? { percentuale_prevista: res.percentuale_prevista } : {}),
          ...(res.costo !== undefined ? { costo: res.costo } : {}),
          ...(res.descrizione ? { descrizione: res.descrizione } : {}),
        };
      } else if (tipo === "appuntamento") {
        const list = await base44.entities.Appuntamento.list();
        found = matchByNome(searchName, list, ["titolo"]);
        updateFields = {
          ...(res.data ? { data: res.data } : {}),
          ...(res.ora ? { ora: res.ora } : {}),
          ...(res.durata_minuti ? { durata_minuti: res.durata_minuti } : {}),
          ...(res.categoria ? { categoria: res.categoria } : {}),
          ...(res.stato ? { stato: res.stato } : {}),
          ...(res.note ? { note: res.note } : {}),
        };
      } else if (tipo === "promemoria") {
        const list = await base44.entities.Promemoria.list();
        found = matchByNome(searchName, list, ["titolo"]);
        updateFields = {
          ...(res.data ? { data: res.data } : {}),
          ...(res.ora ? { ora: res.ora } : {}),
          ...(res.completato !== undefined ? { completato: res.completato } : {}),
          ...(res.nota ? { nota: res.nota } : {}),
        };
      }

      if (!found) {
        return Response.json({ error: `${tipo} "${searchName}" non trovato.` }, { status: 400 });
      }
      if (Object.keys(updateFields).length === 0) {
        return Response.json({ error: "Nessun campo da aggiornare specificato nel comando." }, { status: 400 });
      }

      const entityMap: any = {
        cliente: base44.entities.Cliente,
        collaboratore: base44.entities.Collaboratore,
        cantiere: base44.entities.Cantiere,
        lavorazione: base44.entities.Lavorazione,
        appuntamento: base44.entities.Appuntamento,
        promemoria: base44.entities.Promemoria,
      };
      const record = await entityMap[tipo].update(found.id, updateFields);
      return Response.json({ tipo, azione, record, message: `${tipo} aggiornato` });
    }

    // === CREA ===
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

    return Response.json({ tipo, azione: "crea", record, message });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}