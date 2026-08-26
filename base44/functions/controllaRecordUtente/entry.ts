import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Amministratori e supervisori non necessitano di record collegati
    if (user.role === 'admin' || user.role === 'mssg_admin') {
      return Response.json({ has_record: true, role: user.role });
    }

    // Verifica record collegato via campi utente o query diretta (RLS-safe via service role)
    if (user.collaboratore_id || user.cliente_id) {
      return Response.json({ has_record: true });
    }

    const [collaboratori, clienti] = await Promise.all([
      base44.asServiceRole.entities.Collaboratore.filter({ user_id: user.id }),
      base44.asServiceRole.entities.Cliente.filter({ user_id: user.id }),
    ]);
    if (collaboratori.length > 0 || clienti.length > 0) {
      return Response.json({ has_record: true });
    }

    // Nessun record: notifica gli amministratori (una sola volta per email)
    const admins = await base44.asServiceRole.entities.User.list();
    const adminTargets = admins.filter(
      (u) => u.role === 'admin' || u.role === 'mssg_admin'
    );
    if (adminTargets.length === 0) {
      return Response.json({ has_record: false, notified: 0 });
    }

    // Dedupe: salta se esiste già una notifica per questa email
    const existing = await base44.asServiceRole.entities.Notifica.filter({
      url: '/utenti',
      testo: user.email,
    });
    if (existing.length > 0) {
      return Response.json({ has_record: false, notified: 0, already: true });
    }

    const nome = user.full_name || user.email;
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

    return Response.json({ has_record: false, notified: adminTargets.length, nome });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}