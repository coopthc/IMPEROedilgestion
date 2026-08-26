import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildFirmaHtml, getImpostazioni, getModello, fillTemplate, escapeHtml } from '../../shared/firmaEmail.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'mssg_admin', 'mssg_capo'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const collaboratoriIds: string[] = body?.collaboratoriIds || [];
    const titolo: string = body?.titolo || '';
    const testo: string = body?.testo || '';
    const url: string = body?.url || '';

    if (!collaboratoriIds.length || !titolo) {
      return Response.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    const all = await base44.asServiceRole.entities.Collaboratore.list();
    const targets = all.filter(
      (c: any) => collaboratoriIds.includes(c.id) && !c.user_id && c.email
    );

    if (targets.length === 0) {
      return Response.json({ inviate: 0 });
    }

    const [imp, modello] = await Promise.all([
      getImpostazioni(base44),
      getModello(base44, 'collaboratore_notifica'),
    ]);

    const vars: Record<string, string> = {
      '{titolo}': titolo,
      '{testo}': testo,
    };
    const oggetto = fillTemplate(modello?.oggetto || titolo, vars);
    const corpoBase = fillTemplate(modello?.corpo || testo, vars);
    const link = url ? `<p><a href="${escapeHtml(url)}">Apri nell'app</a></p>` : '';

    const bodyHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#e23a8c">${oggetto}</h2>
        <p style="white-space:pre-line">${corpoBase.replace(/\n/g, '<br>')}</p>
        ${link}
        ${buildFirmaHtml(imp)}
      </div>`;

    let inviate = 0;
    for (const c of targets) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: c.email,
          subject: oggetto,
          body: bodyHtml,
          ...(imp.ragione_sociale ? { from_name: imp.ragione_sociale } : {}),
        });
        inviate++;
      } catch (e) {
        console.error('Invio email fallito per', c.email, e);
      }
    }

    return Response.json({ inviate });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}