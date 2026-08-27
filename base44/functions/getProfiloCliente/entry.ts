import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'mssg_cliente') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let clienteId = user.cliente_id || (user.data && user.data.cliente_id);
    let cliente = null;

    if (clienteId) {
      try {
        cliente = await base44.asServiceRole.entities.Cliente.get(clienteId);
      } catch { /* ignora */ }
    }

    // Fallback: trova per email
    if (!cliente && user.email) {
      const clienti = await base44.asServiceRole.entities.Cliente.list();
      cliente = clienti.find(
        (c) => c.email && c.email.toLowerCase() === user.email.toLowerCase()
      ) || null;
      if (cliente) {
        clienteId = cliente.id;
        // Correggi: imposta cliente_id sull'utente se mancante
        if (!user.cliente_id && !(user.data && user.data.cliente_id)) {
          await base44.asServiceRole.entities.User.update(user.id, { cliente_id: cliente.id });
        }
        // Collega user_id sul cliente se mancante
        if (!cliente.user_id) {
          await base44.asServiceRole.entities.Cliente.update(cliente.id, { user_id: user.id });
        }
      }
    }

    if (!cliente) return Response.json({ error: 'Cliente non trovato' }, { status: 404 });

    return Response.json({ cliente });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}