import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildEmailHtml, getImpostazioni } from '../../shared/firmaEmail.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'mssg_admin'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const appuntamentoId: string = body?.appuntamento_id || '';
    const azione: string = body?.azione || ''; // 'accetta' | 'declina'
    const motivo: string = body?.motivo || '';

    if (!appuntamentoId || !azione) return Response.json({ error: 'Parametri mancanti' }, { status: 400 });

    const appuntamento = await base44.asServiceRole.entities.Appuntamento.get(appuntamentoId);
    if (!appuntamento) return Response.json({ error: 'Appuntamento non trovato' }, { status: 404 });

    // Aggiorna lo stato dell'appuntamento
    let updateData: any = {};
    if (azione === 'accetta') {
      updateData = { stato: 'programmato', tipo: 'confermato', motivo: '' };
    } else if (azione === 'declina') {
      updateData = { stato: 'annullato', motivo };
    } else {
      return Response.json({ error: 'Azione non valida' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Appuntamento.update(appuntamentoId, updateData);

    // Notifica il cliente (in-app + email)
    if (appuntamento.cliente_id) {
      const cliente = await base44.asServiceRole.entities.Cliente.get(appuntamento.cliente_id);
      if (cliente) {
        // Notifica in-app
        if (cliente.user_id) {
          try {
            await base44.asServiceRole.entities.Notifica.create({
              user_id: cliente.user_id,
              tipo: 'appuntamento',
              titolo: azione === 'accetta'
                ? `Appuntamento confermato: ${appuntamento.titolo || ''}`
                : `Richiesta declinata: ${appuntamento.titolo || ''}`,
              testo: azione === 'accetta'
                ? `Il tuo appuntamento del ${appuntamento.data || ''}${appuntamento.ora ? ' alle ' + appuntamento.ora : ''} è stato confermato.`
                : `La tua richiesta di appuntamento del ${appuntamento.data || ''} è stata declinata${motivo ? ': ' + motivo : ''}.`,
              url: '/agenda',
              letto: false,
            });
          } catch (e) {
            console.error('Errore creazione notifica cliente:', e);
          }
        }

        // Email
        if (cliente.email) {
          const imp = await getImpostazioni(base44, user);
          const dataStr = appuntamento.data
            ? new Date(appuntamento.data + 'T00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
            : '';

          const oggetto = azione === 'accetta'
            ? `Appuntamento confermato: ${appuntamento.titolo || ''}`
            : `Aggiornamento richiesta: ${appuntamento.titolo || ''}`;

          const corpo = azione === 'accetta'
            ? `Gentile ${cliente.nome || ''},\n\nLe confermiamo che il suo appuntamento è stato accettato:\n\n${appuntamento.titolo || ''}\nData: ${dataStr}${appuntamento.ora ? '\nOra: ' + appuntamento.ora : ''}\nDurata: ${appuntamento.durata_minuti || 60} minuti${appuntamento.cantiere_nome ? '\nCantiere: ' + appuntamento.cantiere_nome : ''}${appuntamento.note ? '\nNote: ' + appuntamento.note : ''}\n\nCordiali saluti`
            : `Gentile ${cliente.nome || ''},\n\nLa informiamo che la sua richiesta di appuntamento del ${dataStr} non può essere accettata${motivo ? ': ' + motivo : ''}.\n\nLa invitiamo a proporre una nuova data tramite l'app.\n\nCordiali saluti`;

          const bodyHtml = buildEmailHtml(oggetto, corpo, imp);
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: cliente.email,
              subject: oggetto,
              body: bodyHtml,
              ...(imp.ragione_sociale ? { from_name: imp.ragione_sociale } : {}),
            });
          } catch (e) {
            console.error('Errore invio email al cliente:', e);
          }
        }
      }
    }

    return Response.json({ ok: true, azione });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}