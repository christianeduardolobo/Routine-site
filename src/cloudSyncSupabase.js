const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const SYNC_TABLE = (import.meta.env.VITE_SUPABASE_SYNC_TABLE || 'app_sync_states').trim();

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function getTableUrl() {
  if (!SUPABASE_URL) {
    throw new Error('Supabase não configurado.');
  }
  return `${normalizeBaseUrl(SUPABASE_URL)}/rest/v1/${encodeURIComponent(SYNC_TABLE)}`;
}

function buildHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestWithRetry(url, options = {}, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        cache: 'no-store',
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Falha de rede ao acessar a nuvem.');
}

export function isCloudSyncConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SYNC_TABLE);
}

export async function pushStateToCloud(syncKey, state) {
  const key = String(syncKey || '').trim();

  if (!key) {
    throw new Error('Informe um código de sincronização.');
  }

  if (!isCloudSyncConfigured()) {
    throw new Error('Supabase não configurado.');
  }

  const payload = JSON.parse(JSON.stringify(state));
  const updatedAt = new Date().toISOString();

  const response = await requestWithRetry(
    `${getTableUrl()}?on_conflict=sync_key`,
    {
      method: 'POST',
      headers: buildHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify([
        {
          sync_key: key,
          payload,
          updated_at: updatedAt,
        },
      ]),
    },
    2
  );

  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new Error(
      typeof body === 'string'
        ? body || `Erro ${response.status} ao enviar para a nuvem.`
        : body?.message || body?.error || `Erro ${response.status} ao enviar para a nuvem.`
    );
  }

  return updatedAt;
}

export async function pullStateFromCloud(syncKey) {
  const key = String(syncKey || '').trim();

  if (!key) {
    throw new Error('Informe um código de sincronização.');
  }

  if (!isCloudSyncConfigured()) {
    throw new Error('Supabase não configurado.');
  }

  const query = new URLSearchParams({
    select: 'payload,updated_at',
    sync_key: `eq.${key}`,
    limit: '1',
  });

  const response = await requestWithRetry(
    `${getTableUrl()}?${query.toString()}`,
    {
      method: 'GET',
      headers: buildHeaders(),
    },
    2
  );

  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new Error(
      typeof body === 'string'
        ? body || `Erro ${response.status} ao baixar da nuvem.`
        : body?.message || body?.error || `Erro ${response.status} ao baixar da nuvem.`
    );
  }

  const body = await readResponseBody(response);
  const row = Array.isArray(body) ? body[0] : null;

  if (!row || !row.payload) {
    return null;
  }

  return {
    state: row.payload,
    updatedAt: row.updated_at || '',
  };
}