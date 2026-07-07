import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp, RefreshCw, Download, Plus, Target, Users, DollarSign, Send } from 'lucide-react'

/* ─── Load helper ──────────────────────────────────────── */
function load(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb)) } catch { return fb }
}

/* ─── Derive all analytics from localStorage ────────────── */
function useAnalyticsData() {
  const leads   = load('ai_os_pipeline_leads', [])
  const clients = load('ai_os_clients', [])
  const revenue = load('ai_os_vault_revenue', [])
  const drafts  = load('ai_os_content_drafts', [])
  const mission = load('ai_os_mission', {})
  const allProgress = load('ai_os_mission_progress', {})

  // Revenue by month (last 6 months)
  const now = new Date()
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const total = revenue
      .filter(r => (r.date || '').startsWith(key) && r.type === 'Collected')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    return { month: d.toLocaleDateString('en-US', { month: 'short' }), value: Math.round(total) }
  })

  // Pipeline stage breakdown
  const STAGE_LABELS = {
    replied:      '💬 Replied',
    active:       '🔥 Active',
    problem:      '🎯 Problem',
    reengagement: '♻️ Reengage',
    followup:     '⏰ Follow Up',
    booked:       '📅 Booked',
    closed:       '✅ Closed',
  }
  const stageCounts = Object.entries(STAGE_LABELS).map(([key, label]) => ({
    stage: label.split(' ').slice(1).join(' '),
    count: leads.filter(l => l.stage === key).length,
    color: ['#0077B5','#F59E0B','#7B5EA7','#FF6B35','#F43F5E','#3A10C8','#00C896'][Object.keys(STAGE_LABELS).indexOf(key)],
  }))

  // Key metrics
  const closedDeals  = leads.filter(l => l.stage === 'closed').length
  const totalRevenue = revenue.filter(r => r.type === 'Collected').reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const avgDealSize  = closedDeals > 0 ? Math.round(totalRevenue / closedDeals) : 0
  const activeLeads  = leads.filter(l => l.stage !== 'closed').length
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthRevenue = revenue
    .filter(r => (r.date || '').startsWith(thisMonthKey) && r.type === 'Collected')
    .reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const revenueGoal  = parseFloat(mission?.monthly?.revenue || 3000)

  // Weekly goal progress (last 4 weeks)
  const weeklyInputs = mission?.weekly?.inputs || []
  const weeklyProgress = Object.entries(allProgress).slice(-4).map(([weekKey, progress]) => {
    const weekStart = new Date(weekKey)
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const outreachGoal = weeklyInputs.find(g => g.label.toLowerCase().includes('outreach'))
    const contentGoal  = weeklyInputs.find(g => g.label.toLowerCase().includes('content') || g.label.toLowerCase().includes('post'))
    return {
      week: label,
      outreach: outreachGoal ? (progress[outreachGoal.id] || 0) : 0,
      content:  contentGoal  ? (progress[contentGoal.id]  || 0) : 0,
    }
  })

  // Pipeline value estimate
  const STAGE_VALUE_MULTIPLIER = { replied: 0.05, active: 0.15, problem: 0.3, reengagement: 0.2, followup: 0.35, booked: 0.65, closed: 1 }
  const pipelineValue = leads.reduce((s, l) => s + ((STAGE_VALUE_MULTIPLIER[l.stage] || 0) * avgDealSize || 0), 0)

  // Conversion: active → booked → closed
  const bookedCount = leads.filter(l => l.stage === 'booked' || l.stage === 'closed').length
  const bookRate    = activeLeads + bookedCount > 0 ? Math.round((bookedCount / (activeLeads + bookedCount)) * 100) : 0
  const closeRate   = bookedCount > 0 ? Math.round((closedDeals / bookedCount) * 100) : 0

  return {
    revenueByMonth, stageCounts, weeklyProgress,
    closedDeals, totalRevenue, avgDealSize, activeLeads,
    monthRevenue, revenueGoal, clients,
    drafts, pipelineValue, bookRate, closeRate,
  }
}

const TOOLTIP_STYLE = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }

export default function Analytics() {
  const [tab,        setTab]        = useState('overview')
  const [generating, setGenerating] = useState(false)
  const d = useAnalyticsData()

  const genReport = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1200))
    setGenerating(false)
  }

  const pct = d.revenueGoal > 0 ? Math.min(100, Math.round((d.monthRevenue / d.revenueGoal) * 100)) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Live business intelligence — built from your actual data</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => {}}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" onClick={genReport} disabled={generating}>
            {generating
              ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Generating...</>
              : <><RefreshCw size={14} /> Generate Report</>}
          </button>
        </div>
      </div>

      <div className="pill-tabs">
        {['overview', 'pipeline', 'activity', 'feedback'].map(t => (
          <button key={t} className={`pill-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div className="metric-grid" style={{ marginBottom: '20px' }}>
            {[
              { label: 'Month Revenue',  value: `$${d.monthRevenue.toLocaleString()}`, hint: `${pct}% of $${d.revenueGoal.toLocaleString()} goal`, icon: DollarSign, color: 'green'  },
              { label: 'Deals Closed',   value: String(d.closedDeals),                 hint: `All-time closes`,                                     icon: Target,     color: 'blue'   },
              { label: 'Avg Deal Size',  value: d.avgDealSize > 0 ? `$${d.avgDealSize.toLocaleString()}` : '—', hint: 'Revenue ÷ closed deals',     icon: TrendingUp, color: 'purple' },
              { label: 'Active Clients', value: String(d.clients.length),               hint: `${d.clients.filter(c => !c.waitingOnClient).length} needing delivery`, icon: Users, color: 'amber' },
            ].map(m => {
              const Icon = m.icon
              return (
                <div key={m.label} className={`metric-card ${m.color}`}>
                  <div className={`metric-icon ${m.color}`}><Icon size={16} /></div>
                  <div className="metric-value">{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px' }}>{m.hint}</div>
                </div>
              )
            })}
          </div>

          {/* Monthly revenue target progress */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <span className="card-title">This Month: Revenue vs Target</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: pct >= 100 ? 'var(--green-dark)' : 'var(--text-muted)' }}>{pct}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <div className="progress-bar" style={{ height: '12px', borderRadius: '8px' }}>
                  <div className="progress-fill green" style={{ width: `${pct}%`, borderRadius: '8px' }} />
                </div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                ${d.monthRevenue.toLocaleString()} / ${d.revenueGoal.toLocaleString()}
              </span>
            </div>
            {pct < 100 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                ${(d.revenueGoal - d.monthRevenue).toLocaleString()} remaining — estimated pipeline value: <strong style={{ color: 'var(--text-primary)' }}>${Math.round(d.pipelineValue).toLocaleString()}</strong>
              </p>
            )}
          </div>

          {/* Revenue trend */}
          <div className="chart-card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <span className="card-title">Revenue — Last 6 Months</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>From Vault → Revenue</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={d.revenueByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`$${v}`, 'Revenue']} />
                <Area type="monotone" dataKey="value" stroke="var(--blue)" strokeWidth={2.5} fill="url(#revGrad2)" dot={{ fill: 'var(--blue)', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
            {d.totalRevenue === 0 && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>Log payments in Vault → Revenue to populate this chart</p>
            )}
          </div>

          {/* Pipeline conversion summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Pipeline → Booked Rate', value: `${d.bookRate}%`, sub: `${d.clients.length + d.closedDeals} total qualified`, color: '#3A10C8' },
              { label: 'Booked → Closed Rate',   value: `${d.closeRate}%`, sub: `${d.closedDeals} deals closed all-time`, color: '#00C896' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: s.color, marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '3px' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PIPELINE ── */}
      {tab === 'pipeline' && (
        <div>
          <div className="chart-card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <span className="card-title">Leads by Stage</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.activeLeads} active leads</span>
            </div>
            {d.activeLeads === 0 ? (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}><Send size={22} /></div>
                <p className="empty-title">No pipeline data yet</p>
                <p className="empty-desc">Add leads to your CRM Pipeline and this chart will populate automatically.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.stageCounts} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {d.stageCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Stage Breakdown</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. pipeline value: ${Math.round(d.pipelineValue).toLocaleString()}</span>
            </div>
            {d.stageCounts.map((s, i) => {
              const total = d.stageCounts.reduce((a, b) => a + b.count, 0)
              const pct   = total > 0 ? Math.round((s.count / total) * 100) : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span style={{ width: '100px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', flexShrink: 0 }}>{s.stage}</span>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', width: '48px', textAlign: 'right' }}>{s.count} ({pct}%)</span>
                </div>
              )
            })}
            {d.activeLeads === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>No leads yet — add leads in CRM Pipeline</p>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVITY ── */}
      {tab === 'activity' && (
        <div>
          {/* Weekly goal progress chart */}
          <div className="chart-card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <span className="card-title">Weekly Input Activity</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>From Mission Control logs</span>
            </div>
            {d.weeklyProgress.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}><Target size={22} /></div>
                <p className="empty-title">No activity logged yet</p>
                <p className="empty-desc">Log your weekly outreach and content in Mission Control → Input Goals. Your weekly history will appear here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d.weeklyProgress} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="outreach" name="Outreach" fill="var(--blue)"   radius={[4, 4, 0, 0]} />
                  <Bar dataKey="content"  name="Content"  fill="var(--purple)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Content drafts */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <span className="card-title">Content Engine</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{d.drafts.length} draft{d.drafts.length !== 1 ? 's' : ''}</span>
            </div>
            {d.drafts.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>No content drafts yet — go to Content Engine to generate posts</p>
            ) : (
              d.drafts.slice(0, 5).map((draft, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--purple-light)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {draft.hook || draft.content?.slice(0, 60) || 'Untitled draft'}…
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{draft.type || 'Post'} · {draft.platform || 'LinkedIn'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {tab === 'feedback' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, var(--purple-light), var(--blue-light))', border: '1px solid rgba(123,94,167,0.15)', borderRadius: 'var(--radius-xl)', padding: '28px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px' }}>Business Improvement Report</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '16px' }}>
              Once your Claude API is connected, this generates a weekly analysis: progress vs goals, pipeline health, content patterns, what you've been ignoring, and specific action recommendations for the next week.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {['Revenue vs Goal', 'Pipeline Health', 'Content Consistency', 'Client Delivery', 'Outreach Volume'].map(item => (
                <div key={item} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  {item}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={genReport} disabled={generating}>
              {generating
                ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Generating...</>
                : <><RefreshCw size={14} /> Generate This Week's Report</>}
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Past Reports</span>
            </div>
            <div className="empty-state" style={{ padding: '28px' }}>
              <p className="empty-desc">Past weekly reports will appear here once your Claude API is connected and the first report is generated.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
