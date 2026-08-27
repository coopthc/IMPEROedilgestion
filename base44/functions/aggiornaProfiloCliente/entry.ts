import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'mssg_cliente') {
      return Response.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const clienteId = user.cliente_id || (user.data && user.data.cliente_id);
    if (!clienteId) {
      return Response.json({ error: 'Cliente non collegato' }, { status: 403 });
    }

    const body = await req.json();

    if (body.cliente_id && body.cliente_id !== clienteId) {
      return Response.json({ error: 'Non autorizzato per questo cliente' }, { status: 403 });
    }

    // Il cliente puo aggiornare solo i propri dati di contatto;
    // i dati di fatturazione sono gestiti dall'amministratore.
    const updateData = {};
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.telefono !== undefined) updateData.telefono = body.telefono;

    const updated = await base44.asServiceRole.entities.Cliente.update(clienteId, updateData);
    return Response.json({ success: true, cliente: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}