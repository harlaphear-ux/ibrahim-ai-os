import { useState, useRef, useEffect } from 'react'
import {
  Send, Sparkles, RefreshCw, ExternalLink,
  Zap, FileText, MessageSquare, TrendingUp,
  Brain, Check, Bookmark, PenLine, Eye, Plus, Trash2, AlertCircle, Mic, MicOff
} from 'lucide-react'
import { Competitors as CompDB } from '../lib/db'
import { useVoice } from '../hooks/useVoice'

function loadComps() { return CompDB.load() }
function saveComps(arr) { CompDB.save(arr) }

/* ─── Competitor Monitor ─────────────────────────────── */
function CompetitorMonitor() {
  const [comps,    setComps]    = useState(loadComps)
  const [form,     setForm]     = useState({ name: '', url: '', niche: '', notes: '' })
  const [selected, setSelected] = useState(null)
  const [insight,  setInsight]  = useState(null)
  const [analyzing,setAnalyzing]= useState(false)

  useEffect(() => saveComps(comps), [comps])

  const addComp = () => {
    if (!form.name.trim()) return
    setComps(c => [...c, { id: Date.now(), ...form, lastChecked: new Date().toISOString(), updates: [] }])
    setForm({ name: '', url: '', niche: '', notes: '' })
  }

  const analyze = async (comp) => {
    setSelected(comp)
    setAnalyzing(true)
    await new Promise(r => setTimeout(r, 1200))
    setInsight({
      gaps: [
        `${comp.name} rarely posts about real client results — your case studies are a direct differentiator`,
        'Their content is mostly tips-based. You can dominate with process/systems content',
        'No visible onboarding offer — your packaged delivery system is a unique angle',
      ],
      threats: [
        `${comp.name} is posting consistently — if you slow down, they take your feed space`,
        'They appear to be lowering price to attract volume — hold your premium positioning',
      ],
      opportunities: [
        'They have no visible LinkedIn PDF carousels — post one this week for 3× reach',
        `Their audience asks questions ${comp.name} ignores — engage those comments directly`,
        'No automation content in their feed — first-mover advantage for you right now',
      ],
    })
    setAnalyzing(false)
  }

  const CONTENT_THEMES = ['AI & Automation', 'Client Wins', 'Process/System', 'Mindset', 'Tips', 'Offers', 'Behind the Scenes']

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,rgba(244,63,94,0.08),rgba(245,158,11,0.08))', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--rose-dark)', marginBottom: '4px' }}>🕵️ Competitor Monitor</p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Track what competitors are doing on LinkedIn. Find the gaps they leave open. Strike where they're weak.
        </p>
      </div>

      {/* Add competitor */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header"><span className="card-title">Add Competitor</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div><label className="label">Name / Handle</label>
            <input className="input" placeholder="John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">LinkedIn URL (optional)</label>
            <input className="input" placeholder="linkedin.com/in/..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
        </div>
        <div className="form-group">
          <label className="label">What they do (their niche)</label>
          <input className="input" placeholder="e.g. AI automation for real estate agents" value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">Notes on their content / strategy</label>
          <textarea className="input textarea" placeholder="What are they posting about? What's working for them? What audiences are they targeting?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: '70px' }} />
        </div>
        <button className="btn btn-primary" disabled={!form.name.trim()} onClick={addComp}><Plus size={14} /> Track Competitor</button>
      </div>

      {/* Competitor list */}
      {comps.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px' }}>
          <div className="empty-icon" style={{ background: 'rgba(244,63,94,0.08)', color: 'var(--rose-dark)' }}><Eye size={22} /></div>
          <p className="empty-title">No competitors tracked yet</p>
          <p className="empty-desc">Add 3–5 people playing in your space. The AI will find where they're weak and show you how to outmaneuver them.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comps.map(comp => (
            <div key={comp.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{comp.name}</div>
                  {comp.niche && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{comp.niche}</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => analyze(comp)} disabled={analyzing && selected?.id === comp.id}>
                    {analyzing && selected?.id === comp.id
                      ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '12px', height: '12px' }} /> Analyzing...</>
                      : <><Brain size={12} /> Analyze Gaps</>}
                  </button>
                  <button onClick={() => { setComps(c => c.filter(x => x.id !== comp.id)); if (selected?.id === comp.id) { setSelected(null); setInsight(null) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}><Trash2 size={13} /></button>
                </div>
              </div>
              {comp.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '8px' }}>{comp.notes}</div>}

              {/* Insight panel */}
              {insight && selected?.id === comp.id && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: '🎯 Opportunities for You', items: insight.opportunities, color: 'var(--green-dark)', bg: 'var(--green-light)' },
                    { label: '🕳 Gaps They\'re Leaving',  items: insight.gaps,         color: 'var(--blue)',       bg: 'var(--blue-light)' },
                    { label: '⚠️ Watch Out For',         items: insight.threats,      color: 'var(--amber-dark)', bg: 'var(--amber-light)' },
                  ].map(section => (
                    <div key={section.label} style={{ background: section.bg, border: `1px solid ${section.color}33`, borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: section.color, marginBottom: '8px' }}>{section.label}</div>
                      {section.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: i < section.items.length - 1 ? '6px' : 0 }}>
                          <span style={{ color: section.color, flexShrink: 0, fontSize: '12px' }}>→</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Constants ─────────────────────────────────────── */
const DRAFTS_KEY = 'ai_os_content_drafts'

function addToDrafts(text) {
  try {
    const existing = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]')
    const draft = { id: Date.now(), text, savedAt: new Date().toLocaleDateString() }
    localStorage.setItem(DRAFTS_KEY, JSON.stringify([draft, ...existing]))
    return true
  } catch { return false }
}

const QUICK_PROMPTS = [
  { label: 'Draft outreach DM',   icon: MessageSquare, desc: 'For a specific LinkedIn lead',     color: 'var(--purple)' },
  { label: 'Analyze my pipeline', icon: TrendingUp,    desc: 'What needs attention right now',   color: 'var(--orange)' },
  { label: 'Generate post idea',  icon: FileText,       desc: "Based on this week's activity",   color: 'var(--blue)'   },
  { label: 'Prep call brief',     icon: Zap,            desc: 'For an upcoming sales call',      color: 'var(--green-dark)' },
  { label: 'Suggest upsell',      icon: TrendingUp,    desc: 'For an existing client',           color: 'var(--amber-dark)' },
  { label: 'Write proposal',      icon: FileText,       desc: 'Personalized for a prospect',     color: 'var(--rose-dark)' },
]

const INTEL_CATEGORIES = ['AI Tools', 'LinkedIn Strategy', 'Coaching Industry', 'Automation', 'Sales']

/* Simulated news items — will be replaced by Make.com feed */
const SAMPLE_INTEL = {
  'AI Tools': [
    { id: 1, title: 'Claude 4 launches with 200K context — what it means for AI Ops consultants', source: 'Anthropic Blog', time: '2 hours ago', hot: true },
    { id: 2, title: 'Make.com adds native AI step — automate lead scoring without code', source: 'Make.com Changelog', time: '1 day ago', hot: false },
    { id: 3, title: 'Notion AI now reads your database automatically — here\'s the workflow', source: 'ProductHunt', time: '3 days ago', hot: false },
  ],
  'LinkedIn Strategy': [
    { id: 4, title: 'LinkedIn algorithm update: document posts getting 3× organic reach this week', source: 'Social Insider', time: '5 hours ago', hot: true },
    { id: 5, title: 'Why your connection requests are getting ignored (and the fix)', source: 'LinkedIn News', time: '2 days ago', hot: false },
  ],
  'Coaching Industry': [
    { id: 6, title: 'Survey: 68% of coaches want AI automation but don\'t know where to start', source: 'Coaching Industry Report', time: '1 day ago', hot: true },
    { id: 7, title: 'High-ticket coaching sales up 40% for consultants using systems — data', source: 'Forbes Coaches Council', time: '4 days ago', hot: false },
  ],
  'Automation': [
    { id: 8, title: 'Zapier vs Make.com 2026: which wins for LinkedIn automation?', source: 'No-Code Weekly', time: '6 hours ago', hot: false },
    { id: 9, title: 'The 5 workflows every solo consultant needs running before end of Q2', source: 'Automation Nation', time: '2 days ago', hot: false },
  ],
  'Sales': [
    { id: 10, title: 'DM-to-call rate hits 18% for consultants who use personalized openers + follow-up sequence', source: 'SalesBold Research', time: '3 days ago', hot: true },
    { id: 11, title: 'Why most coaches lose clients after onboarding (and the 3-step fix)', source: 'Client Retention Digest', time: '5 days ago', hot: false },
  ],
}

const INITIAL_MSG = {
  role: 'ai',
  text: `Good to see you, Ibrahim. I'm your AI business consultant — I have full context on your pipeline, clients, content schedule, and business goals.

Right now I can:
• Draft personalized outreach in your exact voice
• Scan your pipeline and flag what needs attention
• Generate LinkedIn post ideas from your week's activity
• Prep you for any sales call with a custom brief
• Suggest the right upsell for any current client
• Turn market intel into draft content instantly

What are we working on?`,
}

/* ─── Agent Capabilities Widget ─────────────────────── */
function AgentStatus() {
  const CONNECTED = [
    { label: 'Planner',  status: 'live',    note: 'Reading today\'s tasks' },
    { label: 'Pipeline', status: 'live',    note: 'Monitoring lead stages' },
    { label: 'Clients',  status: 'live',    note: 'Tracking delivery progress' },
    { label: 'Content',  status: 'live',    note: 'Drafts & ideas available' },
    { label: 'Claude API', status: 'waiting', note: 'Add key in Vault → Settings' },
    { label: 'Gmail',    status: 'waiting', note: 'Connect in Session 3' },
    { label: 'Notion',   status: 'waiting', note: 'Connect in Session 2' },
  ]

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Agent Access
        </p>
        <span className="ai-chip" style={{ fontSize: '10px' }}>
          <span className="ai-dot" /> Live in app
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {CONNECTED.map(item => (
          <div
            key={item.label}
            title={item.note}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
              background: item.status === 'live' ? 'var(--green-light)' : 'var(--bg)',
              color: item.status === 'live' ? 'var(--green-dark)' : 'var(--text-muted)',
              border: `1px solid ${item.status === 'live' ? 'rgba(0,158,119,0.3)' : 'var(--border)'}`,
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: item.status === 'live' ? 'var(--green-dark)' : 'var(--border)',
            }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Intel Card with Draft ─────────────────────────── */
function IntelCard({ item, onDraftFromNews }) {
  const [drafting, setDrafting] = useState(false)
  const [drafted,  setDrafted]  = useState(false)

  const draftFromNews = async () => {
    setDrafting(true)
    await new Promise(r => setTimeout(r, 900))
    const draft = `📢 This is big: ${item.title}

Here's why this matters for solo consultants and coaches like you:

[Connect your Claude API key in Vault → Settings to get the full AI-written post based on this news, in your exact voice, with a CTA that fits your current offer]

— Ibrahim | AI Ops Consultant`
    addToDrafts(draft)
    onDraftFromNews(draft)
    setDrafted(true)
    setDrafting(false)
    setTimeout(() => setDrafted(false), 4000)
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '12px 14px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg)', border: '1px solid var(--border)',
      gap: '12px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          {item.hot && (
            <span style={{
              flexShrink: 0, fontSize: '9px', fontWeight: '800', padding: '2px 6px',
              borderRadius: '4px', background: '#FFF0EB', color: '#FF6B35',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              🔥 Hot
            </span>
          )}
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {item.title}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', alignItems: 'center' }}>
          <span>{item.source}</span>
          <span>·</span>
          <span>{item.time}</span>
        </div>
      </div>
      <button
        onClick={draftFromNews}
        disabled={drafting || drafted}
        style={{
          flexShrink: 0, padding: '5px 10px', borderRadius: 'var(--radius-sm)',
          border: `1px solid ${drafted ? 'var(--green-dark)' : 'var(--blue-mid)'}`,
          background: drafted ? 'var(--green-light)' : 'var(--blue-light)',
          color: drafted ? 'var(--green-dark)' : 'var(--blue)',
          fontSize: '11px', fontWeight: '600', cursor: drafting || drafted ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
        }}
      >
        {drafting
          ? <><span className="loading-spinner" style={{ borderColor: 'rgba(11,0,133,0.2)', borderTopColor: 'var(--blue)', width: '11px', height: '11px' }} /></>
          : drafted
            ? <><Check size={11} /> Saved to Drafts</>
            : <><PenLine size={11} /> Draft from this</>}
      </button>
    </div>
  )
}

/* ─── Main Export ───────────────────────────────────── */
export default function IntelHub() {
  const [tab,         setTab]      = useState('assistant')
  const [messages,    setMessages] = useState([INITIAL_MSG])
  const [input,       setInput]    = useState('')
  const [thinking,    setThinking] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [draftToast,  setDraftToast] = useState(false)
  const bottomRef = useRef(null)
  const { listening, toggle: toggleVoice, supported: voiceSupported } = useVoice(t => setInput(t))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg }])
    setThinking(true)
    await new Promise(r => setTimeout(r, 1100))
    setThinking(false)
    setMessages(m => [...m, {
      role: 'ai',
      text: `On it — "${msg}".\n\nI can see your current pipeline state, today's planner tasks, and client delivery progress. To respond with real intelligence and take action on your behalf, connect your Claude API key in Vault → Settings.\n\nOnce connected, I'll use your full business context to give you a direct, actionable response — no generic advice.`,
    }])
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleDraftFromNews = (draft) => {
    setDraftToast(true)
    setTimeout(() => setDraftToast(false), 4000)
  }

  const visibleCategories = activeCategory
    ? [activeCategory]
    : INTEL_CATEGORIES

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Intelligence Hub</h1>
          <p className="page-subtitle">Your AI agent. Context-aware. Direct. Built to act.</p>
        </div>
        <div className="page-actions">
          <div className="pill-tabs" style={{ margin: 0 }}>
            <button className={`pill-tab${tab === 'assistant' ? ' active' : ''}`} onClick={() => setTab('assistant')}>
              <Brain size={12} /> Assistant
            </button>
            <button className={`pill-tab${tab === 'intel' ? ' active' : ''}`} onClick={() => setTab('intel')}>
              <TrendingUp size={12} /> Market Intel
            </button>
            <button className={`pill-tab${tab === 'competitors' ? ' active' : ''}`} onClick={() => setTab('competitors')}>
              <Eye size={12} /> Competitors
            </button>
          </div>
        </div>
      </div>

      {/* ── AI ASSISTANT TAB ── */}
      {tab === 'assistant' && (
        <div>
          {/* Agent status */}
          <AgentStatus />

          {/* Quick action chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px', marginBottom: '20px' }}>
            {QUICK_PROMPTS.map(p => {
              const Icon = p.icon
              return (
                <button
                  key={p.label}
                  onClick={() => send(p.label)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'var(--card)',
                    textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.background = 'var(--blue-light)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)' }}
                >
                  <div style={{ width: 28, height: 28, background: 'var(--purple-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: p.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1px' }}>{p.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Chat */}
          <div className="intel-chat">
            <div className="intel-messages">
              {messages.map((m, i) => (
                <div key={i} className={`intel-msg ${m.role}`}>
                  <div className={`intel-avatar ${m.role}`}>
                    {m.role === 'ai' ? 'J' : 'I'}
                  </div>
                  <div className="intel-bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                </div>
              ))}
              {thinking && (
                <div className="intel-msg ai">
                  <div className="intel-avatar ai">J</div>
                  <div className="intel-bubble" style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '12px 16px' }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} style={{ width: '7px', height: '7px', background: 'var(--text-muted)', borderRadius: '50%', animation: `pulse 1s ${d}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Context suggestions */}
            <div className="intel-suggestions">
              {[
                "What should I focus on today?",
                "Draft a follow-up for warm leads",
                "Who needs attention in my pipeline?",
              ].map(s => (
                <button key={s} className="intel-suggestion" onClick={() => send(s)}>{s}</button>
              ))}
            </div>

            <div className="intel-input-area">
              {voiceSupported && (
                <button
                  onClick={() => toggleVoice(input)}
                  title={listening ? 'Stop recording' : 'Speak to AKANBI'}
                  style={{
                    width: '40px', height: '40px', borderRadius: '10px', border: 'none',
                    background: listening ? 'rgba(244,63,94,0.12)' : 'var(--bg)',
                    color: listening ? '#F43F5E' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s',
                    boxShadow: listening ? '0 0 0 3px rgba(244,63,94,0.2)' : 'none',
                    animation: listening ? 'pulse 1.2s infinite' : 'none',
                  }}
                >
                  {listening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
              )}
              <textarea
                className="input"
                style={{ flex: 1, minHeight: '44px', maxHeight: '120px', resize: 'none' }}
                placeholder={listening ? '🎙️ Listening — speak freely, no time limit...' : 'Ask anything — draft a DM, analyze pipeline, write content, prep for a call...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
              />
              <button className="btn btn-primary" onClick={() => send()} disabled={!input.trim() || thinking}>
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* API key notice */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', background: 'var(--amber-light)', border: '1px solid var(--amber)', borderRadius: 'var(--radius-md)' }}>
            <Sparkles size={16} style={{ color: 'var(--amber-dark)', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--amber-dark)', fontWeight: '600' }}>
              Add your Claude API key in <strong>Vault → Settings</strong> to unlock real agent responses.
              All conversation history persists — full access to your pipeline, clients &amp; content data.
            </p>
          </div>
        </div>
      )}

      {/* ── COMPETITOR MONITOR TAB ── */}
      {tab === 'competitors' && <CompetitorMonitor />}

      {/* ── MARKET INTEL TAB ── */}
      {tab === 'intel' && (
        <div>
          {/* Draft saved toast */}
          {draftToast && (
            <div style={{
              marginBottom: '16px', padding: '12px 16px',
              background: 'var(--green-light)', border: '1px solid rgba(0,158,119,0.3)',
              borderRadius: 'var(--radius-md)', display: 'flex', gap: '8px', alignItems: 'center',
              fontSize: '13px', color: 'var(--green-dark)', fontWeight: '600',
            }}>
              <Check size={14} />
              Draft saved to Content Engine → Drafts. You can edit and post it from there.
            </div>
          )}

          {/* Category filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                border: `1px solid ${!activeCategory ? 'var(--blue)' : 'var(--border)'}`,
                background: !activeCategory ? 'var(--blue-light)' : 'var(--card)',
                color: !activeCategory ? 'var(--blue)' : 'var(--text-muted)',
              }}
            >
              All
            </button>
            {INTEL_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(activeCategory === c ? null : c)}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  border: `1px solid ${activeCategory === c ? 'var(--blue)' : 'var(--border)'}`,
                  background: activeCategory === c ? 'var(--blue-light)' : 'var(--card)',
                  color: activeCategory === c ? 'var(--blue)' : 'var(--text-muted)',
                }}
              >
                {c}
              </button>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Intel notice */}
          <div style={{
            display: 'flex', gap: '10px', alignItems: 'center',
            padding: '10px 14px', background: 'var(--blue-light)',
            border: '1px solid var(--blue-mid)', borderRadius: 'var(--radius-md)', marginBottom: '20px',
          }}>
            <Zap size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--blue)', lineHeight: 1.5 }}>
              <strong>Sample intel below</strong> — showing how the feed will look. Real-time curation via Make.com + Claude API activates in Session 3.
              Click <strong>"Draft from this"</strong> on any item to generate &amp; save a LinkedIn post.
            </p>
          </div>

          {/* Categories */}
          {visibleCategories.map(cat => {
            const items = SAMPLE_INTEL[cat] || []
            return (
              <div key={cat} className="card" style={{ marginBottom: '16px' }}>
                <div className="card-header" style={{ marginBottom: '12px' }}>
                  <span className="card-title">{cat}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{items.length} this week</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map(item => (
                    <IntelCard key={item.id} item={item} onDraftFromNews={handleDraftFromNews} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
