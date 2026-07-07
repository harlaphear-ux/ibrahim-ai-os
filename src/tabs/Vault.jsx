import { useState, useEffect } from 'react'
import {
  BookOpen, FileText, Lightbulb, Settings, DollarSign,
  Plus, Search, ChevronDown, ChevronUp, Save, Eye, EyeOff,
  Download, Trash2, Check, X, Key, AlertCircle, Send,
  Mic, ClipboardList, Layers, Zap, TrendingUp, Package,
  ArrowRight, RefreshCw, Play, Copy, Printer, Users, Radio,
  Cloud, CloudOff
} from 'lucide-react'
import { VaultItems, VoiceBible as VBdb, Revenue as Revdb, syncAllFromCloud } from '../lib/db'
import { isSupabaseReady, resetClient as dbResetClient } from '../lib/supabase'

/* ─── localStorage helpers ──────────────────────────── */
const KEYS = {
  notes:      'ai_os_vault_notes',
  sops:       'ai_os_vault_sops',
  frameworks: 'ai_os_vault_frameworks',
  ideas:      'ai_os_vault_ideas',
  voice:      'ibrahim_voice_bible',
  apiKeys:    'ibrahim_api_keys',
  goals:      'ibrahim_goals',
  bizCtx:     'ibrahim_biz_context',
  revenue:    'ai_os_vault_revenue',
  clients:    'ai_os_clients',
  leads:      'ai_os_pipeline_leads',
  planner:    'ai_os_planner_tasks',
  drafts:     'ai_os_content_drafts',
}

const load  = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
const save  = (key, val) => localStorage.setItem(key, JSON.stringify(val))

/* ─── REVENUE INTELLIGENCE ──────────────────────────── */
function RevenueIntelligence() {
  const [entries,  setEntries]  = useState(() => Revdb.load())
  const [form,     setForm]     = useState({ client: '', amount: '', type: 'Collected', date: new Date().toISOString().split('T')[0] })

  useEffect(() => Revdb.save(entries), [entries])

  // Pull live data from Pipeline + Clients
  const clients  = load(KEYS.clients,  [])
  const leads    = load(KEYS.leads,    [])

  const pipelineRevenue = leads
    .filter(l => l.stage === 'closed')
    .reduce((s, l) => s + parseFloat((l.dealValue || '').replace(/[^0-9.]/g, '') || 0), 0)

  const clientRevenue = clients
    .reduce((s, c) => s + parseFloat((c.revenue || '').replace(/[^0-9.]/g, '') || 0), 0)

  const total = (type) => entries.filter(e => e.type === type).reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const totalAll = total('Collected') + total('Pending') + total('Projected')

  const add = () => {
    if (!form.client || !form.amount) return
    setEntries(e => [{ ...form, id: Date.now() }, ...e])
    setForm(f => ({ ...f, client: '', amount: '' }))
  }

  const STAGE_LABELS = { replied:'Replied', active:'Active Convo', problem:'Problem & Interest', reengagement:'Reengagement', followup:'Follow Up', booked:'Booked Call', closed:'Closed' }
  const stageCounts = leads.reduce((acc, l) => { acc[l.stage] = (acc[l.stage]||0)+1; return acc }, {})

  return (
    <div>
      {/* Live summary cards */}
      <div className="metric-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:'20px' }}>
        {[
          { label:'Collected',    value:`$${total('Collected').toLocaleString()}`, color:'green' },
          { label:'Pending',      value:`$${total('Pending').toLocaleString()}`,   color:'amber' },
          { label:'Pipeline Est', value:`$${clientRevenue.toLocaleString()}`,      color:'blue'  },
        ].map(m => (
          <div key={m.label} className={`metric-card ${m.color}`} style={{ padding:'14px' }}>
            <div className="metric-value" style={{ fontSize:'20px' }}>{m.value}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      {leads.length > 0 && (
        <div className="card" style={{ marginBottom:'16px' }}>
          <div className="card-header"><span className="card-title">Live Pipeline Funnel</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {Object.entries(stageCounts).map(([stage, count]) => (
              <div key={stage} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'12px', color:'var(--text-muted)', width:'130px', flexShrink:0 }}>{STAGE_LABELS[stage]||stage}</span>
                <div style={{ flex:1, background:'var(--bg)', borderRadius:'4px', height:'8px', overflow:'hidden' }}>
                  <div style={{ width:`${Math.min(100,(count/Math.max(...Object.values(stageCounts)))*100)}%`, height:'100%', background:'var(--blue)', borderRadius:'4px', transition:'width 0.4s' }} />
                </div>
                <span style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-primary)', width:'20px', textAlign:'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log revenue */}
      <div className="card" style={{ marginBottom:'16px' }}>
        <div className="card-header"><span className="card-title">Log Revenue</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 110px 120px auto', gap:'8px', alignItems:'end' }}>
          <div><label className="label">Client</label><input className="input" placeholder="Client name" value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} /></div>
          <div><label className="label">Amount</label><input className="input" type="number" placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
          <div><label className="label">Type</label>
            <select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              <option>Collected</option><option>Pending</option><option>Projected</option>
            </select>
          </div>
          <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
          <button className="btn btn-primary" onClick={add} style={{ height:'42px' }}><Plus size={14} /></button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="card">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--border)' }}>
                {['Client','Amount','Type','Date',''].map(h => (
                  <th key={h} style={{ textAlign:'left', fontSize:'11px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'8px 10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px', fontSize:'13px', fontWeight:'600' }}>{e.client}</td>
                  <td style={{ padding:'10px', fontSize:'13px', fontWeight:'800', color:'var(--green-dark)' }}>${parseFloat(e.amount).toLocaleString()}</td>
                  <td style={{ padding:'10px' }}><span className={`badge ${e.type==='Collected'?'badge-green':e.type==='Pending'?'badge-amber':'badge-blue'}`}>{e.type}</span></td>
                  <td style={{ padding:'10px', fontSize:'12px', color:'var(--text-muted)' }}>{e.date}</td>
                  <td style={{ padding:'10px' }}><button onClick={() => setEntries(en => en.filter(x => x.id !== e.id))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── VOICE BIBLE ────────────────────────────────────── */
function VoiceBible() {
  const [saved, setSaved] = useState(false)
  const [data, setData]   = useState(() => VBdb.load())

  const FIELDS = [
    { key:'tone',     label:'Your Tone & Personality',         placeholder:'e.g. Direct, warm, no fluff, confident but not arrogant...' },
    { key:'beliefs',  label:'Core Beliefs & Stances',          placeholder:'e.g. AI should serve the operator, not replace them...' },
    { key:'banned',   label:'🚫 Banned Words & Phrases',       placeholder:'e.g. "game-changer", "leverage", "synergy"...' },
    { key:'writing',  label:'Writing Style Rules',             placeholder:'e.g. Short sentences. No bullet lists. Never start with "I"...' },
    { key:'icp',      label:'Your ICP & Who You Talk To',      placeholder:'e.g. Business coaches, 2K-15K LinkedIn followers, high-ticket...' },
    { key:'examples', label:'Example Posts / Writing Samples', placeholder:'Paste 3-5 of your best LinkedIn posts here...' },
  ]

  const saveVoice = () => {
    VBdb.save(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,var(--purple-light),var(--blue-light))', border:'1px solid rgba(123,94,167,0.15)', borderRadius:'var(--radius-lg)', padding:'16px 20px', marginBottom:'20px' }}>
        <p style={{ fontSize:'13px', fontWeight:'700', color:'var(--purple)', marginBottom:'4px' }}>🧠 This is the most important section in your entire OS</p>
        <p style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:'1.6' }}>Every AI output reads from this before generating anything. Fill it once, completely. The more you add, the more it sounds like you.</p>
      </div>
      {FIELDS.map(f => (
        <div key={f.key} className="form-group">
          <label className="label">{f.label}</label>
          <textarea className="input textarea" placeholder={f.placeholder} value={data[f.key]||''} onChange={e => setData(d => ({...d,[f.key]:e.target.value}))} style={{ minHeight:'88px' }} />
        </div>
      ))}
      <button className="btn btn-primary btn-full btn-lg" onClick={saveVoice}>
        {saved ? <><Check size={16}/> Voice Bible Saved!</> : <><Save size={16}/> Save Voice Bible</>}
      </button>
    </div>
  )
}

/* ─── NOTES SECTION (shared: Notes / Frameworks / Ideas) ─ */
function NotesSection({ title, placeholder, storeKey, color, showDraftBtn = false }) {
  const [items,    setItems]    = useState(() => VaultItems.load(storeKey))
  const [text,     setText]     = useState('')
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState({})
  const [drafted,  setDrafted]  = useState({})

  useEffect(() => VaultItems.save(storeKey, items), [items, storeKey])

  const add = () => {
    if (!text.trim()) return
    const title = text.split('\n')[0].slice(0, 60)
    setItems(i => [{ id:Date.now(), title, body:text }, ...i])
    setText('')
  }

  const sendToDrafts = (item) => {
    const existing = load(KEYS.drafts, [])
    save(KEYS.drafts, [{ id:Date.now(), text:`[From Vault — ${title}]\n\n${item.body}`, savedAt:new Date().toLocaleDateString() }, ...existing])
    setDrafted(d => ({...d, [item.id]:true}))
    setTimeout(() => setDrafted(d => ({...d, [item.id]:false})), 3000)
  }

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.body.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
        <div className="search-bar" style={{ flex:1 }}>
          <Search size={14} style={{ color:'var(--text-muted)' }} />
          <input placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <textarea className="input textarea" placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} style={{ minHeight:'80px' }} />
        <button className="btn btn-secondary btn-sm" style={{ marginTop:'8px' }} onClick={add}><Plus size={12}/> Save {title.slice(0,-1)}</button>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding:'24px' }}>
          <div className="empty-icon" style={{ background:`var(--${color}-light)`, color:`var(--${color})` }}><FileText size={20}/></div>
          <p className="empty-title">No {title.toLowerCase()} yet</p>
          <p className="empty-desc">Type above and save. Everything is searchable.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' }}>
              <div style={{ padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setExpanded(e => ({...e,[item.id]:!e[item.id]}))}>
                <span style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-primary)', flex:1 }}>{item.title}</span>
                <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                  {showDraftBtn && (
                    <button
                      onClick={e => { e.stopPropagation(); sendToDrafts(item) }}
                      style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'600', border:'none', cursor:'pointer', background:drafted[item.id]?'var(--green-light)':'var(--blue-light)', color:drafted[item.id]?'var(--green-dark)':'var(--blue)', display:'flex', alignItems:'center', gap:'3px' }}
                    >
                      {drafted[item.id] ? <><Check size={10}/> Drafted</> : <><ArrowRight size={10}/> Draft Post</>}
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setItems(i => i.filter(x => x.id !== item.id)) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px' }}><Trash2 size={13}/></button>
                  {expanded[item.id] ? <ChevronUp size={14} style={{ color:'var(--text-muted)' }}/> : <ChevronDown size={14} style={{ color:'var(--text-muted)' }}/>}
                </div>
              </div>
              {expanded[item.id] && (
                <div style={{ padding:'0 14px 12px', fontSize:'13px', color:'var(--text-secondary)', lineHeight:'1.7', whiteSpace:'pre-wrap', borderTop:'1px solid var(--border)' }}>
                  <div style={{ paddingTop:'10px' }}>{item.body}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── SOP AUTO-RUNNER ────────────────────────────────── */
function SOPRunner() {
  const sops       = load(KEYS.sops, [])
  const [selected, setSelected] = useState(null)
  const [steps,    setSteps]    = useState([])
  const [startDate,setStartDate]= useState(new Date().toISOString().split('T')[0])
  const [daysEach, setDaysEach] = useState(1)
  const [running,  setRunning]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [text,     setText]     = useState('')
  const [drafted,  setDrafted]  = useState({})

  const sendToDrafts = (item) => {
    const existing = load(KEYS.drafts, [])
    save(KEYS.drafts, [{ id:Date.now(), text:`[SOP] ${item.title}\n\n${item.body}`, savedAt:new Date().toLocaleDateString() }, ...existing])
    setDrafted(d => ({...d, [item.id]:true}))
    setTimeout(() => setDrafted(d => ({...d, [item.id]:false})), 3000)
  }

  const parseSteps = (body) => {
    const lines = body.split('\n').filter(l => l.trim())
    return lines
      .filter(l => /^(\d+[\.\):]|[-•*])/.test(l.trim()))
      .map((l, i) => ({ id:i+1, text:l.replace(/^(\d+[\.\):\s]+|[-•*]\s*)/, '').trim() }))
  }

  const selectSOP = (sop) => {
    setSelected(sop)
    setSteps(parseSteps(sop.body))
    setDone(false)
  }

  const run = () => {
    if (!selected || steps.length === 0) return
    setRunning(true)
    const plannerTasks = load(KEYS.planner, {})
    const base = new Date(startDate)

    steps.forEach((step, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i * parseInt(daysEach))
      const dateKey = d.toISOString().split('T')[0]
      if (!plannerTasks[dateKey]) plannerTasks[dateKey] = []
      // Avoid duplicates
      const exists = plannerTasks[dateKey].some(t => t._sopStep === `${selected.id}-${step.id}`)
      if (!exists) {
        plannerTasks[dateKey].push({
          id: Date.now() + i,
          text: `[SOP: ${selected.title}] ${step.text}`,
          type: 'sop',
          done: false,
          _sopStep: `${selected.id}-${step.id}`,
        })
      }
    })
    save(KEYS.planner, plannerTasks)
    setTimeout(() => { setRunning(false); setDone(true) }, 800)
  }

  return (
    <div>
      <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-mid)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:'20px' }}>
        <p style={{ fontSize:'13px', fontWeight:'700', color:'var(--blue)', marginBottom:'4px' }}>⚡ SOP Auto-Runner</p>
        <p style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:'1.5' }}>Write your SOP once. The runner parses each numbered step and drops them into your Planner on the dates you set — automatically.</p>
      </div>

      {/* Write or pick SOP */}
      <div className="form-group">
        <label className="label">Write a New SOP (or pick one below)</label>
        <textarea className="input textarea" placeholder="Title on first line, then numbered steps:&#10;1. Send welcome email&#10;2. Schedule kickoff call&#10;3. Share onboarding doc..." value={text} onChange={e => setText(e.target.value)} style={{ minHeight:'100px' }} />
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop:'8px' }}
          onClick={() => {
            if (!text.trim()) return
            const title = text.split('\n')[0].slice(0,60)
            const newSOP = { id:Date.now(), title, body:text }
            const all = load(KEYS.sops, [])
            save(KEYS.sops, [newSOP, ...all])
            selectSOP(newSOP)
            setText('')
          }}
        >
          <Plus size={12}/> Save & Select SOP
        </button>
      </div>

      {sops.length > 0 && (
        <div className="form-group">
          <label className="label">Or Select Saved SOP</label>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {sops.map(sop => (
              <div key={sop.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:'var(--radius-md)', border:`2px solid ${selected?.id===sop.id?'var(--blue)':'var(--border)'}`, background:selected?.id===sop.id?'var(--blue-light)':'var(--card)', cursor:'pointer' }} onClick={() => selectSOP(sop)}>
                <span style={{ fontSize:'13px', fontWeight:'600' }}>{sop.title}</span>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); sendToDrafts(sop) }}
                    style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'600', border:'none', cursor:'pointer', background:drafted[sop.id]?'var(--green-light)':'var(--purple-light)', color:drafted[sop.id]?'var(--green-dark)':'var(--purple)', display:'flex', alignItems:'center', gap:'3px' }}
                  >
                    {drafted[sop.id] ? <><Check size={10}/> Drafted</> : <><ArrowRight size={10}/> Draft Post</>}
                  </button>
                  {selected?.id===sop.id && <span className="badge badge-blue">Selected</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && steps.length > 0 && (
        <div>
          <div className="card" style={{ marginBottom:'16px' }}>
            <div className="card-header"><span className="card-title">Parsed Steps ({steps.length})</span></div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {steps.map((s,i) => (
                <div key={s.id} style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'8px 0', borderBottom:i<steps.length-1?'1px solid var(--border)':'none' }}>
                  <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--blue)', color:'white', fontSize:'11px', fontWeight:'800', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{s.id}</span>
                  <span style={{ fontSize:'13px', color:'var(--text-primary)', lineHeight:1.5 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="label">Days Per Step</label>
              <input className="input" type="number" min="1" max="14" value={daysEach} onChange={e => setDaysEach(e.target.value)} />
            </div>
          </div>

          {done ? (
            <div style={{ background:'var(--green-light)', border:'1px solid rgba(0,158,119,0.2)', borderRadius:'var(--radius-md)', padding:'14px', textAlign:'center' }}>
              <p style={{ fontSize:'14px', fontWeight:'700', color:'var(--green-dark)' }}>✅ {steps.length} tasks added to Planner</p>
              <p style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'4px' }}>Starting {startDate} · {daysEach} day{daysEach>1?'s':''} per step</p>
            </div>
          ) : (
            <button className="btn btn-primary btn-full" onClick={run} disabled={running}>
              {running
                ? <><span className="loading-spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'white', width:'14px', height:'14px' }}/> Adding to Planner...</>
                : <><Play size={14}/> Run SOP → Add {steps.length} Tasks to Planner</>}
            </button>
          )}
        </div>
      )}

      {sops.length === 0 && !text && (
        <div className="empty-state" style={{ padding:'24px' }}>
          <div className="empty-icon" style={{ background:'var(--blue-light)', color:'var(--blue)' }}><Zap size={20}/></div>
          <p className="empty-title">No SOPs yet</p>
          <p className="empty-desc">Write your first SOP above — onboarding, content process, sales flow, anything with steps.</p>
        </div>
      )}
    </div>
  )
}

/* ─── SMART SEARCH ───────────────────────────────────── */
function SmartSearch() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [searched,setSearched]= useState(false)
  const [drafted, setDrafted] = useState({})

  const sendToDrafts = (item, section) => {
    const key = `${section}-${item.id}`
    const existing = load(KEYS.drafts, [])
    save(KEYS.drafts, [{ id:Date.now(), text:`[Vault — ${section}]\n\n${item.body}`, savedAt:new Date().toLocaleDateString() }, ...existing])
    setDrafted(d => ({...d,[key]:true}))
    setTimeout(() => setDrafted(d => ({...d,[key]:false})), 3000)
  }

  const search = () => {
    if (!query.trim()) return
    const q = query.toLowerCase()
    const sections = [
      { label:'Notes',      key: KEYS.notes,      color:'blue'   },
      { label:'SOPs',       key: KEYS.sops,       color:'purple' },
      { label:'Frameworks', key: KEYS.frameworks,  color:'green'  },
      { label:'Ideas',      key: KEYS.ideas,       color:'amber'  },
    ]
    const found = []
    sections.forEach(({ label, key, color }) => {
      const items = load(key, [])
      items.forEach(item => {
        if (item.title.toLowerCase().includes(q) || (item.body||'').toLowerCase().includes(q)) {
          found.push({ ...item, _section:label, _color:color })
        }
      })
    })
    setResults(found)
    setSearched(true)
  }

  return (
    <div>
      <h3 style={{ fontSize:'16px', fontWeight:'800', marginBottom:'4px' }}>Smart Search</h3>
      <p style={{ fontSize:'13px', color:'var(--text-muted)', marginBottom:'20px' }}>Search across all your Notes, SOPs, Frameworks, and Ideas at once.</p>

      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        <input
          className="input"
          style={{ flex:1 }}
          placeholder='e.g. "pricing", "onboarding", "LinkedIn"...'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key==='Enter' && search()}
        />
        <button className="btn btn-primary" onClick={search}><Search size={14}/> Search</button>
      </div>

      {searched && results.length === 0 && (
        <div className="empty-state" style={{ padding:'24px' }}>
          <div className="empty-icon" style={{ background:'var(--bg)', color:'var(--text-muted)' }}><Search size={20}/></div>
          <p className="empty-title">No results for "{query}"</p>
          <p className="empty-desc">Try a different word, or add more content to your Vault sections.</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'12px' }}>{results.length} result{results.length!==1?'s':''} for "<strong>{query}</strong>"</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {results.map(item => {
              const key = `${item._section}-${item.id}`
              return (
                <div key={key} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                    <div style={{ flex:1 }}>
                      <span className={`badge badge-${item._color}`} style={{ marginBottom:'6px', display:'inline-block' }}>{item._section}</span>
                      <p style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-primary)' }}>{item.title}</p>
                    </div>
                    <button
                      onClick={() => sendToDrafts(item, item._section)}
                      style={{ padding:'4px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:'600', border:'none', cursor:'pointer', background:drafted[key]?'var(--green-light)':'var(--blue-light)', color:drafted[key]?'var(--green-dark)':'var(--blue)', flexShrink:0, marginLeft:'10px', display:'flex', alignItems:'center', gap:'3px' }}
                    >
                      {drafted[key] ? <><Check size={10}/> Drafted</> : <><ArrowRight size={10}/> Draft Post</>}
                    </button>
                  </div>
                  <p style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:'1.6', whiteSpace:'pre-wrap' }}>
                    {item.body?.slice(0,200)}{item.body?.length>200?'…':''}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ONBOARDING PACKET GENERATOR ───────────────────── */
function OnboardingPacket() {
  const clients  = load(KEYS.clients, [])
  const sops     = load(KEYS.sops, [])
  const [client, setClient]   = useState('')
  const [selSOPs,setSelSOPs]  = useState([])
  const [note,   setNote]     = useState('')
  const [gen,    setGen]      = useState(false)

  const toggle = (id) => setSelSOPs(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id])

  const generate = () => {
    const c = clients.find(x => x.id === parseInt(client))
    const chosenSOPs = sops.filter(s => selSOPs.includes(s.id))
    if (!c) return
    setGen(true)

    const pw = window.open('', '_blank')
    if (!pw) { alert('Allow popups to generate packet'); setGen(false); return }

    const sopHTML = chosenSOPs.map(s => `
      <div class="sop-block">
        <h3 class="sop-title">${s.title}</h3>
        <div class="sop-body">${(s.body||'').replace(/\n/g,'<br>')}</div>
      </div>
    `).join('')

    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Onboarding Packet — ${c.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:60px; max-width:860px; margin:0 auto; color:#111; }
  .header { border-bottom:4px solid #0b0085; padding-bottom:24px; margin-bottom:36px; }
  .brand { font-size:11px; font-weight:800; color:#0b0085; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; }
  h1 { font-size:32px; font-weight:900; margin-bottom:4px; }
  .sub { font-size:15px; color:#666; }
  .meta { display:flex; gap:24px; margin-top:20px; flex-wrap:wrap; }
  .meta-item { font-size:13px; } .meta-label { font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#999; margin-bottom:2px; font-weight:700; }
  .section { margin-bottom:40px; }
  .section-title { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#0b0085; border-bottom:2px solid #e5e7eb; padding-bottom:8px; margin-bottom:16px; }
  .welcome { background:#f0f0ff; border-left:4px solid #0b0085; padding:16px 20px; border-radius:0 8px 8px 0; margin-bottom:32px; font-size:15px; line-height:1.7; }
  .sop-block { margin-bottom:28px; padding:20px; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb; }
  .sop-title { font-size:16px; font-weight:800; margin-bottom:10px; }
  .sop-body { font-size:13px; line-height:1.8; color:#444; }
  .footer { margin-top:60px; padding-top:20px; border-top:1px solid #e5e7eb; font-size:12px; color:#999; text-align:center; }
  @media print { body { padding:40px; } }
</style></head><body>
<div class="header">
  <div class="brand">Ibrahim's AI OS · Onboarding Packet</div>
  <h1>Welcome, ${c.name} 👋</h1>
  <p class="sub">${c.service || 'AI Operations Consulting'}</p>
  <div class="meta">
    ${c.email ? `<div class="meta-item"><div class="meta-label">Email</div>${c.email}</div>` : ''}
    ${c.revenue ? `<div class="meta-item"><div class="meta-label">Investment</div>${c.revenue}</div>` : ''}
    <div class="meta-item"><div class="meta-label">Start Date</div>${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
  </div>
</div>
${note ? `<div class="welcome">${note.replace(/\n/g,'<br>')}</div>` : ''}
${chosenSOPs.length > 0 ? `<div class="section"><div class="section-title">Our Process & What to Expect</div>${sopHTML}</div>` : ''}
<div class="footer">Generated by Ibrahim's AI OS · ${new Date().toLocaleDateString()}</div>
<script>setTimeout(()=>window.print(),600)</script>
</body></html>`)
    pw.document.close()
    setTimeout(() => setGen(false), 1200)
  }

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,var(--green-light),var(--blue-light))', border:'1px solid rgba(0,158,119,0.15)', borderRadius:'var(--radius-lg)', padding:'14px 18px', marginBottom:'20px' }}>
        <p style={{ fontSize:'13px', fontWeight:'700', color:'var(--green-dark)', marginBottom:'4px' }}>📦 Onboarding Packet Generator</p>
        <p style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:'1.5' }}>Select a client, choose which SOPs to include, add a welcome note — generates a branded PDF to send them on Day 1.</p>
      </div>

      {clients.length === 0 ? (
        <div className="empty-state" style={{ padding:'28px' }}>
          <div className="empty-icon" style={{ background:'var(--green-light)', color:'var(--green-dark)' }}><Users size={20}/></div>
          <p className="empty-title">No clients yet</p>
          <p className="empty-desc">Convert a lead to a client in the Pipeline tab first.</p>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label className="label">Select Client</label>
            <select className="input" value={client} onChange={e => setClient(e.target.value)}>
              <option value="">— Choose client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.service?`· ${c.service}`:''}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Welcome Note (personal message)</label>
            <textarea className="input textarea" placeholder="e.g. Hey [Name], I'm so excited to work with you. Here's exactly what happens over the next 4 weeks..." value={note} onChange={e => setNote(e.target.value)} style={{ minHeight:'80px' }} />
          </div>

          {sops.length > 0 && (
            <div className="form-group">
              <label className="label">Include SOPs ({selSOPs.length} selected)</label>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {sops.map(s => (
                  <div key={s.id} onClick={() => toggle(s.id)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderRadius:'var(--radius-md)', border:`2px solid ${selSOPs.includes(s.id)?'var(--blue)':'var(--border)'}`, background:selSOPs.includes(s.id)?'var(--blue-light)':'var(--card)', cursor:'pointer' }}>
                    <div style={{ width:18, height:18, borderRadius:'4px', border:`2px solid ${selSOPs.includes(s.id)?'var(--blue)':'var(--border)'}`, background:selSOPs.includes(s.id)?'var(--blue)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {selSOPs.includes(s.id) && <Check size={11} style={{ color:'white' }} />}
                    </div>
                    <span style={{ fontSize:'13px', fontWeight:'600' }}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-full" onClick={generate} disabled={!client || gen}>
            {gen
              ? <><span className="loading-spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'white', width:'14px', height:'14px' }}/> Generating...</>
              : <><Printer size={14}/> Generate Onboarding PDF</>}
          </button>
          <p style={{ fontSize:'11px', color:'var(--text-muted)', textAlign:'center', marginTop:'8px' }}>Opens print preview → Save as PDF → send to client</p>
        </>
      )}
    </div>
  )
}

/* ─── SETTINGS ───────────────────────────────────────── */
function SettingsPanel({ onLogout }) {
  const [showKeys,    setShowKeys]    = useState({})
  const [keys,        setKeys]        = useState(() => load(KEYS.apiKeys, { claude:'', notion:'', googleSheets:'', calcom:'', makeWebhook:'', supabaseUrl:'', supabaseKey:'' }))
  const [saved,       setSaved]       = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [syncMsg,     setSyncMsg]     = useState('')
  const [goals,       setGoals]       = useState(() => load(KEYS.goals, { revenue:'3000', clients:'2', outreach:'30' }))
  const [bizContext,  setBizContext]  = useState(() => localStorage.getItem(KEYS.bizCtx) || '')
  const [cloudReady,  setCloudReady]  = useState(() => isSupabaseReady())

  const API_FIELDS = [
    { key:'claude',       label:'Claude API Key',          placeholder:'sk-ant-...',                    hint:'From console.anthropic.com' },
    { key:'notion',       label:'Notion API Token',        placeholder:'secret_...',                    hint:'From notion.so/my-integrations' },
    { key:'googleSheets', label:'Google Sheets ID',        placeholder:'1BxiMVs...',                    hint:'The long ID from your Sheets URL' },
    { key:'calcom',       label:'Cal.com API Key',         placeholder:'cal_...',                       hint:'From cal.com/settings/developer' },
    { key:'makeWebhook',  label:'Make.com Webhook URL',    placeholder:'https://hook.eu1.make.com/...', hint:'From your Make.com scenario' },
    { key:'supabaseUrl',  label:'Supabase Project URL',    placeholder:'https://xxxx.supabase.co',      hint:'From Supabase → Settings → API' },
    { key:'supabaseKey',  label:'Supabase Anon Key',       placeholder:'eyJhbG...',                     hint:'From Supabase → Settings → API (anon/public)' },
  ]

  const saveAll = async () => {
    const prev = load(KEYS.apiKeys, {})
    save(KEYS.apiKeys, keys)
    save(KEYS.goals, goals)
    localStorage.setItem(KEYS.bizCtx, bizContext)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)

    // If Supabase creds changed, reset client + sync from cloud
    const urlChanged = prev.supabaseUrl !== keys.supabaseUrl
    const keyChanged = prev.supabaseKey !== keys.supabaseKey
    if ((urlChanged || keyChanged) && keys.supabaseUrl && keys.supabaseKey) {
      dbResetClient()
      setCloudReady(true)
      setSyncing(true)
      setSyncMsg('Connecting to cloud...')
      try {
        const result = await syncAllFromCloud()
        setSyncMsg(result.ok ? '✅ Cloud sync complete! All your data is now saved.' : `⚠️ ${result.reason}`)
      } catch {
        setSyncMsg('⚠️ Sync failed — check your Supabase URL and key.')
      }
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 5000)
    }
  }

  return (
    <div>
      <div style={{ background:'var(--amber-light)', border:'1px solid var(--amber)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:'24px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
        <AlertCircle size={16} style={{ color:'var(--amber-dark)', flexShrink:0, marginTop:'1px' }} />
        <p style={{ fontSize:'12px', color:'var(--amber-dark)', fontWeight:'600', lineHeight:'1.6' }}>API keys are stored in your browser's localStorage — they never leave your device.</p>
      </div>

      {/* Cloud sync status banner */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', borderRadius:'var(--radius-md)', marginBottom:'16px', background: cloudReady ? 'var(--green-light)' : 'var(--bg)', border:`1px solid ${cloudReady ? 'var(--green-dark)' : 'var(--border)'}` }}>
        {cloudReady ? <Cloud size={16} style={{ color:'var(--green-dark)', flexShrink:0 }}/> : <CloudOff size={16} style={{ color:'var(--text-muted)', flexShrink:0 }}/>}
        <div>
          <div style={{ fontSize:'12px', fontWeight:'700', color: cloudReady ? 'var(--green-dark)' : 'var(--text-muted)' }}>
            {cloudReady ? '☁️ Cloud sync active — your data is safe across all devices' : '💾 Local only — add Supabase keys below to enable cloud sync'}
          </div>
          {syncMsg && <div style={{ fontSize:'11px', marginTop:'3px', color:'var(--text-secondary)' }}>{syncMsg}</div>}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">API Keys & Connections</div>
        {API_FIELDS.map(f => (
          <div key={f.key} className="settings-row" style={ f.key === 'supabaseUrl' ? { borderTop:'2px solid var(--blue)', marginTop:'12px', paddingTop:'12px' } : {} }>
            <div>
              <div className="settings-label">
                <Key size={13} style={{ display:'inline', marginRight:'5px' }}/>
                {f.label}
                {(f.key === 'supabaseUrl' || f.key === 'supabaseKey') && <span style={{ marginLeft:'6px', fontSize:'10px', fontWeight:'700', background:'var(--blue-light)', color:'var(--blue)', padding:'1px 6px', borderRadius:'20px' }}>CLOUD SYNC</span>}
              </div>
              <div className="settings-desc">{f.hint}</div>
            </div>
            <div style={{ display:'flex', gap:'6px', alignItems:'center', minWidth:'240px' }}>
              <input className="input" type={showKeys[f.key]?'text':'password'} placeholder={f.placeholder} value={keys[f.key]||''} onChange={e => setKeys(k=>({...k,[f.key]:e.target.value}))} style={{ fontSize:'12px' }} />
              <button onClick={() => setShowKeys(s=>({...s,[f.key]:!s[f.key]}))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', flexShrink:0, padding:'6px' }}>
                {showKeys[f.key] ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Monthly Goals</div>
        {[
          { key:'revenue',  label:'Revenue Target ($)' },
          { key:'clients',  label:'New Clients' },
          { key:'outreach', label:'Outreach Messages' },
        ].map(g => (
          <div key={g.key} className="settings-row">
            <div className="settings-label">{g.label}</div>
            <input className="input" style={{ width:'120px' }} type="number" value={goals[g.key]||''} onChange={e => setGoals(p=>({...p,[g.key]:e.target.value}))} />
          </div>
        ))}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Business Context</div>
        <div className="form-group">
          <label className="label">Tell the AI about your business</label>
          <textarea className="input textarea" placeholder="e.g. I'm Ibrahim, solo AI Ops consultant in Nigeria charging in USD..." value={bizContext} onChange={e => setBizContext(e.target.value)} style={{ minHeight:'100px' }} />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Account</div>
        <div className="settings-row">
          <div><div className="settings-label">Export All Data</div><div className="settings-desc">Download everything as JSON</div></div>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            const data = {}
            Object.entries(KEYS).forEach(([k,v]) => { try { data[k] = JSON.parse(localStorage.getItem(v)||'null') } catch {} })
            const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ibrahim-ai-os-backup.json'; a.click()
          }}><Download size={13}/> Export</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-label">Sign Out</div><div className="settings-desc">End your current session</div></div>
          <button className="btn btn-danger btn-sm" onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={saveAll} disabled={syncing}>
        {syncing ? <><RefreshCw size={16} style={{ animation:'spin 1s linear infinite' }}/> Syncing from cloud...</>
         : saved  ? <><Check size={16}/> Settings Saved!</>
                  : <><Save size={16}/> Save All Settings</>}
      </button>
    </div>
  )
}

/* ─── FIREFLIES / FATHOM PARSER ─────────────────────── */
function CallNotesParser() {
  const [transcript, setTranscript] = useState('')
  const [parsed,     setParsed]     = useState(null)
  const [parsing,    setParsing]    = useState(false)
  const [pushed,     setPushed]     = useState({ actions: false, content: false })

  const parse = async () => {
    if (!transcript.trim()) return
    setParsing(true)
    await new Promise(r => setTimeout(r, 900))

    const lines = transcript.split('\n').map(l => l.trim()).filter(Boolean)

    // Extract action items — lines with task-like language
    const actionKeywords = /\b(will|need to|should|must|action|follow.?up|send|schedule|book|create|review|check|prepare|share|submit|update|confirm|reach out|get back|circle back|let me|i'll|we'll|going to)\b/i
    const actionItems = lines
      .filter(l => actionKeywords.test(l) && l.length > 15 && l.length < 200)
      .slice(0, 12)
      .map((text, i) => ({ id: i + 1, text, done: false }))

    // Extract content ideas — questions, insights, bold statements
    const contentKeywords = /(\?|"[^"]{10,}"|the reason|the key|what if|i realized|the problem is|most people|nobody talks|the secret|the truth|the mistake|always|never|you need|stop doing|start doing)/i
    const contentIdeas = lines
      .filter(l => contentKeywords.test(l) && l.length > 20 && l.length < 250)
      .slice(0, 8)
      .map((text, i) => ({ id: i + 1, text }))

    setParsed({ actionItems, contentIdeas })
    setParsing(false)
  }

  const pushToPlanner = () => {
    if (!parsed?.actionItems?.length) return
    const today = new Date().toISOString().split('T')[0]
    const tasks = load(KEYS.planner, {})
    tasks[today] = tasks[today] || []
    parsed.actionItems.forEach((item, i) => {
      tasks[today].push({ id: Date.now() + i, text: item.text, type: 'call-action', done: false, note: 'From call notes' })
    })
    save(KEYS.planner, tasks)
    setPushed(p => ({ ...p, actions: true }))
  }

  const pushToContent = () => {
    if (!parsed?.contentIdeas?.length) return
    const existing = load(KEYS.drafts, [])
    const newDrafts = parsed.contentIdeas.map((idea, i) => ({
      id: Date.now() + i,
      text: `[From Call Notes]\n\n${idea.text}`,
      savedAt: new Date().toLocaleDateString(),
    }))
    save(KEYS.drafts, [...newDrafts, ...existing])
    setPushed(p => ({ ...p, content: true }))
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,var(--purple-light),var(--blue-light))', border: '1px solid rgba(123,94,167,0.2)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--purple)', marginBottom: '4px' }}>🎙 Fireflies / Fathom → Action Items</p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Paste your call transcript or notes. The parser extracts action items (→ Planner) and content ideas (→ Content Drafts) automatically.
        </p>
      </div>

      <div className="form-group">
        <label className="label">Paste Call Transcript or Notes</label>
        <textarea
          className="input textarea"
          placeholder="Paste your Fireflies/Fathom transcript, Zoom summary, or meeting notes here..."
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          style={{ minHeight: '140px' }}
        />
      </div>

      <button className="btn btn-primary btn-full" onClick={parse} disabled={!transcript.trim() || parsing}>
        {parsing
          ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Parsing...</>
          : <><Zap size={14} /> Extract Action Items + Content Ideas</>}
      </button>

      {parsed && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action Items */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Action Items ({parsed.actionItems.length})</span>
              <button
                className={`btn btn-sm ${pushed.actions ? 'btn-secondary' : 'btn-primary'}`}
                onClick={pushToPlanner}
                disabled={pushed.actions || !parsed.actionItems.length}
              >
                {pushed.actions ? <><Check size={12} /> Added to Planner</> : <><ArrowRight size={12} /> Push to Today's Planner</>}
              </button>
            </div>
            {parsed.actionItems.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No clear action items detected — try a more detailed transcript.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {parsed.actionItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '4px', border: '2px solid var(--border)', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content Ideas */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Content Ideas ({parsed.contentIdeas.length})</span>
              <button
                className={`btn btn-sm ${pushed.content ? 'btn-secondary' : 'btn-green'}`}
                onClick={pushToContent}
                disabled={pushed.content || !parsed.contentIdeas.length}
              >
                {pushed.content ? <><Check size={12} /> Saved to Drafts</> : <><ArrowRight size={12} /> Push to Content Drafts</>}
              </button>
            </div>
            {parsed.contentIdeas.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No quotable content ideas found — try pasting more of the conversation.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {parsed.contentIdeas.map(idea => (
                  <div key={idea.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    "{idea.text}"
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── MAIN VAULT ─────────────────────────────────────── */
const VAULT_TABS = [
  { id:'voice',      label:'Voice Bible', Icon: Mic         },
  { id:'revenue',    label:'Revenue',     Icon: DollarSign  },
  { id:'notes',      label:'Notes',       Icon: FileText    },
  { id:'sops',       label:'SOPs',        Icon: ClipboardList },
  { id:'frameworks', label:'Frameworks',  Icon: Layers      },
  { id:'ideas',      label:'Ideas',       Icon: Lightbulb   },
  { id:'callnotes',  label:'Call Notes',  Icon: Radio       },
  { id:'search',     label:'Search',      Icon: Search      },
  { id:'onboarding', label:'Onboarding',  Icon: Package     },
  { id:'settings',   label:'Settings',    Icon: Settings    },
]

export default function Vault({ onLogout }) {
  const [activeTab, setActiveTab] = useState('voice')

  const render = () => {
    switch (activeTab) {
      case 'revenue':    return <RevenueIntelligence />
      case 'voice':      return <VoiceBible />
      case 'notes':      return <NotesSection title="Notes"      placeholder="Type a note, paste something important..."          storeKey={KEYS.notes}      color="blue"   showDraftBtn />
      case 'sops':       return <SOPRunner />
      case 'frameworks': return <NotesSection title="Frameworks"  placeholder="Title on first line, then describe your framework." storeKey={KEYS.frameworks} color="green"  showDraftBtn />
      case 'ideas':      return <NotesSection title="Ideas"       placeholder="Quick idea dump. Title first, expand below."       storeKey={KEYS.ideas}      color="amber"  showDraftBtn />
      case 'callnotes':  return <CallNotesParser />
      case 'search':     return <SmartSearch />
      case 'onboarding': return <OnboardingPacket />
      case 'settings':   return <SettingsPanel onLogout={onLogout} />
      default:           return null
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vault</h1>
          <p className="page-subtitle">Knowledge base, Voice Bible, SOPs, Revenue & Settings</p>
        </div>
      </div>

      {/* Mobile horizontal tab bar */}
      <div className="vault-mobile-tabs">
        {VAULT_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`vault-mobile-tab${activeTab===t.id?' active':''}`}>
            <t.Icon size={14}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop: sidebar + content */}
      <div style={{ display:'flex', gap:'20px' }}>
        <div style={{ width:'180px', flexShrink:0 }} className="vault-sidenav">
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            {VAULT_TABS.map(t => {
              const isActive = activeTab === t.id
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display:'flex', alignItems:'center', gap:'9px', padding:'10px 12px', borderRadius:'var(--radius-md)', border:'none', cursor:'pointer', textAlign:'left', fontSize:'13px', fontWeight:'600', transition:'var(--transition)', background:isActive?'linear-gradient(135deg,var(--blue),#3A10C8)':'transparent', color:isActive?'white':'var(--text-secondary)', boxShadow:isActive?'0 4px 14px rgba(11,0,133,0.35)':'none' }}>
                  <t.Icon size={15} style={{ flexShrink:0, opacity:isActive?1:0.65 }}/>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          {render()}
        </div>
      </div>

      <style>{`
        .vault-mobile-tabs { display:none; }
        @media (max-width:768px) {
          .vault-sidenav { display:none; }
          .vault-mobile-tabs { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:20px; }
          .vault-mobile-tab { display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 6px; font-size:10px; font-weight:700; color:var(--text-muted); background:var(--card); border:1.5px solid var(--border); border-radius:var(--radius-md); cursor:pointer; text-align:center; transition:var(--transition); line-height:1.2; }
          .vault-mobile-tab.active { color:var(--blue); border-color:var(--blue); background:var(--blue-light); }
        }
      `}</style>
    </div>
  )
}
