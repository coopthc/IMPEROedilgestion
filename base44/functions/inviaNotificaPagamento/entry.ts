import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildEmailHtml, getImpostazioni, getModello, fillTemplate } from '../../shared/firmaEmail.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'mssg_admin', 'mssg_capo'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const pagamentoId: string = body?.pagamento_id || '';
    if (!pagamentoId) return Response.json({ error: 'Pagamento mancante' }, { status: 400 });

    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamentoId);
    if (!pagamento) return Response.json({ error: 'Pagamento non trovato' }, { status: 404 });

    const cantiere = await base44.asServiceRole.entities.Cantiere.get(pagamento.cantiere_id);
    if (!cantiere || !cantiere.cliente_id) {
      return Response.json({ error: 'Nessun cliente collegato al cantiere' }, { status: 400 });
    }

    const cliente = await base44.asServiceRole.entities.Cliente.get(cantiere.cliente_id);
    if (!cliente || !cliente.email) {
      return Response.json({ error: 'Il cliente non ha un indirizzo email' }, { status: 400 });
    }

    const [imp, modello] = await Promise.all([
      getImpostazioni(base44, user),
      getModello(base44, 'pagamento_promemoria'),
    ]);

    const importoStr = pagamento.importo != null
      ? `€ ${Number(pagamento.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      : '—';
    const scadenzaStr = pagamento.data_scadenza
      ? new Date(pagamento.data_scadenza).toLocaleDateString('it-IT')
      : '—';

    const vars: Record<string, string> = {
      '{cantiere}': cantiere.nome || '',
      '{titolo}': pagamento.titolo || '',
      '{importo}': importoStr,
      '{scadenza}': scadenzaStr,
      '{cliente}': cliente.nome || '',
    };

    const oggetto = fillTemplate(modello?.oggetto || `Promemoria pagamento: ${pagamento.titolo || ''}`, vars);
    const corpo = fillTemplate(
      modello?.corpo ||
        `Gentile ${cliente.nome || ''},\n\nLe ricordiamo il pagamento "${pagamento.titolo || ''}" relativo al cantiere ${cantiere.nome || ''}.\nImporto: ${importoStr}\nScadenza: ${scadenzaStr}\n\nCordiali saluti`,
      vars
    );

    const bodyHtml = buildEmailHtml(oggetto, corpo, imp);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: cliente.email,
      subject: oggetto,
      body: bodyHtml,
      ...(imp.ragione_sociale ? { from_name: imp.ragione_sociale } : {}),
    });

    const today = new Date().toISOString().split('T')[0];
    await base44.asServiceRole.entities.Pagamento.update(pagamentoId, {
      notifica_inviata_data: today,
      notifica_inviata_a: cliente.email,
    });

    return Response.json({ ok: true, inviata_a: cliente.email, data: today });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}