import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'mssg_cliente') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const appuntamentoId: string = body?.appuntamento_id || '';
    if (!appuntamentoId) return Response.json({ error: 'Parametri mancanti' }, { status: 400 });

    const appuntamento = await base44.asServiceRole.entities.Appuntamento.get(appuntamentoId);
    if (!appuntamento) return Response.json({ error: 'Appuntamento non trovato' }, { status: 404 });

    // Verifica che l'appuntamento appartenga a questo cliente
    const myClienteId = user.cliente_id || (user.data && user.data.cliente_id);
    const utentiIds = Array.isArray(appuntamento.utenti_ids) ? appuntamento.utenti_ids : [];
    const isMine = (myClienteId && appuntamento.cliente_id === myClienteId) || utentiIds.includes(user.id);
    if (!isMine) return Response.json({ error: 'Non autorizzato per questo appuntamento' }, { status: 403 });

    // Solo gli appuntamenti proposti o fissati dall'admin possono essere confermati dal cliente
    if (appuntamento.stato !== 'proposto' && appuntamento.tipo !== 'admin_fissato') {
      return Response.json({ error: 'Appuntamento non confermabile' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Appuntamento.update(appuntamentoId, {
      stato: 'programmato',
      tipo: 'confermato',
    });

    // Notifica gli amministratori
    try {
      const users = await base44.asServiceRole.entities.User.list();
      const admins = users.filter((u) => u.role === 'admin' || u.role === 'mssg_admin');
      if (admins.length > 0) {
        await base44.asServiceRole.entities.Notifica.bulkCreate(
          admins.map((a) => ({
            user_id: a.id,
            tipo: 'appuntamento',
            titolo: `Appuntamento confermato dal cliente: ${appuntamento.titolo || ''}`,
            testo: `Il cliente ha confermato l'appuntamento del ${appuntamento.data || ''}${appuntamento.ora ? ' alle ' + appuntamento.ora : ''}.`,
            url: '/agenda',
            letto: false,
          }))
        );
      }
    } catch (e) {
      console.error('Errore notifica admin:', e);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}