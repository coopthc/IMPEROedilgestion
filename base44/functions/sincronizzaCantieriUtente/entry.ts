import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const cantiereId = body.cantiere_id;

    const [cantieri, collaboratori, users] = await Promise.all([
      base44.asServiceRole.entities.Cantiere.list(),
      base44.asServiceRole.entities.Collaboratore.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    // Mappa collaboratore_id -> user_id
    const collabToUser = {};
    for (const c of collaboratori) {
      if (c.user_id) collabToUser[c.id] = c.user_id;
    }

    const affectedUserIds = new Set();
    if (cantiereId) {
      const cant = cantieri.find((c) => c.id === cantiereId);
      if (!cant) return Response.json({ error: 'Cantiere non trovato' }, { status: 404 });
      const squadIds = (cant.collaboratori_ids || '').split(',').filter(Boolean);
      if (cant.responsabile_id && !squadIds.includes(cant.responsabile_id)) squadIds.push(cant.responsabile_id);
      for (const cid of squadIds) {
        const uid = collabToUser[cid];
        if (uid) affectedUserIds.add(uid);
      }
      if (cant.cliente_id) {
        const cu = users.find((u) => (u.cliente_id || (u.data && u.data.cliente_id)) === cant.cliente_id);
        if (cu) affectedUserIds.add(cu.id);
      }
    } else {
      // Backfill completo
      for (const u of users) affectedUserIds.add(u.id);
    }

    let synced = 0;
    for (const uid of affectedUserIds) {
      const u = users.find((x) => x.id === uid);
      if (!u) continue;
      const myCollabId = u.collaboratore_id || (u.data && u.data.collaboratore_id);
      const myClienteId = u.cliente_id || (u.data && u.data.cliente_id);
      const ids = [];
      for (const cant of cantieri) {
        const squadIds = (cant.collaboratori_ids || '').split(',').filter(Boolean);
        if (myCollabId && squadIds.includes(myCollabId)) {
          ids.push(cant.id);
        } else if (myClienteId && cant.cliente_id === myClienteId) {
          ids.push(cant.id);
        }
      }
      try {
        await base44.asServiceRole.entities.User.update(uid, { cantieri_ids: ids });
        synced++;
      } catch (e) {
        // ignora singoli errori utente
      }
    }

    // Sincronizza anche utenti_ids su ogni cantiere (membership basata su user.id, robusta per RLS)
    const collabToUserMap = {};
    for (const c of collaboratori) {
      if (c.user_id) collabToUserMap[c.id] = c.user_id;
    }
    const clienteToUserMap = {};
    for (const u of users) {
      const cid = u.cliente_id || (u.data && u.data.cliente_id);
      if (cid) clienteToUserMap[cid] = u.id;
    }
    const cantieriDaAggiornare = cantiereId
      ? cantieri.filter((c) => c.id === cantiereId)
      : cantieri;
    for (const cant of cantieriDaAggiornare) {
      const squadIds = (cant.collaboratori_ids || '').split(',').filter(Boolean);
      if (cant.responsabile_id && !squadIds.includes(cant.responsabile_id)) squadIds.push(cant.responsabile_id);
      const utentiIds = new Set();
      for (const cid of squadIds) {
        const uid = collabToUserMap[cid];
        if (uid) utentiIds.add(uid);
      }
      if (cant.cliente_id) {
        const cu = clienteToUserMap[cant.cliente_id];
        if (cu) utentiIds.add(cu);
      }
      try {
        await base44.asServiceRole.entities.Cantiere.update(cant.id, { utenti_ids: Array.from(utentiIds) });
      } catch (e) {
        // ignora singoli errori cantiere
      }
    }

    return Response.json({ synced, affected: affectedUserIds.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}