import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SYNC_TABLE = import.meta.env.VITE_SUPABASE_SYNC_TABLE || 'app_sync_states';

let client;

export function isCloudSyncConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getClient() {
  if (!isCloudSyncConfigured()) {
    throw new Error('Supabase não configurado.');
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export async function pushStateToCloud(syncKey, state) {
  const key = String(syncKey || '').trim();
  if (!key) throw new Error('Informe um código de sincronização.');

  const updatedAt = new Date().toISOString();
  const payload = JSON.parse(JSON.stringify(state));

  const { error } = await getClient()
    .from(SYNC_TABLE)
    .upsert({
      sync_key: key,
      payload,
      updated_at: updatedAt,
    }, { onConflict: 'sync_key' });

  if (error) throw error;
  return updatedAt;
}

export async function pullStateFromCloud(syncKey) {
  const key = String(syncKey || '').trim();
  if (!key) throw new Error('Informe um código de sincronização.');

  const { data, error } = await getClient()
    .from(SYNC_TABLE)
    .select('payload, updated_at')
    .eq('sync_key', key)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    state: data.payload,
    updatedAt: data.updated_at || '',
  };
}