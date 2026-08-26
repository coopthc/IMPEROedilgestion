import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Leggi configurazione cloud
    const configs = await base44.asServiceRole.entities.CloudBackupConfig.list();
    if (configs.length === 0) {
      return Response.json({ error: 'Nessuna configurazione cloud trovata. Configura un provider in Backup e Cloud.' }, { status: 400 });
    }
    const config = configs[0];
    const creds = JSON.parse(config.credentials_json || '{}');
    if (!config.credentials_json || config.credentials_json === '{}') {
      return Response.json({ error: 'Credenziali non configurate. Inseriscile in Backup e Cloud.' }, { status: 400 });
    }

    // Leggi ultimo backup interno completato
    const backups = await base44.asServiceRole.entities.BackupRecord.filter({ tipo: 'interno', status: 'completato' }, '-data', 1);
    if (backups.length === 0) {
      return Response.json({ error: 'Nessun backup interno disponibile. Genera prima un backup interno.' }, { status: 400 });
    }
    const internalBackup = backups[0];
    const files = JSON.parse(internalBackup.files_json || '[]');
    if (files.length === 0) {
      return Response.json({ error: 'Il backup interno non contiene file.' }, { status: 400 });
    }

    let uploaded = 0;
    const errors = [];
    const basePath = (config.folder_path || 'EdilGestion/Backup').replace(/^\/+|\/+$/g, '');

    if (config.provider === 'google_drive') {
      const accessToken = await getGoogleAccessToken(creds.service_account_json);
      const folderId = await ensureGoogleFolder(accessToken, basePath);
      for (const file of files) {
        try {
          const subFolderId = await ensureGoogleFolder(accessToken, `${basePath}/${file.category || 'varie'}`, folderId);
          const blob = await (await fetch(file.url)).blob();
          await uploadToGoogleDrive(accessToken, subFolderId, file.name, blob);
          uploaded++;
        } catch (e) {
          errors.push(`${file.name}: ${e.message}`);
        }
      }
    } else if (config.provider === 'onedrive') {
      const accessToken = await getOnedriveAccessToken(creds.client_id, creds.client_secret, creds.tenant_id);
      for (const file of files) {
        try {
          const blob = await (await fetch(file.url)).blob();
          const path = `${basePath}/${file.category || 'varie'}/${file.name}`.replace(/\/+/g, '/');
          await uploadToOneDrive(accessToken, creds.user_email, path, blob);
          uploaded++;
        } catch (e) {
          errors.push(`${file.name}: ${e.message}`);
        }
      }
    } else if (config.provider === 'dropbox') {
      for (const file of files) {
        try {
          const blob = await (await fetch(file.url)).blob();
          const path = `/${basePath}/${file.category || 'varie'}/${file.name}`.replace(/\/+/g, '/');
          await uploadToDropbox(creds.access_token, path, blob);
          uploaded++;
        } catch (e) {
          errors.push(`${file.name}: ${e.message}`);
        }
      }
    } else {
      return Response.json({ error: `Provider ${config.provider} non ancora supportato per l'upload automatico` }, { status: 400 });
    }

    // Crea BackupRecord esterno
    await base44.asServiceRole.entities.BackupRecord.create({
      tipo: 'esterno',
      data: new Date().toISOString(),
      files_json: internalBackup.files_json,
      file_count: uploaded,
      status: uploaded === 0 ? 'errore' : 'completato',
      error_message: errors.length > 0 ? errors.join('; ').substring(0, 500) : '',
      provider: config.provider,
      cloud_folder: basePath,
    });

    // Aggiorna data ultimo backup sulla config
    await base44.asServiceRole.entities.CloudBackupConfig.update(config.id, {
      last_backup_date: new Date().toISOString(),
      last_backup_status: errors.length > 0 ? `${uploaded}/${files.length} caricati` : 'completato',
    });

    return Response.json({ uploaded, total: files.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ===== Google Drive (Service Account) ===== */

async function getGoogleAccessToken(serviceAccountJson) {
  if (!serviceAccountJson) throw new Error('Service account JSON mancante');
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const data = `${b64Url(JSON.stringify(header))}.${b64Url(JSON.stringify(payload))}`;
  const key = await importRSAPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(data));
  const jwt = `${data}.${b64UrlBuf(signature)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const token = await res.json();
  if (!token.access_token) throw new Error(`Errore auth Google: ${JSON.stringify(token)}`);
  return token.access_token;
}

function b64Url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlBuf(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importRSAPrivateKey(pem) {
  const pemContents = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const der = base64ToArrayBuffer(pemContents);
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function ensureGoogleFolder(accessToken, folderPath, parentId) {
  if (parentId === undefined) parentId = 'root';
  const parts = folderPath.split('/').filter(Boolean);
  let currentParent = parentId;
  for (const part of parts) {
    const q = encodeURIComponent(`name='${part.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      currentParent = data.files[0].id;
    } else {
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: part, mimeType: 'application/vnd.google-apps.folder', parents: [currentParent] }),
      });
      const created = await createRes.json();
      currentParent = created.id;
    }
  }
  return currentParent;
}

async function uploadToGoogleDrive(accessToken, folderId, fileName, blob) {
  const metadata = { name: fileName, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload GDrive failed: ${res.status}`);
  return res.json();
}

/* ===== OneDrive (Client Credentials) ===== */

async function getOnedriveAccessToken(clientId, clientSecret, tenantId) {
  if (!clientId || !clientSecret || !tenantId) throw new Error('Credenziali OneDrive incomplete (client_id, client_secret, tenant_id)');
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&grant_type=client_credentials`,
  });
  const token = await res.json();
  if (!token.access_token) throw new Error(`Errore auth OneDrive: ${JSON.stringify(token)}`);
  return token.access_token;
}

async function uploadToOneDrive(accessToken, userEmail, path, blob) {
  if (!userEmail) throw new Error('Email account OneDrive non configurata');
  const encodedPath = encodeURIComponent(path);
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/drive/root:/${encodedPath}:/content`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload OneDrive failed: ${res.status} ${text.substring(0, 200)}`);
  }
  return res.json();
}

/* ===== Dropbox ===== */

async function uploadToDropbox(accessToken, path, blob) {
  if (!accessToken) throw new Error('Access token Dropbox mancante');
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path, mode: 'overwrite', autorename: false }),
      'Content-Type': 'application/octet-stream',
    },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload Dropbox failed: ${res.status} ${text.substring(0, 200)}`);
  }
  return res.json();
}