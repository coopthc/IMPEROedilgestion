import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const RUOLO_MAP = {
  capo_cantiere: 'mssg_capo',
  operaio: 'mssg_operaio',
  tecnico: 'mssg_operaio',
  amministrazione: 'mssg_admin',
  altro: 'mssg_operaio',
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Amministratori e supervisori non necessitano di abbinamento
    if (user.role === 'admin' || user.role === 'mssg_admin') {
      return Response.json({ has_record: true, role: user.role });
    }

    const myClienteId = user.cliente_id || (user.data && user.data.cliente_id);
    const myCollabId = user.collaboratore_id || (user.data && user.data.collaboratore_id);
    if (myClienteId || myCollabId) {
      // Ricalcola cantieri_ids come rete di sicurezza (il cliente potrebbe avere cantieri non ancora sincronizzati)
      const cantieri = await base44.asServiceRole.entities.Cantiere.list();
      let cantieriIds = [];
      if (myClienteId) {
        cantieriIds = cantieri.filter((c) => c.cliente_id === myClienteId).map((c) => c.id);
      } else if (myCollabId) {
        cantieriIds = cantieri.filter((c) => {
          const squadIds = (c.collaboratori_ids || '').split(',').filter(Boolean);
          return squadIds.includes(myCollabId) || c.responsabile_id === myCollabId;
        }).map((c) => c.id);
      }
      const currentIds = (user.cantieri_ids || (user.data && user.data.cantieri_ids) || []).slice().sort();
      const newIds = cantieriIds.slice().sort();
      if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
        await base44.asServiceRole.entities.User.update(user.id, { cantieri_ids: cantieriIds });
        for (const cant of cantieri.filter((c) => cantieriIds.includes(c.id))) {
          const existing = Array.isArray(cant.utenti_ids) ? cant.utenti_ids : [];
          if (!existing.includes(user.id)) {
            await base44.asServiceRole.entities.Cantiere.update(cant.id, { utenti_ids: [...existing, user.id] });
          }
        }
        return Response.json({ abbinato: true, ricalcolato: true, cantieri: cantieriIds.length });
      }
      return Response.json({ has_record: true, already: true });
    }

    const [clienti, collaboratori, cantieri, users] = await Promise.all([
      base44.asServiceRole.entities.Cliente.list(),
      base44.asServiceRole.entities.Collaboratore.list(),
      base44.asServiceRole.entities.Cantiere.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    // 1. Abbinamento per email come Cliente
    const clienteMatch = clienti.find(
      (c) => c.email && c.email.toLowerCase() === user.email.toLowerCase()
    );
    if (clienteMatch && (!clienteMatch.user_id || clienteMatch.user_id === user.id)) {
      const cantieriIds = cantieri
        .filter((c) => c.cliente_id === clienteMatch.id)
        .map((c) => c.id);
      await base44.asServiceRole.entities.User.update(user.id, {
        role: 'mssg_cliente',
        cliente_id: clienteMatch.id,
        cantieri_ids: cantieriIds,
      });
      if (!clienteMatch.user_id) {
        await base44.asServiceRole.entities.Cliente.update(clienteMatch.id, { user_id: user.id });
      }
      for (const cant of cantieri.filter((c) => c.cliente_id === clienteMatch.id)) {
        const existing = Array.isArray(cant.utenti_ids) ? cant.utenti_ids : [];
        if (!existing.includes(user.id)) {
          await base44.asServiceRole.entities.Cantiere.update(cant.id, {
            utenti_ids: [...existing, user.id],
          });
        }
      }
      return Response.json({ abbinato: true, tipo: 'cliente', cantieri: cantieriIds.length });
    }

    // 2. Abbinamento per email come Collaboratore
    const collabMatch = collaboratori.find(
      (c) => c.email && c.email.toLowerCase() === user.email.toLowerCase()
    );
    if (collabMatch && (!collabMatch.user_id || collabMatch.user_id === user.id)) {
      const ruolo = RUOLO_MAP[collabMatch.qualifica] || 'mssg_operaio';
      const cantieriIds = cantieri
        .filter((c) => {
          const squadIds = (c.collaboratori_ids || '').split(',').filter(Boolean);
          return squadIds.includes(collabMatch.id) || c.responsabile_id === collabMatch.id;
        })
        .map((c) => c.id);
      await base44.asServiceRole.entities.User.update(user.id, {
        role: ruolo,
        collaboratore_id: collabMatch.id,
        cantieri_ids: cantieriIds,
      });
      if (!collabMatch.user_id) {
        await base44.asServiceRole.entities.Collaboratore.update(collabMatch.id, { user_id: user.id });
      }
      for (const cant of cantieri) {
        const squadIds = (cant.collaboratori_ids || '').split(',').filter(Boolean);
        if (squadIds.includes(collabMatch.id) || cant.responsabile_id === collabMatch.id) {
          const existing = Array.isArray(cant.utenti_ids) ? cant.utenti_ids : [];
          if (!existing.includes(user.id)) {
            await base44.asServiceRole.entities.Cantiere.update(cant.id, {
              utenti_ids: [...existing, user.id],
            });
          }
        }
      }
      return Response.json({ abbinato: true, tipo: 'collaboratore', cantieri: cantieriIds.length });
    }

    // 3. Nessun abbinamento possibile: notifica gli amministratori (una sola volta)
    const adminTargets = users.filter((u) => u.role === 'admin' || u.role === 'mssg_admin');
    if (adminTargets.length === 0) {
      return Response.json({ has_record: false, notified: 0 });
    }
    const existing = await base44.asServiceRole.entities.Notifica.filter({
      url: '/utenti',
      testo: user.email,
    });
    if (existing.length > 0) {
      return Response.json({ has_record: false, notified: 0, already: true });
    }
    await base44.asServiceRole.entities.Notifica.bulkCreate(
      adminTargets.map((a) => ({
        user_id: a.id,
        tipo: 'aggiornamento',
        titolo: 'Accesso senza record',
        testo: user.email,
        url: '/utenti',
        letto: false,
      }))
    );
    return Response.json({ has_record: false, notified: adminTargets.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}