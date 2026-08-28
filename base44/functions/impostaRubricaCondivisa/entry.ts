import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Imposta il flag "rubrica_condivisa" su un utente (solo admin) e propaga
// il valore a tutti i contatti di proprietà di quell'utente, così che la
// condivisione sia effettiva anche sui contatti già esistenti.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: solo amministratori' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.user_id;
    const condivisa = !!body?.condivisa;
    if (!targetUserId) {
      return Response.json({ error: 'user_id obbligatorio' }, { status: 400 });
    }

    // 1) Aggiorna il flag sull'utente target
    await base44.asServiceRole.entities.User.update(targetUserId, {
      rubrica_condivisa: condivisa,
    });

    // 2) Propaga a tutti i contatti esistenti di quell'utente
    await base44.asServiceRole.entities.Contatto.updateMany(
      { created_by_id: targetUserId },
      { $set: { condivisa } }
    );

    return Response.json({ ok: true, user_id: targetUserId, condivisa });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}