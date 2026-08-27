import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { email, cliente_id, user_id } = body;

    const users = await base44.asServiceRole.entities.User.list();
    let found = null;
    if (user_id) {
      found = users.find((u) => u.id === user_id);
    }
    if (!found && email) {
      found = users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    }
    if (!found && cliente_id) {
      found = users.find((u) => u.cliente_id === cliente_id);
    }
    if (!found) return Response.json({ error: 'Utente non trovato' }, { status: 404 });
    return Response.json(found);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}