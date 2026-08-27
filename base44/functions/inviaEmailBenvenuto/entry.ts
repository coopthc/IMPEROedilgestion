import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildFirmaHtml, getImpostazioni, escapeHtml } from '../../shared/firmaEmail.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'mssg_admin', 'mssg_capo'].includes(user.role))
      return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const email: string = body?.email;
    const nome: string = body?.nome || '';
    const tipo: string = body?.tipo || 'utente';

    if (!email) return Response.json({ error: 'Email mancante' }, { status: 400 });

    const origin = new URL(req.url).origin;
    const resetLink = `${origin}/forgot-password`;
    const imp = await getImpostazioni(base44);
    const nomeAzienda = imp.ragione_sociale || 'EdilGestion';

    const saluto = nome ? `Ciao ${escapeHtml(nome)},` : 'Ciao,';
    const tipoLabel = {
      cliente: 'come cliente',
      collaboratore: 'come collaboratore',
      amministratore: 'come amministratore',
    }[tipo] || '';

    const fraseTipo = tipoLabel ? ` Il tuo account ${tipoLabel} è stato creato` : 'Il tuo account è stato creato';

    const oggetto = `Benvenuto in ${nomeAzienda}`;
    const bodyHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#e23a8c">Benvenuto in ${escapeHtml(nomeAzienda)}</h2>
        <p>${saluto}</p>
        <p>${fraseTipo} sul nostro gestionale. Per accedere, devi impostare la tua password.</p>
        <p style="margin:24px 0">
          <a href="${resetLink}" style="display:inline-block;background:#e23a8c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
            Imposta la tua password
          </a>
        </p>
        <p style="font-size:13px;color:#888">Clicca sul pulsante, inserisci la tua email e riceverai il link per scegliere la tua password.</p>
        <p style="font-size:13px;color:#888">Oppure usa "Continua con Google" nella pagina di accesso se il tuo indirizzo email è Google.</p>
        ${buildFirmaHtml(imp)}
      </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: oggetto,
      body: bodyHtml,
      ...(imp.ragione_sociale ? { from_name: imp.ragione_sociale } : {}),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}