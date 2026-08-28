import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { appuntamento_id, azione, data, ora, risposta } = body;

    if (!appuntamento_id) return Response.json({ error: 'ID appuntamento mancante' }, { status: 400 });

    const app = await base44.asServiceRole.entities.Appuntamento.get(appuntamento_id);
    if (!app) return Response.json({ error: 'Appuntamento non trovato' }, { status: 404 });

    // Proposta di spostamento: supervisore, capo, operaio (non admin che modifica direttamente)
    if (azione === 'proponi') {
      if (user.role === 'admin') return Response.json({ error: 'Usa modifica diretta' }, { status: 403 });
      const updateData = { stato: 'proposto' };
      if (data) updateData.data = data;
      if (ora) updateData.ora = ora;
      await base44.asServiceRole.entities.Appuntamento.update(appuntamento_id, updateData);
      return Response.json({ ok: true });
    }

    // Risposta partecipazione: presente / assente / in_forse
    if (azione === 'rispondi') {
      if (!['presente', 'assente', 'in_forse'].includes(risposta)) {
        return Response.json({ error: 'Risposta non valida' }, { status: 400 });
      }
      let risposte = {};
      try { risposte = app.risposte_json ? JSON.parse(app.risposte_json) : {}; } catch { risposte = {}; }
      risposte[user.id] = {
        risposta,
        nome: user.full_name || user.email || '',
        data: new Date().toISOString(),
      };
      await base44.asServiceRole.entities.Appuntamento.update(appuntamento_id, {
        risposte_json: JSON.stringify(risposte),
      });
      return Response.json({ ok: true, risposte });
    }

    return Response.json({ error: 'Azione non riconosciuta' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}