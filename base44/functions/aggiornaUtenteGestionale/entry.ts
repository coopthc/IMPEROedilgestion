import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ALLOWED_FIELDS = [
  'role', 'ruolo_personalizzato', 'supervisore_pagamenti', 'supervisore_chat',
  'collaboratore_id', 'cliente_id', 'cantieri_ids',
];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { user_id, email, data } = body;
    if (!data || typeof data !== 'object') {
      return Response.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Filtra solo i campi consentiti
    const updateData: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in data) updateData[key] = data[key];
    }
    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'Nessun campo valido da aggiornare' }, { status: 400 });
    }

    // Valida il ruolo se si sta impostando
    if (updateData.role) {
      const validRoles = ['admin', 'mssg_admin', 'mssg_capo', 'mssg_operaio', 'mssg_cliente', 'user'];
      if (!validRoles.includes(updateData.role)) {
        return Response.json({ error: 'Ruolo non valido' }, { status: 400 });
      }
      // Solo admin puo' assegnare il ruolo admin
      if (updateData.role === 'admin' && caller.role !== 'admin') {
        return Response.json({ error: 'Non puoi assegnare questo ruolo' }, { status: 403 });
      }
      // mssg_admin non puo' assegnare admin (gia' coperto sopra); puo' assegnare gli altri
      // mssg_capo puo' solo assegnare mssg_operaio o mssg_capo
      if (caller.role === 'mssg_capo' && !['mssg_operaio', 'mssg_capo'].includes(updateData.role)) {
        return Response.json({ error: 'Non puoi assegnare questo ruolo' }, { status: 403 });
      }
    }

    // Trova l'utente target
    const users = await base44.asServiceRole.entities.User.list();
    let target = null;
    if (user_id) {
      target = users.find((u) => u.id === user_id);
    }
    if (!target && email) {
      target = users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    }
    if (!target) return Response.json({ error: 'Utente non trovato' }, { status: 404 });

    await base44.asServiceRole.entities.User.update(target.id, updateData);
    return Response.json({ ok: true, user_id: target.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}