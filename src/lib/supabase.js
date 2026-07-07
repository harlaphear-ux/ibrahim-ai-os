/* ─────────────────────────────────────────────────────
   Ibrahim's AI OS — Supabase Client
   Falls back to localStorage when no key is set.
───────────────────────────────────────────────────── */
import { createClient } from '@supabase/supabase-js'

function getCredentials() {
  try {
    const keys = JSON.parse(localStorage.getItem('ibrahim_api_keys') || '{}')
    return {
      url:     keys.supabaseUrl  || '',
      anonKey: keys.supabaseKey  || '',
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
