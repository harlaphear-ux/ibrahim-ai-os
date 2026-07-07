import { useState, useRef } from 'react'
import {
  DollarSign, Clock, Send, PhoneCall, Users,
  Plus, RefreshCw, Target, Flame, Pencil, X, Check,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

/* ─── Helpers ───────────────────────────────────────────── */
function load(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)) } catch { return fb }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
function getWeekKey() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.getFullYear(), d.getMonth(), diff)
  return monday.toISOString().split('T')[0]
}

/* ─── Default mission ───────────────────────────────────── */
const DEFAULT_MISSION = {
  northStar: '',
  monthly: { revenue: 3000, clients: 2 },
  weekly: {
    inputs: [
      { id: 'i1', label: 'Outreach sent',  target: 100, emoji: '📤' },
      { id: 'i2', label: 'Content posts',  target: 3,   emoji: '✍️' },
    ],
    outputs: [
      { id: 'o1', label: 'Open to offer',     target: 5, emoji: '🎯' },
      { id: 'o2', label: 'Discovery calls',   target: 2, emoji: '📞' },
    ],
  },
}

/* ─── Live data ─────────────────────────────────────────── */
function useLiveData() {
  const leads      = load('ai_os_pipeline_leads', [])
  const clients    = load('ai_os_clients', [])
  const today      = new Date().toISOString().split('T')[0]
  const plannerAll = load('ai_os_planner_tasks', {})
  const todayTasks = plannerAll[today] || []
  const revenue    = load('ai_os_vault_revenue', [])
  const drafts     = load('ai_os_content_drafts', [])
  const mission    = load('ai_os_mission', DEFAULT_MISSION)
  const allProgress = load('ai_os_mission_progress', {})
  const weekProgress = allProgress[getWeekKey()] || {}

  const revenueGoal = parseFloat(mission?.monthly?.revenue || 3000)
  const clientGoal  = parseInt(mission?.monthly?.clients  || 2)

  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeftInMonth = lastDay - now.getDate()
  const dayOfWeek = now.getDay() // 0=Sun
  const daysLeftInWeek = dayOfWeek === 0 ? 0 : 7 - dayOfWeek // days after today until Sunday

  const daysSince  = d => Math.floor((Date.now() - new Date(d || Date.now()).getTime()) / 86400000)
  const overdueLeads   = leads
    .filter(l => daysSince(l.lastContact) >= 5 && l.stage !== 'closed')
    .map(l => ({ ...l, days: daysSince(l.lastContact) }))
  const bookedLeads    = leads.filter(l => l.stage === 'booked')
  const activePipeline = leads.filter(l => l.stage !== 'closed')
  const todayMonth     = today.slice(0, 7)
  const monthRevenue   = revenue
    .filter(r => (r.date || '').startsWith(todayMonth) && r.type === 'Collected')
    .reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  const STAGE_SCORES = { replied: 10, active: 25, problem: 40, reengagement: 30, followup: 45, booked: 75, closed: 100 }
  const hotLeads = activePipeline
    .map(l => {
      const base  = STAGE_SCORES[l.stage] || 10
      const decay = Math.max(0, 20 - daysSince(l.lastContact) * 2)
      const notes = (l.notes || '').toLowerCase()
      const boost = ['interested', 'yes', 'ready', 'budget', 'call', 'proposal', 'when', 'how much', 'send']
        .filter(w => notes.includes(w)).length * 5
      return { ...l, score: Math.min(98, base + decay + boost), days: daysSince(l.lastContact) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    leads, clients, overdueLeads, bookedLeads,
    hotLeads, monthRevenue, revenueGoal, clientGoal, mission, weekProgress,
    daysLeftInMonth, daysLeftInWeek,
    pendingTasks: todayTasks.filter(t => !t.done),
    doneTasks:    todayTasks.filter(t => t.done),
    todayTasks, drafts,
    waitingOnMe: clients.filter(c => !c.waitingOnClient),
  }
}

/* ─── Briefing generator ────────────────────────────────── */
function generateBriefing(data) {
  const bullets = []
  const hour    = new Date().getHours()
  const mission = data.mission || DEFAULT_MISSION
  const wp      = data.weekProgress || {}
  const inputs  = mission?.weekly?.inputs  || []
  const outputs = mission?.weekly?.outputs || []
  const revenueGap     = Math.max(0, data.revenueGoal - data.monthRevenue)
  const clientGap      = Math.max(0, data.clientGoal - data.clients.length)
  const daysInMonth    = data.daysLeftInMonth ?? 15
  const daysInWeek     = Math.max(1, (data.daysLeftInWeek ?? 3) + 1) // include today

  // ── 1. CLOSE NOW — booked leads are money sitting on the table ──
  if (data.bookedLeads.length > 0) {
    const names = data.bookedLeads.map(l => l.name).join(' & ')
    bullets.push({
      type: 'fire',
      text: `CLOSE TODAY: ${names} ${data.bookedLeads.length === 1 ? 'is' : 'are'} at booking stage right now. Send your proposal or contract before anything else. Every hour you wait gives them time to cool off or hear from a competitor.`,
    })
  }

  // ── 2. REVENUE GAP — specific path to hit it ──
  if (revenueGap > 0) {
    const hottest = data.hotLeads[0]
    const dealsNeeded = Math.ceil(revenueGap / 1500)
    let text = `$${revenueGap.toLocaleString()} gap to your $${data.revenueGoal.toLocaleString()} target — ${daysInMonth} days left this month.`
    if (hottest && hottest.score >= 50) {
      text += ` Your fastest path: ${hottest.name} is at ${hottest.score}% close probability (${hottest.stage} stage, ${hottest.days}d since contact). Reach out today with a concrete offer or next step.`
    } else if (data.activePipeline?.length > 0 || data.leads.filter(l => l.stage !== 'closed').length > 0) {
      const activeCt = data.leads.filter(l => l.stage !== 'closed').length
      text += ` You have ${activeCt} active lead${activeCt > 1 ? 's' : ''} in your pipeline. Move at least one forward today — book a call, send a proposal, or get a decision.`
    } else {
      text += ` Your pipeline is empty. No pipeline = no revenue. Add 5 prospects to CRM Pipeline today — that's your single most important task right now.`
    }
    bullets.push({ type: 'revenue', text })
  } else if (data.monthRevenue >= data.revenueGoal && data.revenueGoal > 0) {
    bullets.push({ type: 'win', text: `Target crushed — $${data.monthRevenue.toLocaleString()} against a $${data.revenueGoal.toLocaleString()} goal. Raise your target in Mission Control. Winners always raise the bar.` })
  }

  // ── 3. OVERDUE follow-ups — named, with what to do ──
  if (data.overdueLeads.length > 0) {
    const top = data.overdueLeads[0]
    let action = ''
    if (top.stage === 'problem')      action = `They shared a problem with you — follow up with a specific solution or framework. Warm lead, don't waste it.`
    else if (top.stage === 'booked')  action = `They booked with you. Send the proposal NOW — this should have gone already.`
    else if (top.stage === 'followup' || top.stage === 'active') action = `Send a value-first message: one useful insight, one direct question. No pitch. Stay alive in their mind.`
    else                              action = `A 2-minute check-in message keeps you alive in their mind. It costs nothing and could be worth $1,500+.`
    const extra = data.overdueLeads.length > 1 ? ` (+${data.overdueLeads.length - 1} more overdue after that)` : ''
    bullets.push({
      type: 'alert',
      text: `${top.name} hasn't heard from you in ${top.days} days (${top.stage} stage). ${action}${extra}`,
    })
  }

  // ── 4. INPUT GOAL PACE — hold the discipline line ──
  const outreachGoal = inputs.find(g => g.label.toLowerCase().includes('outreach') || g.label.toLowerCase().includes('message') || g.label.toLowerCase().includes('prospect'))
  if (outreachGoal) {
    const done      = wp[outreachGoal.id] || 0
    const remaining = outreachGoal.target - done
    if (remaining > 0) {
      const perDay = Math.ceil(remaining / daysInWeek)
      bullets.push({
        type: 'task',
        text: `Outreach: ${done}/${outreachGoal.target} this week. You need ${remaining} more — that's ${perDay}/day for the next ${daysInWeek} day${daysInWeek !== 1 ? 's' : ''}. Block 30 min right now, open LinkedIn, send ${Math.min(perDay, 25)} messages today. Discipline beats motivation every time.`,
      })
    } else {
      bullets.push({ type: 'win', text: `Outreach goal locked — ${done}/${outreachGoal.target} messages sent this week. Your input discipline is on point. Now check your output: are people responding?` })
    }
  } else if (inputs.length === 0 && data.leads.length === 0) {
    bullets.push({
      type: 'task',
      text: `No input goals set and pipeline is empty — two problems. Fix both now: (1) Go to Mission Control → Edit Goals and set your weekly outreach target. (2) Add your first 5 leads to CRM Pipeline. These two actions are the foundation of everything.`,
    })
  }

  // ── 5. CLIENT DELIVERY — retention is cheap revenue ──
  if (data.waitingOnMe.length > 0) {
    const name = data.waitingOnMe[0]?.name || 'your client'
    bullets.push({
      type: 'client',
      text: `${data.waitingOnMe.length} client${data.waitingOnMe.length > 1 ? 's' : ''} in active delivery — the ball is in your court on ${name}. Deliver something tangible today. A client who sees consistent results is a client who renews, refers, and upgrades. Don't let delivery slip.`,
    })
  } else if (clientGap > 0 && data.clients.length === 0) {
    bullets.push({
      type: 'client',
      text: `You need ${clientGap} client${clientGap > 1 ? 's' : ''} to hit your target and you have zero right now. Your next client is already in your pipeline or in your network. Who have you talked to in the last 7 days that could become a client this month? Follow up with them today.`,
    })
  }

  // ── 6. CONTENT — only if it's tied to a goal ──
  const contentGoal = inputs.find(g => g.label.toLowerCase().includes('content') || g.label.toLowerCase().includes('post') || g.label.toLowerCase().includes('linkedin'))
  if (contentGoal) {
    const done      = wp[contentGoal.id] || 0
    const remaining = contentGoal.target - done
    if (remaining > 0 && data.drafts.length > 0) {
      bullets.push({
        type: 'content',
        text: `${data.drafts.length} draft${data.drafts.length > 1 ? 's' : ''} ready in Content Engine. Post one now — you need ${remaining} more this week to hit your content goal. ${hour < 11 ? 'Morning is peak LinkedIn time.' : hour < 15 ? 'Schedule it for 5pm — peak engagement window.' : 'Evening posting works. Go now.'}`,
      })
    } else if (remaining > 0) {
      bullets.push({
        type: 'content',
        text: `Content goal: ${done}/${contentGoal.target} posts this week with ${remaining} to go. Open Content Engine, generate one post, post it. 10 minutes. Content is long-game outreach — it works while you sleep.`,
      })
    }
  }

  // ── 7. No data yet — give the full setup path ──
  if (bullets.length === 0) {
    bullets.push({
      type: 'task',
      text: `Pipeline is empty. Your #1 move today: find 5 real prospects on LinkedIn who match your ideal client and add them to CRM Pipeline. Not tomorrow — now. No pipeline = no revenue = no business.`,
    })
    bullets.push({
      type: 'content',
      text: `No content posted this week. Open Content Engine and generate one LinkedIn post in the next 10 minutes. Post it. Content builds inbound while you sleep — one post today is better than zero.`,
    })
  }

  return bullets.slice(0, 5)
}

const BULLET_STYLES = {
  fire:    { icon: '🔥', color: '#FF6B35' },
  alert:   { icon: '⚠️', color: '#F59E0B' },
  revenue: { icon: '💰', color: '#00C896' },
  task:    { icon: '📋', color: '#0b0085'  },
  client:  { icon: '👥', color: '#7B5EA7' },
  content: { icon: '✍️', color: '#3A10C8'  },
  win:     { icon: '🏆', color: '#00C896' },
}

/* ─── Deal Predictor ────────────────────────────────────── */
function DealPredictor({ hotLeads }) {
  if (hotLeads.length === 0) return (
    <div className="empty-state" style={{ padding: '24px' }}>
      <div className="empty-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}><Flame size={22} /></div>
      <p className="empty-title">No leads yet</p>
      <p className="empty-desc">Add leads to your Pipeline and the AI will score and rank them for you.</p>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {hotLeads.map((lead, i) => {
        const color = lead.score >= 70 ? '#00C896' : lead.score >= 45 ? '#F59E0B' : '#64748B'
        return (
          <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--blue)' : 'var(--border)', color: i === 0 ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{lead.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.stage.replace(/_/g, ' ')} · {lead.days === 0 ? 'contacted today' : `${lead.days}d since contact`}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color }}>{lead.score}%</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>close prob.</div>
            </div>
            <svg viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)', width: 40, height: 40, flexShrink: 0 }}>
              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="4" />
              <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${lead.score} 100`} strokeLinecap="round" pathLength="100" />
            </svg>
          </div>
        )
      })}
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>Score = stage × recency × keyword signals in notes</p>
    </div>
  )
}

/* ─── Goals Setup Modal ─────────────────────────────────── */
function GoalsModal({ mission, onSave, onClose }) {
  const [tab,       setTab]       = useState('monthly')
  const [monthly,   setMonthly]   = useState({ revenue: mission?.monthly?.revenue || 3000, clients: mission?.monthly?.clients || 2 })
  const [northStar, setNorthStar] = useState(mission?.northStar || '')
  const [inputs,    setInputs]    = useState(mission?.weekly?.inputs  || DEFAULT_MISSION.weekly.inputs)
  const [outputs,   setOutputs]   = useState(mission?.weekly?.outputs || DEFAULT_MISSION.weekly.outputs)
  const [newIn,  setNewIn]  = useState({ label: '', target: '', emoji: '📤' })
  const [newOut, setNewOut] = useState({ label: '', target: '', emoji: '🎯' })

  const addGoal = (type) => {
    const g = type === 'input' ? newIn : newOut
    if (!g.label.trim() || !g.target) return
    const item = { id: `${type[0]}${Date.now()}`, label: g.label, target: parseInt(g.target), emoji: g.emoji || (type === 'input' ? '📤' : '🎯') }
    if (type === 'input') { setInputs(p => [...p, item]); setNewIn({ label: '', target: '', emoji: '📤' }) }
    else                  { setOutputs(p => [...p, item]); setNewOut({ label: '', target: '', emoji: '🎯' }) }
  }

  const handleSave = () => {
    const updated = {
      ...mission,
      northStar,
      monthly: { revenue: parseFloat(monthly.revenue) || 3000, clients: parseInt(monthly.clients) || 2 },
      weekly: { inputs, outputs },
    }
    save('ai_os_mission', updated)
    save('ibrahim_goals', { revenue: String(monthly.revenue), clients: String(monthly.clients) })
    onSave(updated)
  }

  const GoalItem = ({ g, type }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', marginBottom: '6px', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: '15px' }}>{g.emoji}</span>
      <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{g.label}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{g.target}/week</span>
      <button onClick={() => type === 'input' ? setInputs(p => p.filter(i => i.id !== g.id)) : setOutputs(p => p.filter(i => i.id !== g.id))}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}>
        <X size={13} />
      </button>
    </div>
  )

  const AddRow = ({ val, setVal, type }) => (
    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
      <input className="input" value={val.emoji} onChange={e => setVal(p => ({ ...p, emoji: e.target.value }))}
        style={{ width: '44px', textAlign: 'center', padding: '6px', flexShrink: 0, fontSize: '14px' }} maxLength={2} />
      <input className="input" value={val.label} onChange={e => setVal(p => ({ ...p, label: e.target.value }))}
        placeholder={type === 'input' ? 'Activity name…' : 'Result name…'} style={{ flex: 1 }}
        onKeyDown={e => e.key === 'Enter' && addGoal(type)} />
      <input className="input" type="number" value={val.target} onChange={e => setVal(p => ({ ...p, target: e.target.value }))}
        placeholder="/wk" style={{ width: '66px', flexShrink: 0 }}
        onKeyDown={e => e.key === 'Enter' && addGoal(type)} />
      <button className="btn btn-primary btn-sm" onClick={() => addGoal(type)}>Add</button>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: '16px', width: '540px', maxHeight: '82vh', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Set Up Your Mission</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Define what winning looks like this month and this week</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', padding: '14px 24px 0' }}>
          {[['monthly', '📅 Monthly Mission'], ['weekly', '⚡ Weekly Targets']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: '8px 8px 0 0', fontSize: '12px', fontWeight: '700', border: 'none',
              cursor: 'pointer', background: tab === t ? 'var(--bg)' : 'transparent',
              color: tab === t ? 'var(--blue)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'var(--border)'}`,
            }}>{label}</button>
          ))}
          <div style={{ flex: 1, borderBottom: '2px solid var(--border)' }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          {tab === 'monthly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>💰 Revenue Target this Month (USD)</label>
                <input className="input" type="number" value={monthly.revenue} onChange={e => setMonthly(p => ({ ...p, revenue: e.target.value }))} placeholder="e.g. 5000" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>👥 Active Clients Target</label>
                <input className="input" type="number" value={monthly.clients} onChange={e => setMonthly(p => ({ ...p, clients: e.target.value }))} placeholder="e.g. 3" />
              </div>
              <div style={{ padding: '14px', background: 'linear-gradient(135deg, rgba(11,0,133,0.06), rgba(58,16,200,0.1))', borderRadius: '10px', border: '1px solid rgba(58,16,200,0.15)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                  These track automatically from your Pipeline (revenue) and Clients tab. Set ambitious but achievable targets — AKANBI will hold you to them.
                </p>
              </div>
            </div>
          )}

          {tab === 'weekly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* North Star */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>🌟 Weekly North Star</label>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px' }}>One sentence — what does winning this week look like?</p>
                <textarea className="input" rows={2} value={northStar}
                  onChange={e => setNorthStar(e.target.value)}
                  placeholder="e.g. Do 100 outreach and get 5 people open to my offer"
                  style={{ resize: 'none', lineHeight: '1.6' }} />
              </div>

              {/* Input Goals */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📥 Input Goals — What you control</div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px' }}>Activities you commit to doing regardless of results. This is discipline.</p>
                {inputs.map(g => <GoalItem key={g.id} g={g} type="input" />)}
                <AddRow val={newIn} setVal={setNewIn} type="input" />
              </div>

              {/* Output Goals */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📤 Output Goals — What you're measuring</div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px' }}>Results that happen because of your inputs. Track these, don't stress about them.</p>
                {outputs.map(g => <GoalItem key={g.id} g={g} type="output" />)}
                <AddRow val={newOut} setVal={setNewOut} type="output" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Mission</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Monthly goal bar ──────────────────────────────────── */
function GoalBar({ label, value, target, color, format }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const fmt = format || (v => String(v))
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
          {fmt(value)} / {fmt(target)} — <span style={{ color: `var(--${color === 'green' ? 'green-dark' : color})`, fontWeight: '700' }}>{pct}%</span>
        </span>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ─── Weekly goal row (with inline log) ─────────────────── */
function WeeklyGoalRow({ goal, weekProgress, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [val,     setVal]     = useState('')
  const inputRef = useRef(null)

  const current = weekProgress[goal.id] || 0
  const pct     = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0
  const done    = current >= goal.target
  const barCol  = done ? '#00C896' : 'var(--blue)'

  const commit = (raw) => {
    const n = Math.max(0, parseInt(raw) || 0)
    onUpdate(goal.id, n)
    setEditing(false)
  }

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
        <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>{goal.emoji}</span>
        <span style={{ flex: 1, fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{goal.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              autoFocus
              value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={() => commit(val)}
              onKeyDown={e => { if (e.key === 'Enter') commit(val); if (e.key === 'Escape') setEditing(false) }}
              style={{ width: '46px', padding: '2px 6px', fontSize: '12px', fontWeight: '800', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--blue)', background: 'var(--bg)', color: 'var(--text-primary)' }}
            />
          ) : (
            <button
              onClick={() => { setVal(String(current)); setEditing(true) }}
              title="Click to set value"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800', color: done ? '#00C896' : 'var(--text-primary)', padding: 0, lineHeight: 1, minWidth: '18px', textAlign: 'right' }}
            >{current}</button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>/ {goal.target}</span>
          <span style={{ fontSize: '11px', fontWeight: '700', color: done ? '#00C896' : 'var(--text-muted)', minWidth: '28px', textAlign: 'right' }}>{pct}%</span>
          <button
            onClick={() => onUpdate(goal.id, current + 1)}
            title="Quick +1"
            style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '900', flexShrink: 0, lineHeight: 1 }}
          >+</button>
        </div>
      </div>
      <div className="progress-bar">
        <div style={{ height: '100%', width: `${pct}%`, background: barCol, borderRadius: '4px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

/* ─── Mission Control Card ──────────────────────────────── */
function MissionControl({ data, onEditGoals }) {
  const weekKey = getWeekKey()
  const [progress, setProgress] = useState(() => load('ai_os_mission_progress', {}))
  const weekProgress = progress[weekKey] || {}

  const updateProgress = (id, val) => {
    const updated = { ...progress, [weekKey]: { ...weekProgress, [id]: val } }
    setProgress(updated)
    save('ai_os_mission_progress', updated)
  }

  const mission = data.mission
  const inputs  = mission?.weekly?.inputs  || []
  const outputs = mission?.weekly?.outputs || []

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Target size={15} style={{ color: 'var(--blue)' }} /> Mission Control
        </span>
        <button
          onClick={onEditGoals}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
        >
          <Pencil size={11} /> Edit Goals
        </button>
      </div>

      {/* Monthly */}
      <div style={{ paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '12px' }}>Monthly Mission</div>
        <GoalBar label="Revenue ($)" value={Math.round(data.monthRevenue)} target={data.revenueGoal} color="green" format={v => `$${v.toLocaleString()}`} />
        <GoalBar label="Active Clients" value={data.clients.length} target={data.clientGoal} color="blue" />
      </div>

      {/* Weekly Input + Output */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 30px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Input Goals <span style={{ fontWeight: '500', opacity: 0.75 }}>— what you control</span>
          </div>
          {inputs.length === 0
            ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Click Edit Goals to set up your weekly activities</p>
            : inputs.map(g => <WeeklyGoalRow key={g.id} goal={g} weekProgress={weekProgress} onUpdate={updateProgress} />)
          }
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Output Goals <span style={{ fontWeight: '500', opacity: 0.75 }}>— what you're measuring</span>
          </div>
          {outputs.length === 0
            ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Click Edit Goals to set up your weekly targets</p>
            : outputs.map(g => <WeeklyGoalRow key={g.id} goal={g} weekProgress={weekProgress} onUpdate={updateProgress} />)
          }
        </div>
      </div>

      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right', margin: '10px 0 0' }}>
        Click number to edit · [+] quick +1 · Resets every Monday
      </p>
    </div>
  )
}

/* ─── Main CommandCenter ────────────────────────────────── */
export default function CommandCenter() {
  const data       = useLiveData()
  const [briefing,   setBriefing]   = useState(() => generateBriefing(data))
  const [refreshing, setRefreshing] = useState(false)
  const [newTask,    setNewTask]    = useState('')
  const [goalsOpen,  setGoalsOpen]  = useState(false)
  const [mission,    setMission]    = useState(() => load('ai_os_mission', DEFAULT_MISSION))
  const [editingNS,  setEditingNS]  = useState(false)
  const [nsVal,      setNsVal]      = useState(mission?.northStar || '')

  const today    = new Date().toISOString().split('T')[0]
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dayName  = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const dateFull = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const liveData = { ...data, mission }

  const refresh = async () => {
    setRefreshing(true)
    await new Promise(r => setTimeout(r, 800))
    setBriefing(generateBriefing(useLiveData()))
    setRefreshing(false)
  }

  const addTask = () => {
    if (!newTask.trim()) return
    const all = load('ai_os_planner_tasks', {})
    const updated = [...(all[today] || []), { id: Date.now(), text: newTask, done: false, type: 'task' }]
    all[today] = updated
    save('ai_os_planner_tasks', all)
    setNewTask('')
    setBriefing(generateBriefing(useLiveData()))
  }

  const toggleTask = (id) => {
    const all = load('ai_os_planner_tasks', {})
    all[today] = (all[today] || []).map(t => t.id === id ? { ...t, done: !t.done } : t)
    save('ai_os_planner_tasks', all)
    setBriefing(generateBriefing(useLiveData()))
  }

  const saveNorthStar = () => {
    const updated = { ...mission, northStar: nsVal }
    setMission(updated)
    save('ai_os_mission', updated)
    setEditingNS(false)
  }

  const handleGoalsSave = (updated) => {
    setMission(updated)
    setNsVal(updated.northStar || '')
    setGoalsOpen(false)
  }

  const CHART_DATA = [
    { month: 'Dec', value: 0 }, { month: 'Jan', value: 0 },
    { month: 'Feb', value: 0 }, { month: 'Mar', value: 0 },
    { month: 'Apr', value: 0 }, { month: 'May', value: Math.round(data.monthRevenue) },
  ]

  const METRICS = [
    { label: 'Revenue This Month', value: `$${data.monthRevenue.toLocaleString()}`, icon: DollarSign, color: 'green'  },
    { label: 'Overdue Follow-ups', value: String(data.overdueLeads.length),          icon: Clock,       color: 'orange' },
    { label: 'Pipeline Leads',     value: String(data.leads.filter(l => l.stage !== 'closed').length), icon: Send, color: 'blue' },
    { label: 'Booked Calls',       value: String(data.bookedLeads.length),            icon: PhoneCall,   color: 'purple' },
    { label: 'Active Clients',     value: String(data.clients.length),               icon: Users,       color: 'amber'  },
  ]

  return (
    <div>
      {/* ── BRIEFING HERO ── */}
      <div className="briefing-card">
        <div className="briefing-date">{dayName.toUpperCase()} · {dateFull}</div>
        <div className="briefing-greeting">{greeting}, Ibrahim.</div>

        {/* Weekly North Star */}
        <div style={{ margin: '12px 0', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', flexShrink: 0 }}>🌟</span>
          {editingNS ? (
            <>
              <input
                autoFocus
                value={nsVal}
                onChange={e => setNsVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveNorthStar(); if (e.key === 'Escape') setEditingNS(false) }}
                placeholder="This week I will…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.95)', caretColor: 'white' }}
              />
              <button onClick={saveNorthStar} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '700' }}>
                <Check size={11} /> Save
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: nsVal ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)', fontStyle: nsVal ? 'normal' : 'italic', lineHeight: 1.5 }}>
                {nsVal || 'Set your weekly north star — what does winning this week look like?'}
              </span>
              <button onClick={() => { setNsVal(mission?.northStar || ''); setEditingNS(true) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: '2px', display: 'flex', flexShrink: 0 }}>
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>

        <div className="briefing-body">Here's what matters right now:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '16px' }}>
          {briefing.map((b, i) => {
            const style = BULLET_STYLES[b.type] || BULLET_STYLES.task
            return (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', border: `1px solid ${style.color}44` }}>
                <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1.3 }}>{style.icon}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.92)', lineHeight: '1.6' }}>{b.text}</span>
              </div>
            )
          })}
        </div>

        <div className="briefing-actions">
          <button className="briefing-btn briefing-btn-white" onClick={refresh} disabled={refreshing}>
            {refreshing
              ? <span className="loading-spinner" style={{ borderColor: 'rgba(0,119,181,0.3)', borderTopColor: 'var(--blue)', width: '14px', height: '14px' }} />
              : <RefreshCw size={14} />}
            {refreshing ? 'Refreshing...' : 'Refresh Briefing'}
          </button>
        </div>
      </div>

      {/* ── METRICS ── */}
      <div className="metric-grid">
        {METRICS.map(m => {
          const Icon = m.icon
          return (
            <div key={m.label} className={`metric-card ${m.color}`}>
              <div className={`metric-icon ${m.color}`}><Icon size={17} /></div>
              <div className="metric-value">{m.value}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          )
        })}
      </div>

      {/* ── MISSION CONTROL (full width) ── */}
      <MissionControl data={liveData} onEditGoals={() => setGoalsOpen(true)} />

      {/* ── BOTTOM GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Deal Predictor */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={15} style={{ color: '#FF6B35' }} /> Deal Predictor
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hottest leads</span>
          </div>
          <DealPredictor hotLeads={data.hotLeads} />
        </div>

        {/* Today's Tasks */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Today's Tasks</span>
            <span style={{ fontSize: '11px', color: 'var(--green-dark)', fontWeight: '700' }}>{data.doneTasks.length}/{data.todayTasks.length} done</span>
          </div>
          {data.todayTasks.length === 0
            ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>No tasks yet — add one below or plan in Planner tab</p>
            : data.todayTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => toggleTask(t.id)}>
                <div className={`task-check${t.done ? ' done' : ''}`}>{t.done && <span style={{ fontSize: '9px' }}>✓</span>}</div>
                <div style={{ flex: 1 }}>
                  <span className={`task-text${t.done ? ' done' : ''}`} style={{ fontSize: '12px' }}>{t.text}</span>
                  {t.type && t.type !== 'task' && <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>{t.type}</span>}
                </div>
              </div>
            ))
          }
          <div className="input-row" style={{ marginTop: '10px' }}>
            <input className="input" placeholder="Quick add task for today..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} style={{ fontSize: '12px' }} />
            <button className="btn btn-primary btn-sm btn-icon" onClick={addTask}><Plus size={13} /></button>
          </div>
        </div>
      </div>

      {/* ── REVENUE CHART ── */}
      <div className="chart-card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Revenue — Last 6 Months</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Log in Vault → Revenue to populate</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={CHART_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }} formatter={v => [`$${v}`, 'Revenue']} />
            <Area type="monotone" dataKey="value" stroke="var(--blue)" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── GOALS MODAL ── */}
      {goalsOpen && (
        <GoalsModal
          mission={mission}
          onSave={handleGoalsSave}
          onClose={() => setGoalsOpen(false)}
        />
      )}
    </div>
  )
}
