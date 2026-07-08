/* ─────────────────────────────────────────────────────
   Ibrahim's AI OS — Unified Data Layer

   Strategy: localStorage first (instant, offline-safe)
   + Supabase sync in background (when key is set).

   This means:
   • App always works offline / without Supabase key
   • When Supabase key is added in Settings, it auto-
     syncs everything to the cloud immediately
   • Switch device? Sign in → all data reappears
───────────────────────────────────────────────────── */
import { getSupabase, isSupabaseReady } from './supabase'

/* ── localStorage helpers ───────────────────────────── */
const lsGet  = (key, fb) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)) } catch { return fb } }
const lsSet  = (key, val) => localStorage.setItem(key, JSON.stringify(val))

/* ── Table map: localStorage key → Supabase table ─── */
const TABLE = {
  'ai_os_pipeline_leads':  'leads',
  'ai_os_clients':         'clients',
  'ai_os_planner_tasks':   'planner_tasks',
  'ai_os_content_drafts':  'drafts',
  'ai_os_content_ideas':   'ideas',
  'ai_os_vault_notes':     'vault_items',
  'ai_os_vault_sops':      'vault_items',
  'ai_os_vault_frameworks':'vault_items',
  'ai_os_vault_ideas':     'vault_items',
  'ai_os_vault_revenue':   'revenue',
  'ai_os_competitors':     'competitors',
  'ibrahim_voice_bible':   'voice_bible',
}

/* ── Push a full array to Supabase (upsert by id) ───── */
async function pushToSupabase(table, rows, extra = {}) {
  const sb = getSupabase()
  if (!sb || !rows) return
  try {
    const payload = Array.isArray(rows)
      ? rows.map(r => ({ ...r, ...extra, synced_at: new Date().toISOString() }))
      : [{ ...rows, ...extra, synced_at: new Date().toISOString() }]
    await sb.from(table).upsert(payload, { onConflict: 'id' })
  } catch (e) {
    console.warn('[DB] push failed:', e.message)
  }
}

/* ── Pull from Supabase and overwrite localStorage ──── */
async function pullFromSupabase(table, lsKey, transform) {
  const sb = getSupabase()
  if (!sb) return null
  try {
    const { data, error } = await sb.from(table).select('*').order('created_at', { ascending: false })
    if (error || !data) return null
    const result = transform ? transform(data) : data
    lsSet(lsKey, result)
    return result
  } catch (e) {
    console.warn('[DB] pull failed:', e.message)
    return null
  }
}

/* ═══════════════════════════════════════════════════
   PUBLIC API — use these everywhere instead of
   raw localStorage calls
═══════════════════════════════════════════════════ */

/* ── LEADS ──────────────────────────────────────────── */
export const Leads = {
  load() {
    return lsGet('ai_os_pipeline_leads', [])
  },
  save(arr) {
    lsSet('ai_os_pipeline_leads', arr)
    pushToSupabase('leads', arr)
  },
  async pull() {
    return pullFromSupabase('leads', 'ai_os_pipeline_leads', data => data)
  },
}

/* ── CLIENTS ────────────────────────────────────────── */
export const Clients = {
  load() {
    return lsGet('ai_os_clients', [])
  },
  save(arr) {
    lsSet('ai_os_clients', arr)
    pushToSupabase('clients', arr)
  },
  async pull() {
    return pullFromSupabase('clients', 'ai_os_clients', data => data)
  },
}

/* ── PLANNER TASKS ──────────────────────────────────── */
export const Planner = {
  load() {
    const data = lsGet('ai_os_planner_tasks', {})
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {}
  },
  save(obj) {
    if (!obj || typeof obj !== 'object') return
    lsSet('ai_os_planner_tasks', obj)
    // Flatten date-keyed object into rows for Supabase
    const rows = []
    Object.entries(obj).forEach(([date, tasks]) => {
      if (Array.isArray(tasks)) {
        tasks.forEach(t => {
          if (t && typeof t === 'object') {
            rows.push({ ...t, date })
          }
        })
      }
    })
    if (rows.length > 0) {
      pushToSupabase('planner_tasks', rows)
    }
  },
  async pull() {
    const sb = getSupabase()
    if (!sb) return null
    try {
      const { data, error } = await sb.from('planner_tasks').select('*')
      if (error) throw error
      if (!data) return null
      // Re-group by date
      const grouped = {}
      data.forEach(t => {
        const d = t.date
        if (d) {
          if (!grouped[d]) grouped[d] = []
          grouped[d].push(t)
        }
      })
      lsSet('ai_os_planner_tasks', grouped)
      return grouped
    } catch (e) {
      console.warn('[DB] Planner pull failed:', e.message)
      return null
    }
  },
}

/* ── CONTENT DRAFTS ─────────────────────────────────── */
export const Drafts = {
  load() {
    return lsGet('ai_os_content_drafts', [])
  },
  save(arr) {
    lsSet('ai_os_content_drafts', arr)
    pushToSupabase('drafts', arr)
  },
  async pull() {
    return pullFromSupabase('drafts', 'ai_os_content_drafts', data => data)
  },
}

/* ── CONTENT IDEAS ──────────────────────────────────── */
export const Ideas = {
  load() {
    return lsGet('ai_os_content_ideas', [])
  },
  save(arr) {
    lsSet('ai_os_content_ideas', arr)
    pushToSupabase('ideas', arr)
  },
}

/* ── VAULT NOTES (generic: notes / sops / frameworks / ideas) ── */
export const VaultItems = {
  load(lsKey) {
    return lsGet(lsKey, [])
  },
  save(lsKey, arr) {
    lsSet(lsKey, arr)
    const typeMap = {
      'ai_os_vault_notes':      'note',
      'ai_os_vault_sops':       'sop',
      'ai_os_vault_frameworks': 'framework',
      'ai_os_vault_ideas':      'idea',
    }
    const type = typeMap[lsKey]
    pushToSupabase('vault_items', arr.map(i => ({ ...i, item_type: type })))
  },
}

/* ── VOICE BIBLE ────────────────────────────────────── */
export const VoiceBible = {
  load() {
    return lsGet('ibrahim_voice_bible', { tone:'', beliefs:'', banned:'', writing:'', icp:'', examples:'' })
  },
  save(obj) {
    lsSet('ibrahim_voice_bible', obj)
    const sb = getSupabase()
    if (!sb) return
    sb.from('voice_bible').upsert({ id: 'ibrahim', ...obj, updated_at: new Date().toISOString() }).then(() => {})
  },
  async pull() {
    const sb = getSupabase()
    if (!sb) return null
    try {
      const { data } = await sb.from('voice_bible').select('*').eq('id', 'ibrahim').single()
      if (data) lsSet('ibrahim_voice_bible', data)
      return data
    } catch { return null }
  },
}

/* ── REVENUE ────────────────────────────────────────── */
export const Revenue = {
  load() {
    return lsGet('ai_os_vault_revenue', [])
  },
  save(arr) {
    lsSet('ai_os_vault_revenue', arr)
    pushToSupabase('revenue', arr)
  },
}

/* ── COMPETITORS ────────────────────────────────────── */
export const Competitors = {
  load() {
    return lsGet('ai_os_competitors', [])
  },
  save(arr) {
    lsSet('ai_os_competitors', arr)
    pushToSupabase('competitors', arr)
  },
}

/* ═══════════════════════════════════════════════════
   FULL SYNC — call once on app load when Supabase
   key is available. Pulls all cloud data → localStorage.
═══════════════════════════════════════════════════ */
export async function syncAllFromCloud() {
  if (!isSupabaseReady()) return { ok: false, reason: 'No Supabase key' }
  console.log('[DB] Syncing all data from cloud...')
  await Promise.allSettled([
    Leads.pull(),
    Clients.pull(),
    Planner.pull(),
    Drafts.pull(),
    VoiceBible.pull(),
  ])
  console.log('[DB] Cloud sync complete.')
  return { ok: true }
}
