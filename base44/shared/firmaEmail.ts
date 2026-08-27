export function escapeHtml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildFirmaHtml(imp: any): string {
  const riga = (label: string, val: string) =>
    val
      ? `<tr><td style="color:#888;font-size:12px;padding-right:8px;white-space:nowrap;vertical-align:top">${label}:</td><td style="font-size:12px;vertical-align:top">${val}</td></tr>`
      : '';
  const indirizzo = [imp?.indirizzo, [imp?.cap, imp?.citta].filter(Boolean).join(' '), imp?.provincia]
    .filter(Boolean)
    .join(', ');
  const dati = [
    riga('P.IVA', imp?.piva),
    riga('C.F.', imp?.codice_fiscale),
    riga('Sede', indirizzo),
    riga('Tel', imp?.telefono),
    riga('Email', imp?.email_azienda),
  ].join('');
  const logo = imp?.logo_url
    ? `<img src="${imp.logo_url}" alt="logo" style="max-height:50px;max-width:160px;margin-bottom:6px;display:block" />`
    : '';
  const nome = imp?.ragione_sociale
    ? `<div style="font-weight:bold;color:#e23a8c;font-size:14px;margin-bottom:4px">${imp.ragione_sociale}</div>`
    : '';
  return `
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #eee">
      ${logo}
      ${nome}
      <table style="border-collapse:collapse">${dati}</table>
    </div>`;
}

export function buildEmailHtml(oggetto: string, corpo: string, imp: any): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#e23a8c">${escapeHtml(oggetto)}</h2>
    <p style="white-space:pre-line">${escapeHtml(corpo).replace(/\n/g, '<br>')}</p>
    ${buildFirmaHtml(imp)}
  </div>`;
}

export async function getImpostazioni(base44: any, user?: any): Promise<any> {
  const list = await base44.asServiceRole.entities.ImpostazioneApp.list();
  const imp = list[0] || {};
  // Merge con i dati del profilo utente corrente (DatiPersonali)
  // per avere sempre la firma aggiornata con i dati inseriti dall'utente
  try {
    const u = user || await base44.auth.me();
    if (u) {
      const d = u.data || {};
      const isAzienda = u.is_azienda ?? d.is_azienda;
      const ragioneSociale = isAzienda ? (u.azienda || d.azienda) : u.full_name;
      return {
        ...imp,
        ragione_sociale: ragioneSociale || imp.ragione_sociale || '',
        logo_url: u.logo_url || d.logo_url || imp.logo_url || '',
        piva: u.piva || d.piva || imp.piva || '',
        codice_fiscale: u.codice_fiscale || d.codice_fiscale || imp.codice_fiscale || '',
        indirizzo: u.indirizzo || d.indirizzo || imp.indirizzo || '',
        citta: u.citta || d.citta || imp.citta || '',
        cap: u.cap || d.cap || imp.cap || '',
        provincia: u.provincia || d.provincia || imp.provincia || '',
        telefono: u.telefono || d.telefono || imp.telefono || '',
        email_azienda: u.email || imp.email_azienda || '',
      };
    }
  } catch (e) {
    console.error('Errore lettura profilo utente per firma email:', e);
  }
  return imp;
}

export async function getModello(base44: any, chiave: string): Promise<any> {
  const list = await base44.asServiceRole.entities.ModelloEmail.filter({ chiave });
  return list[0] || null;
}

export function fillTemplate(text: string, vars: Record<string, string>): string {
  return Object.keys(vars).reduce((acc, k) => acc.split(k).join(escapeHtml(vars[k])), text || '');
}