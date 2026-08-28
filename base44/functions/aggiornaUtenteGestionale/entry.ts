import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ADMIN_FIELDS = new Set([
  'role', 'ruolo_personalizzato', 'supervisore_pagamenti', 'supervisore_chat',
  'supervisore_tutti_cantieri', 'collaboratore_id', 'cliente_id', 'cantieri_ids',
]);

// mssg_capo puo' impostare solo role, collaboratore_id, cliente_id (serve per invitare clienti/collaboratori)
// NON puo' toccare cantieri_ids, supervisore_*, ruolo_personalizzato
const CAPO_FIELDS = new Set(['role', 'collaboratore_id', 'cliente_id']);

const CAPO_ALLOWED_ROLES = new Set(['mssg_operaio', 'mssg_capo', 'mssg_cliente']);

const AUTHORIZED_ROLES = new Set(['admin', 'mssg_admin', 'mssg_capo']);

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Autorizzazione generale: solo admin, mssg_admin, mssg_capo possono usare questa funzione
    const callerRole = caller.role;
    if (!AUTHORIZED_ROLES.has(callerRole)) {
      return Response.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, email, data } = body;
    if (!data || typeof data !== 'object') {
      return Response.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Determina quali campi il chiamante puo' modificare
    const allowedFields = callerRole === 'mssg_capo' ? CAPO_FIELDS : ADMIN_FIELDS;
    const updateData: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (allowedFields.has(key)) updateData[key] = data[key];
    }
    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'Nessun campo autorizzato per il tuo ruolo' }, { status: 403 });
    }

    // Valida il ruolo se si sta impostando
    if (updateData.role) {
      const validRoles = ['admin', 'mssg_admin', 'mssg_capo', 'mssg_operaio', 'mssg_cliente', 'user'];
      if (!validRoles.includes(updateData.role)) {
        return Response.json({ error: 'Ruolo non valido' }, { status: 400 });
      }
      // Solo admin puo' assegnare il ruolo admin
      if (updateData.role === 'admin' && callerRole !== 'admin') {
        return Response.json({ error: 'Non puoi assegnare questo ruolo' }, { status: 403 });
      }
      // mssg_admin non puo' assegnare admin (gia' coperto sopra); puo' assegnare gli altri
      // mssg_capo puo' solo assegnare mssg_operaio, mssg_capo, mssg_cliente
      if (callerRole === 'mssg_capo' && !CAPO_ALLOWED_ROLES.has(updateData.role)) {
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