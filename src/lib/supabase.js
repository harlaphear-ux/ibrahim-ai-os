/* ─────────────────────────────────────────────────────
   Ibrahim's AI OS — Supabase Client
   Falls back to localStorage when no key is set.
───────────────────────────────────────────────────── */
import { createClient } from '@supabase/supabase-js'

function getCredentials() {
  try {
    // Priority: Environment Variables -> LocalStorage -> Empty
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const keys = JSON.parse(localStorage.getItem('ibrahim_api_keys') || '{}');
    
    return {
      url:     envUrl || keys.supabaseUrl || '',
      anonKey: envKey || keys.supabaseKey || '',
    }
  } catch {
    return { url: '', anonKey: '' }
  }
}

let _client = null

export function getSupabase() {
  const { url, anonKey } = getCredentials()
  if (!url || !anonKey) return null
  if (_client) return _client
  _client = createClient(url, anonKey)
  return _client
}

export function resetClient() {
  _client = null
}

export function isSupabaseReady() {
  const { url, anonKey } = getCredentials()
  return !!(url && anonKey)
}
