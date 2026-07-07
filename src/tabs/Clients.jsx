import { useState, useEffect } from 'react'
import {
  Plus, X, Search, ChevronRight, Sparkles, FileText,
  CheckSquare, AlertCircle, Calendar, Trash2, ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { Clients as ClientsDB } from '../lib/db'

/* ─── Constants ─────────────────────────────────────── */
const SERVICES = [
  'Full AI OS Build',
  'Onboarding Automation',
  'Delivery System',
  'Content System',
  'Lead Pipeline + CRM',
  'Sales Funnel',
  'PipelineIQ Setup',
]

const AVATAR_COLORS = [
  'var(--blue)', 'var(--green-dark)', 'var(--purple)',
  'var(--orange)', 'var(--amber-dark)', 'var(--rose-dark)',
]

const CLIENTS_KEY = 'ai_os_clients'
const LEADS_KEY   = 'ai_os_pipeline_leads'
const PLANNER_KEY = 'ai_os_planner_tasks'

/* ─── Storage helpers ───────────────────────────────── */
function loadClients() {
  return ClientsDB.load()
}
function saveClients(arr) {
  ClientsDB.save(arr)
}
function loadLeads() {
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]') } catch { return [] }
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/* Write a delivery step task into the Planner localStorage */
function syncStepToPlanner(clientName, step) {
  try {
    const raw   = localStorage.getItem(PLANNER_KEY)
    const tasks = raw ? JSON.parse(raw) : {}
    const dateKey = step.date
    if (!dateKey) return false
    const existing  = tasks[dateKey] || []
    const taskName  = `${step.name}`
    const taskNote  = `Client: ${clientName}`
    // Avoid duplicates (same step id)
    const filtered  = existing.filter(t => t._stepId !== step.id)
    tasks[dateKey] = [
      ...filtered,
      {
        id: Date.now(),
        _stepId: step.id,
        type: 'clientwork',
        name: taskName,
        note: taskNote,
        time: '',
        done: false,
      },
    ]
    localStorage.setItem(PLANNER_KEY, JSON.stringify(tasks))
    return true
  } catch { return false }
}

/* ─── ClientCard ────────────────────────────────────── */
function ClientCard({ client, onClick }) {
  const pct      = client.progress || 0
  const colorIdx = client.id % AVATAR_COLORS.length
  const doneSteps = (client.deliveryPlan || []).filter(s => s.done).length
  const totalSteps = (client.deliveryPlan || []).length

  return (
    <div className="client-card" onClick={() => onClick(client)} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div className="client-avatar" style={{ background: AVATAR_COLORS[colorIdx] }}>
          {initials(client.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="client-name">{client.name}</div>
          <div className="client-service">{client.service}</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
            <span className={`badge ${client.paymentStatus === 'Paid' ? 'badge-green' : client.paymentStatus === 'Pending' ? 'badge-amber' : 'badge-gray'}`}>
              {client.paymentStatus || 'Not set'}
            </span>
            {client.revenue && (
              <span className="badge badge-gray">💰 {client.revenue}</span>
            )}
            {client.waitingOnClient && (
              <span className="badge badge-orange">⏳ Waiting on client</span>
            )}
          </div>
        </div>
      </div>

      {/* Delivery progress */}
      <div>
        <div className="client-progress-row">
          <span>Delivery{totalSteps > 0 ? ` (${doneSteps}/${totalSteps} steps)` : ''}</span>
          <span style={{ color: pct === 100 ? 'var(--green-dark)' : 'var(--text-primary)', fontWeight: '700' }}>
            {pct}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${pct === 100 ? 'green' : pct >= 50 ? 'blue' : 'orange'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── AddClientModal ────────────────────────────────── */
function AddClientModal({ onAdd, onClose }) {
  const leads = loadLeads()
  const [mode,     setMode]     = useState(leads.length > 0 ? 'from-lead' : 'new')
  const [search,   setSearch]   = useState('')
  const [selLead,  setSelLead]  = useState(null)
  const [form,     setForm]     = useState({
    name: '', service: SERVICES[0], revenue: '', paymentStatus: 'Pending',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = leads.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))

  const submit = () => {
    const base = mode === 'from-lead' && selLead
      ? { name: selLead.name, role: selLead.role, service: form.service, revenue: form.revenue, paymentStatus: form.paymentStatus }
      : form
    onAdd({
      ...base,
      id: Date.now(),
      progress: 0,
      waitingOnClient: false,
      deliveryPlan: [],
      signedAt: new Date().toISOString(),
    })
    onClose()
  }

  const canSubmit = mode === 'from-lead' ? !!selLead : !!form.name.trim()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Sign New Client</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {leads.length > 0 && (
            <div className="pill-tabs" style={{ marginBottom: '16px' }}>
              <button className={`pill-tab${mode === 'from-lead' ? ' active' : ''}`} onClick={() => setMode('from-lead')}>From Lead</button>
              <button className={`pill-tab${mode === 'new' ? ' active' : ''}`} onClick={() => setMode('new')}>New Client</button>
            </div>
          )}

          {mode === 'from-lead' && (
            <>
              <div className="form-group">
                <label className="label">Search Lead</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: '32px' }} placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                </div>
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '14px' }}>
                {filtered.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>
                    No leads found. Add them from Pipeline first.
                  </p>
                ) : filtered.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelLead(lead)}
                    style={{
                      padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: selLead?.id === lead.id ? 'var(--blue-light)' : 'var(--bg)',
                      border: `1px solid ${selLead?.id === lead.id ? 'var(--blue)' : 'var(--border)'}`,
                      marginBottom: '6px', transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{lead.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.role || 'No role'}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {mode === 'new' && (
            <div className="form-group">
              <label className="label">Client Name *</label>
              <input className="input" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
          )}

          <div className="form-group">
            <label className="label">Service</label>
            <select className="input" value={form.service} onChange={e => set('service', e.target.value)}>
              {SERVICES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="label">Revenue</label>
              <input className="input" placeholder="e.g. $1,500" value={form.revenue} onChange={e => set('revenue', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Payment</label>
              <select className="input" value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
                <option>Pending</option>
                <option>Paid</option>
                <option>Partial</option>
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--green-light)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--green-dark)', fontWeight: '600' }}>⚡ Delivery plan ready</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
              After signing, add your step-by-step delivery plan in the Clients hub — each step syncs to your Planner with one click.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" disabled={!canSubmit} onClick={submit}>
            <CheckSquare size={14} /> Sign Client
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── DeliveryPlanTab ───────────────────────────────── */
function DeliveryPlanTab({ client, plan, onChange }) {
  const [stepName, setStepName] = useState('')
  const [stepDate, setStepDate] = useState('')
  const [toast,    setToast]    = useState(null)

  const showToast = msg => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const addStep = () => {
    if (!stepName.trim()) return
    const newStep = { id: Date.now(), name: stepName.trim(), date: stepDate, done: false, synced: false }
    onChange([...plan, newStep])
    setStepName('')
    setStepDate('')
  }

  const toggleDone = (id) => {
    onChange(plan.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  const removeStep = (id) => {
    onChange(plan.filter(s => s.id !== id))
  }

  const syncToPlanner = (step) => {
    if (!step.date) { showToast('❌ Set a date first before syncing to Planner'); return }
    const ok = syncStepToPlanner(client.name, step)
    if (ok) {
      onChange(plan.map(s => s.id === step.id ? { ...s, synced: true } : s))
      showToast(`✅ "${step.name}" added to Planner for ${step.date}`)
    }
  }

  const doneCount  = plan.filter(s => s.done).length
  const totalCount = plan.length
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div>
      {toast && (
        <div style={{
          padding: '10px 14px', background: 'var(--green-light)', borderRadius: 'var(--radius-md)',
          fontSize: '12px', color: 'var(--green-dark)', fontWeight: '600', marginBottom: '14px',
        }}>
          {toast}
        </div>
      )}

      {/* Progress */}
      {totalCount > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
            <span>Delivery Progress ({doneCount}/{totalCount} steps)</span>
            <span style={{ color: pct === 100 ? 'var(--green-dark)' : 'var(--blue)' }}>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${pct === 100 ? 'green' : pct >= 50 ? 'blue' : 'orange'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Add step form */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '14px',
      }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Add Delivery Step
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '8px' }}>
          <input
            className="input"
            placeholder="e.g. Kickoff call, Build automation, Review + deliver..."
            value={stepName}
            onChange={e => setStepName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStep()}
            style={{ fontSize: '12px' }}
          />
          <input
            className="input"
            type="date"
            value={stepDate}
            onChange={e => setStepDate(e.target.value)}
            style={{ fontSize: '12px', width: '130px' }}
          />
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '12px' }}
          disabled={!stepName.trim()}
          onClick={addStep}
        >
          <Plus size={12} /> Add Step
        </button>
      </div>

      {/* Steps list */}
      {plan.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          No delivery steps yet. Add your first step above.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {plan.map((step, idx) => (
            <div
              key={step.id}
              style={{
                display: 'flex', gap: '10px', alignItems: 'center',
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: step.done ? 'var(--green-light)' : 'var(--bg)',
                border: `1px solid ${step.done ? 'rgba(0,158,119,0.2)' : 'var(--border)'}`,
                transition: 'var(--transition)',
              }}
            >
              {/* Step number */}
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: step.done ? 'var(--green-dark)' : 'var(--blue)',
                color: 'white', fontSize: '10px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step.done ? <CheckCircle2 size={12} /> : idx + 1}
              </div>

              {/* Checkbox + name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={step.done}
                    onChange={() => toggleDone(step.id)}
                    style={{ accentColor: 'var(--green-dark)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: '13px', fontWeight: '600',
                    textDecoration: step.done ? 'line-through' : 'none',
                    color: step.done ? 'var(--text-muted)' : 'var(--text-primary)',
                  }}>
                    {step.name}
                  </span>
                </div>
                {step.date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', marginLeft: '22px' }}>
                    <Calendar size={10} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{step.date}</span>
                    {step.synced && (
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                        background: 'var(--green-light)', color: 'var(--green-dark)', fontWeight: '600',
                      }}>
                        ✅ In Planner
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {!step.synced && (
                  <button
                    title={step.date ? 'Sync to Planner' : 'Set a date first'}
                    onClick={() => syncToPlanner(step)}
                    style={{
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                      background: step.date ? 'var(--blue-light)' : 'var(--bg)',
                      color: step.date ? 'var(--blue)' : 'var(--text-muted)',
                      border: `1px solid ${step.date ? 'var(--blue-mid)' : 'var(--border)'}`,
                      fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '3px',
                    }}
                  >
                    <ArrowRight size={10} /> Planner
                  </button>
                )}
                <button
                  onClick={() => removeStep(step.id)}
                  style={{
                    padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                  title="Remove step"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── ClientDetailModal ─────────────────────────────── */
function ClientDetailModal({ client, onClose, onUpdate }) {
  const [tab,     setTab]     = useState('overview')
  const [progress, setProgress] = useState(client.progress || 0)
  const [waiting, setWaiting] = useState(client.waitingOnClient || false)
  const [plan,    setPlan]    = useState(client.deliveryPlan || [])

  // Sync progress from plan when plan changes
  useEffect(() => {
    if (plan.length > 0) {
      const pct = Math.round((plan.filter(s => s.done).length / plan.length) * 100)
      setProgress(pct)
    }
  }, [plan])

  const handleSave = () => {
    onUpdate({ ...client, progress, waitingOnClient: waiting, deliveryPlan: plan })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{client.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{client.service}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">
          <div className="pill-tabs" style={{ marginBottom: '16px' }}>
            {[
              { id: 'overview',  label: 'Overview' },
              { id: 'delivery',  label: '📋 Delivery Plan' },
              { id: 'upsell',    label: '📈 Upsell' },
              { id: 'proposal',  label: '📄 Proposal' },
            ].map(t => (
              <button
                key={t.id}
                className={`pill-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className={`badge ${client.paymentStatus === 'Paid' ? 'badge-green' : 'badge-amber'}`}>
                  {client.paymentStatus}
                </span>
                {client.revenue && <span className="badge badge-gray">💰 {client.revenue}</span>}
                {client.email  && <span className="badge badge-gray">✉ {client.email}</span>}
              </div>

              {/* Progress slider */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  <span>Delivery Progress</span>
                  <span>{progress}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={progress}
                  onChange={e => setProgress(+e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--blue)' }}
                />
              </div>

              {/* Waiting on client toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', marginBottom: '14px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>Waiting on Client</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Flag when client hasn't sent required deliverables</div>
                </div>
                <button className={`toggle${waiting ? ' on' : ''}`} onClick={() => setWaiting(w => !w)}>
                  <div className="toggle-thumb" />
                </button>
              </div>

              {/* Onboarding notes */}
              {client.onboardingNotes && (
                <div style={{
                  background: 'var(--blue-light)', borderRadius: 'var(--radius-md)',
                  padding: '12px', border: '1px solid var(--blue-mid)',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--blue)', marginBottom: '4px' }}>
                    Onboarding Notes
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {client.onboardingNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Delivery Plan ── */}
          {tab === 'delivery' && (
            <DeliveryPlanTab
              client={client}
              plan={plan}
              onChange={setPlan}
            />
          )}

          {/* ── Upsell ── */}
          {tab === 'upsell' && (
            <div>
              <div style={{ background: 'var(--purple-light)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--purple)', fontWeight: '600', marginBottom: '6px' }}>✨ AI Upsell Suggestion</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Based on what {client.name} has ({client.service}), the AI will suggest the perfect
                  next service and give you a conversation script to bring it up naturally.
                </p>
              </div>
              <button className="btn btn-primary btn-full">
                <Sparkles size={14} /> Generate Upsell Script (needs API key)
              </button>
            </div>
          )}

          {/* ── Proposal ── */}
          {tab === 'proposal' && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Generate a personalized proposal for {client.name} using your Voice Bible and their known pain points.
              </p>
              <button className="btn btn-primary btn-full">
                <FileText size={14} /> Generate Proposal (needs API key)
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ────────────────────────────────── */
export default function Clients({ onNavigate }) {
  const [clients,  setClients]  = useState(loadClients)
  const [showAdd,  setShowAdd]  = useState(false)
  const [selected, setSelected] = useState(null)

  // Poll localStorage every 2s to catch Pipeline-converted clients
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = loadClients()
      setClients(prev => {
        // Only update if something changed (avoid re-renders)
        if (JSON.stringify(prev) !== JSON.stringify(fresh)) return fresh
        return prev
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Persist clients whenever they change
  useEffect(() => {
    saveClients(clients)
  }, [clients])

  const addClient = (c) => {
    const updated = [...clients, c]
    setClients(updated)
    saveClients(updated)
  }

  const updateClient = (updated) => {
    const newClients = clients.map(c => c.id === updated.id ? updated : c)
    setClients(newClients)
    saveClients(newClients)
  }

  const activeCount    = clients.filter(c => c.progress < 100).length
  const completedCount = clients.filter(c => c.progress === 100).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            {clients.length === 0
              ? 'No clients yet'
              : `${activeCount} active · ${completedCount} completed`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => onNavigate('pipeline')}>
            View Pipeline <ChevronRight size={14} />
          </button>
          <button className="btn btn-green" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Sign New Client
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--green-light)', color: 'var(--green-dark)' }}>
              <CheckSquare size={24} />
            </div>
            <p className="empty-title">No clients yet</p>
            <p className="empty-desc">
              Sign your first client or convert a lead from your pipeline.
              Once signed, set up their delivery plan — each step syncs directly to your Planner.
            </p>
            <button className="btn btn-green" style={{ marginTop: '8px' }} onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Sign First Client
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Waiting on client alert */}
          {clients.some(c => c.waitingOnClient) && (
            <div style={{
              background: 'var(--amber-light)', border: '1px solid var(--amber)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px',
              display: 'flex', gap: '10px', alignItems: 'center',
            }}>
              <AlertCircle size={16} style={{ color: 'var(--amber-dark)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--amber-dark)', fontWeight: '600' }}>
                {clients.filter(c => c.waitingOnClient).length} client(s) flagged — waiting on deliverables
              </span>
            </div>
          )}

          <div className="client-grid">
            {clients.map(c => (
              <ClientCard key={c.id} client={c} onClick={setSelected} />
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <AddClientModal onAdd={addClient} onClose={() => setShowAdd(false)} />
      )}
      {selected && (
        <ClientDetailModal
          client={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateClient}
        />
      )}
    </div>
  )
}
