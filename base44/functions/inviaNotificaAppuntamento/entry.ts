import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildEmailHtml, getImpostazioni, getModello, fillTemplate } from '../../shared/firmaEmail.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'mssg_admin', 'mssg_capo'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const appuntamentoId: string = body?.appuntamento_id || '';
    if (!appuntamentoId) return Response.json({ error: 'Appuntamento mancante' }, { status: 400 });

    const appuntamento = await base44.asServiceRole.entities.Appuntamento.get(appuntamentoId);
    if (!appuntamento) return Response.json({ error: 'Appuntamento non trovato' }, { status: 404 });

    // Raccogli destinatari: cliente + collaboratori partecipanti
    const destinatari: { email: string; nome: string }[] = [];

    if (appuntamento.cliente_id) {
      const cliente = await base44.asServiceRole.entities.Cliente.get(appuntamento.cliente_id);
      if (cliente?.email) {
        destinatari.push({ email: cliente.email, nome: cliente.nome || '' });
      }
    }

    const collabIds = (appuntamento.partecipanti_ids || '').split(',').filter(Boolean);
    const notificheInApp: { user_id: string; tipo: string; titolo: string; testo: string; url: string; letto: boolean }[] = [];
    if (collabIds.length > 0) {
      const collaboratori = await base44.asServiceRole.entities.Collaboratore.list();
      for (const c of collaboratori) {
        if (!collabIds.includes(c.id)) continue;
        if (c.email) {
          destinatari.push({ email: c.email, nome: c.nome || '' });
        }
        if (c.user_id) {
          notificheInApp.push({
            user_id: c.user_id,
            tipo: 'appuntamento',
            titolo: `Appuntamento: ${appuntamento.titolo || ''}`,
            testo: `${appuntamento.data || ''} alle ${appuntamento.ora || ''}${appuntamento.cantiere_nome ? ' — ' + appuntamento.cantiere_nome : ''}`,
            url: '/agenda',
            letto: false,
          });
        }
      }
      // Crea le notifiche in-app lato server (affidabile, bypassa RLS)
      if (notificheInApp.length > 0) {
        try {
          await base44.asServiceRole.entities.Notifica.bulkCreate(notificheInApp);
        } catch (e) {
          console.error('Errore creazione notifiche in-app:', e);
        }
      }
    }

    if (destinatari.length === 0) {
      return Response.json({ ok: false, message: 'Nessun destinatario con email valida' });
    }

    const [imp, modello] = await Promise.all([
      getImpostazioni(base44),
      getModello(base44, 'appuntamento_nuovo'),
    ]);

    const dataStr = appuntamento.data
      ? new Date(appuntamento.data + 'T00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    const baseVars: Record<string, string> = {
      '{titolo}': appuntamento.titolo || '',
      '{data}': dataStr,
      '{ora}': appuntamento.ora || '',
      '{durata}': `${appuntamento.durata_minuti || 60} minuti`,
      '{cantiere}': appuntamento.cantiere_nome || '',
      '{note}': appuntamento.note || '',
    };

    const oggetto = fillTemplate(modello?.oggetto || `Appuntamento: ${appuntamento.titolo || ''}`, baseVars);
    const corpoTemplate = modello?.corpo ||
      `Gentile {nome},\n\nLe confermiamo l'appuntamento:\n\n{titolo}\nData: {data}\nOra: {ora}\nDurata: {durata}{cantiere_riga}{note_riga}\n\nCordiali saluti`;

    // Invia email singolarmente a ogni destinatario (nessuno vede gli altri)
    const risultati: { email: string; ok: boolean }[] = [];
    for (const dest of destinatari) {
      const vars = {
        ...baseVars,
        '{nome}': dest.nome,
        '{cantiere_riga}': appuntamento.cantiere_nome ? `\nCantiere: ${appuntamento.cantiere_nome}` : '',
        '{note_riga}': appuntamento.note ? `\nNote: ${appuntamento.note}` : '',
      };
      const corpo = fillTemplate(corpoTemplate, vars);
      const bodyHtml = buildEmailHtml(oggetto, corpo, imp);
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: dest.email,
          subject: oggetto,
          body: bodyHtml,
          ...(imp.ragione_sociale ? { from_name: imp.ragione_sociale } : {}),
        });
        risultati.push({ email: dest.email, ok: true });
      } catch (e) {
        risultati.push({ email: dest.email, ok: false });
      }
    }

    const inviate = risultati.filter((r) => r.ok).length;
    return Response.json({ ok: true, inviate, totali: destinatari.length, risultati });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}