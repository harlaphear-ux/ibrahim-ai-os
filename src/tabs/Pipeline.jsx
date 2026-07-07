import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Clock, Sparkles, X, UserPlus, Star, MessageSquare,
  CheckSquare, Zap, RefreshCw, ChevronRight, Link2, Trash2, AlertTriangle
} from 'lucide-react'
import { Leads as LeadsDB } from '../lib/db'

/* ─── Constants ─────────────────────────────────────── */
const STAGES = [
  { id: 'replied',      label: 'Replied',            color: '#64748B' },
  { id: 'active',       label: 'Active Convo',        color: '#F59E0B' },
  { id: 'problem',      label: 'Problem & Interest',  color: '#7B5EA7' },
  { id: 'reengagement', label: 'Reengagement',        color: '#0b0085' },
  { id: 'followup',     label: 'Follow Up',           color: '#FF6B35' },
  { id: 'booked',       label: 'Booked Call',         color: '#00C896' },
  { id: 'closed',       label: 'Closed',              color: '#009E77' },
]

const SERVICES = [
  'Full AI OS Build',
  'Onboarding Automation',
  'Delivery System',
  'Content System',
  'Lead Pipeline + CRM',
  'Sales Funnel',
  'PipelineIQ Setup',
]

const LEADS_KEY   = 'ai_os_pipeline_leads'
const CLIENTS_KEY = 'ai_os_clients'

/* ─── Storage helpers ───────────────────────────────── */
function loadLeads() {
  return LeadsDB.load()
}
function saveLeads(arr) {
  LeadsDB.save(arr)
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

/**
 * Upsert by name (case-insensitive trim).
 * Returns { leads: newArray, existed: bool }
 */
function upsertLead(leads, payload) {
  const norm = s => (s || '').toLowerCase().trim()
  const idx  = leads.findIndex(l => norm(l.name) === norm(payload.name))
  if (idx >= 0) {
    const updated = [...leads]
    updated[idx] = {
      ...updated[idx],
      ...(payload.stage ? { stage: payload.stage } : {}),
      ...(payload.role  ? { role:  payload.role  } : {}),
      ...(payload.notes ? { notes: payload.notes } : {}),
      lastContact: new Date().toISOString(),
    }
    return { leads: updated, existed: true }
  }
  return {
    leads: [
      ...leads,
      {
        id: Date.now(),
        role: '',
        notes: '',
        stage: 'replied',
        ...payload,
        lastContact: new Date().toISOString(),
      },
    ],
    existed: false,
  }
}

/* ─── LeadCard ──────────────────────────────────────── */
function LeadCard({ lead, onSelect, onDelete }) {
  const days   = daysSince(lead.lastContact)
  const overdue = days >= 5
  const stage  = STAGES.find(s => s.id === lead.stage)

  return (
    <div
      className={`lead-card${overdue ? ' overdue' : ''}`}
      onClick={() => onSelect(lead)}
    >
      <div className="lead-name">{lead.name}</div>
      <div className="lead-role">{lead.role || 'No role noted'}</div>
      {lead.notes && (
        <div style={{
          fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {lead.notes}
        </div>
      )}
      <div className="lead-footer">
        <div className={`lead-days${overdue ? ' overdue' : ''}`}>
          <Clock size={10} />
          {days === 0 ? 'Today' : `${days}d ago`}
          {overdue && ' ⚠️'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="ai-chip"
            style={{ fontSize: '10px', padding: '3px 8px' }}
            onClick={e => e.stopPropagation()}
            title="AI draft follow-up"
          >
            <span className="ai-dot purple" />
            AI Draft
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(lead) }}
            title="Delete lead"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '3px', lineHeight: 1,
              borderRadius: '4px', display: 'flex', alignItems: 'center',
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── AddLeadModal ──────────────────────────────────── */
function AddLeadModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', role: '', notes: '', stage: 'replied' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Lead</h3>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="label">Name *</label>
            <input
              className="input"
              placeholder="e.g. Sarah Johnson"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="label">Role / Title</label>
            <input
              className="input"
              placeholder="e.g. Business Coach, LinkedIn"
              value={form.role}
              onChange={e => set('role', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Pipeline Stage</label>
            <select className="input" value={form.stage} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Notes</label>
            <textarea
              className="input textarea"
              placeholder="Pain points, context, where you met them..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
          <div style={{
            background: 'var(--blue-light)', borderRadius: 'var(--radius-md)',
            padding: '10px 12px', fontSize: '12px', color: 'var(--blue)',
          }}>
            💡 If this name already exists in your pipeline, the lead will be{' '}
            <strong>moved to the selected stage</strong> instead of creating a duplicate.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!form.name.trim()}
            onClick={() => { onSave(form); onClose() }}
          >
            <UserPlus size={14} /> Add Lead
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── ConvertToClientModal ──────────────────────────── */
function ConvertToClientModal({ lead, onConvert, onClose }) {
  const [form, setForm] = useState({
    email: '',
    amount: '',
    service: SERVICES[0],
    onboardingNotes: '',
    paymentStatus: 'Pending',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    const existing = (() => {
      try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]') } catch { return [] }
    })()

    const newClient = {
      id: Date.now(),
      name: lead.name,
      role: lead.role || '',
      email: form.email,
      revenue: form.amount ? `$${form.amount.replace('$', '').replace(/,/g, '')}` : '',
      service: form.service,
      onboardingNotes: form.onboardingNotes,
      paymentStatus: form.paymentStatus,
      progress: 0,
      waitingOnClient: false,
      deliveryPlan: [],
      signedAt: new Date().toISOString(),
    }

    localStorage.setItem(CLIENTS_KEY, JSON.stringify([...existing, newClient]))
    onConvert(newClient)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Convert to Client</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {lead.name}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'var(--green-light)',
            border: '1px solid rgba(0,158,119,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px', marginBottom: '16px',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--green-dark)', fontWeight: '700' }}>
              🎉 Congratulations on closing!
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Fill in the onboarding details below. This client will appear in your Clients hub immediately.
            </p>
          </div>

          <div className="form-group">
            <label className="label">Client Email</label>
            <input
              className="input"
              type="email"
              placeholder="client@email.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="label">Amount (USD)</label>
              <input
                className="input"
                placeholder="e.g. 1500"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Payment Status</label>
              <select className="input" value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
                <option>Pending</option>
                <option>Paid</option>
                <option>Partial</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Service</label>
            <select className="input" value={form.service} onChange={e => set('service', e.target.value)}>
              {SERVICES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Onboarding Notes</label>
            <textarea
              className="input textarea"
              placeholder="What they need, expectations set, first steps agreed on, any special requirements..."
              value={form.onboardingNotes}
              onChange={e => set('onboardingNotes', e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" onClick={submit}>
            <CheckSquare size={14} /> Convert &amp; Onboard
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── LeadDetailModal ───────────────────────────────── */
function LeadDetailModal({ lead, onClose, onUpdate, onConvertStart, onDelete }) {
  const [tab,   setTab]   = useState('overview')
  const [notes, setNotes] = useState(lead.notes || '')
  const stage = STAGES.find(s => s.id === lead.stage)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{lead.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{lead.role}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body">
          {/* status row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span
              className="badge"
              style={{
                background: (stage?.color || '#ccc') + '22',
                color: stage?.color || '#ccc',
                border: `1px solid ${stage?.color || '#ccc'}44`,
              }}
            >
              {stage?.label}
            </span>
            <span className={`badge ${daysSince(lead.lastContact) >= 5 ? 'badge-rose' : 'badge-green'}`}>
              {daysSince(lead.lastContact) === 0
                ? 'Contacted today'
                : `${daysSince(lead.lastContact)}d since contact`}
            </span>
          </div>

          {/* tabs */}
          <div className="pill-tabs" style={{ marginBottom: '16px' }}>
            {['overview', 'ai-draft', 'call-prep'].map(t => (
              <button
                key={t}
                className={`pill-tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'overview' ? 'Overview' : t === 'ai-draft' ? '✨ AI Draft' : '📞 Call Prep'}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div>
              <div className="form-group">
                <label className="label">Notes &amp; Context</label>
                <textarea
                  className="input textarea"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Pain points, context, what you've discussed..."
                />
              </div>
              <div className="form-group">
                <label className="label">Move to Stage</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {STAGES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => onUpdate({ ...lead, stage: s.id, lastContact: new Date().toISOString() })}
                      style={{
                        padding: '5px 10px', borderRadius: '20px', fontSize: '11px',
                        cursor: 'pointer', transition: 'var(--transition)',
                        border: `1px solid ${lead.stage === s.id ? s.color : 'var(--border)'}`,
                        background: lead.stage === s.id ? s.color + '22' : 'var(--bg)',
                        color: lead.stage === s.id ? s.color : 'var(--text-secondary)',
                        fontWeight: lead.stage === s.id ? '700' : '400',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'ai-draft' && (
            <div>
              <div style={{
                background: 'var(--purple-light)',
                border: '1px solid rgba(123,94,167,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '14px', marginBottom: '14px',
              }}>
                <p style={{ fontSize: '13px', color: 'var(--purple)', fontWeight: '600', marginBottom: '6px' }}>
                  ✨ AI Follow-up Draft
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Connect your Claude API key in Settings to auto-generate personalized follow-up
                  messages in your voice, based on this lead's history and notes.
                </p>
              </div>
              <button className="btn btn-primary btn-full">
                <Sparkles size={14} /> Generate Follow-up (needs API key)
              </button>
            </div>
          )}

          {tab === 'call-prep' && (
            <div>
              <div style={{
                background: 'var(--blue-light)',
                border: '1px solid var(--blue-mid)',
                borderRadius: 'var(--radius-md)',
                padding: '14px', marginBottom: '14px',
              }}>
                <p style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: '600', marginBottom: '6px' }}>
                  📞 Sales Call Brief
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Generate a full call prep brief — questions to ask, talk track, objection responses,
                  and suggested offer framing — based on this lead's notes.
                </p>
              </div>
              <button className="btn btn-primary btn-full">
                <MessageSquare size={14} /> Generate Call Brief (needs API key)
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {/* Convert button floated left */}
          <button
            className="btn btn-green"
            style={{ marginRight: 'auto' }}
            onClick={() => { onConvertStart(lead); onClose() }}
          >
            <CheckSquare size={14} /> Convert to Client
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onDelete(lead)}
            title="Delete this lead"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button
            className="btn btn-primary"
            onClick={() => { onUpdate({ ...lead, notes }); onClose() }}
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── PipelineIQ Sync Panel ─────────────────────────── */
function PipelineIQSync({ leads, onSync }) {
  const [name,    setName]    = useState('')
  const [stage,   setStage]   = useState('replied')
  const [message, setMessage] = useState(null)

  const handleSync = () => {
    if (!name.trim()) return
    const result = onSync({ name: name.trim(), stage })
    setMessage(
      result.existed
        ? `✅ Updated "${result.name}" → ${STAGES.find(s => s.id === stage)?.label}`
        : `➕ Added "${result.name}" as ${STAGES.find(s => s.id === stage)?.label}`
    )
    setName('')
    setTimeout(() => setMessage(null), 4000)
  }

  return (
    <div>
      {/* Webhook info card */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--blue-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={18} style={{ color: 'var(--blue)' }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>PipelineIQ Sync</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Toggle any stage from the Chrome extension and it syncs here instantly.
              If the name already exists → moved and updated. New name → added to pipeline.
              In production, Make.com webhook handles this automatically.
            </p>
          </div>
        </div>

        {/* Simulate toggle form */}
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '12px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: 'var(--text-secondary)' }}>
            Simulate Extension Toggle
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label className="label">Lead Name</label>
              <input
                className="input"
                placeholder="Type name..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSync()}
              />
            </div>
            <div>
              <label className="label">New Stage</label>
              <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <button
            className="btn btn-primary btn-full"
            disabled={!name.trim()}
            onClick={handleSync}
          >
            <Zap size={14} /> Sync Stage Update
          </button>

          {message && (
            <div style={{
              marginTop: '10px', padding: '10px 12px',
              background: 'var(--green-light)', borderRadius: 'var(--radius-md)',
              fontSize: '12px', color: 'var(--green-dark)', fontWeight: '600',
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Integration hint */}
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          padding: '10px 12px', background: 'rgba(11,0,133,0.05)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--blue-mid)',
        }}>
          <Link2 size={13} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--blue)' }}>Make.com blueprint ready</strong> — connect
            PipelineIQ Chrome Extension → Make.com → this webhook → pipeline auto-updates.
            Session 4 will wire this up.
          </p>
        </div>
      </div>

      {/* Live pipeline list */}
      <div className="card">
        <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>
          Current Pipeline ({leads.length} leads)
        </p>
        {leads.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No leads yet. Sync a name above or add from the Pipeline tab.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {leads.map(lead => {
              const s    = STAGES.find(x => x.id === lead.stage)
              const days = daysSince(lead.lastContact)
              return (
                <div
                  key={lead.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{lead.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {lead.role || 'No role'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{
                      fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
                      background: (s?.color || '#ccc') + '22',
                      color: s?.color || '#ccc', fontWeight: '600',
                    }}>
                      {s?.label}
                    </span>
                    <span style={{ fontSize: '10px', color: days >= 5 ? 'var(--rose)' : 'var(--text-muted)' }}>
                      {days === 0 ? 'Today' : `${days}d ago`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── ConfirmDeleteModal ────────────────────────────── */
function ConfirmDeleteModal({ lead, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--rose-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertTriangle size={16} style={{ color: 'var(--rose-dark)' }} />
            </div>
            <h3 className="modal-title">Delete Lead?</h3>
          </div>
          <button className="modal-close" onClick={onCancel}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>{lead.name}</strong>?
            This cannot be undone.
          </p>
          {lead.notes && (
            <div style={{
              marginTop: '12px', padding: '10px 12px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', fontSize: '12px',
              color: 'var(--text-muted)',
            }}>
              Notes will also be deleted: "{lead.notes.slice(0, 80)}{lead.notes.length > 80 ? '…' : ''}"
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <Trash2 size={14} /> Yes, Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ────────────────────────────────── */
export default function Pipeline() {
  const [leads,        setLeads]        = useState(loadLeads)
  const [showAdd,      setShowAdd]      = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [convertLead,  setConvertLead]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [tab,          setTab]          = useState('pipeline')

  // Persist to localStorage whenever leads change
  useEffect(() => { saveLeads(leads) }, [leads])

  /* Upsert by name (used by manual add AND PipelineIQ sync) */
  const upsert = useCallback((payload) => {
    const current = loadLeads()            // always read fresh for sync path
    const r       = upsertLead(current, payload)
    setLeads(r.leads)
    return { existed: r.existed, name: payload.name }
  }, [])

  const updateLead = (updated) => {
    setLeads(l => l.map(x => x.id === updated.id ? updated : x))
    if (selected?.id === updated.id) setSelected(updated)
  }

  const handleConvertDone = (client) => {
    // Move the converted lead to Closed
    setLeads(l => l.map(x =>
      x.name.toLowerCase().trim() === client.name.toLowerCase().trim()
        ? { ...x, stage: 'closed', lastContact: new Date().toISOString() }
        : x
    ))
  }

  /* Delete with confirmation */
  const handleDeleteStart = (lead) => {
    setSelected(null)       // close detail modal if open
    setDeleteTarget(lead)
  }
  const handleDeleteConfirm = () => {
    setLeads(l => l.filter(x => x.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const byStage     = id => leads.filter(l => l.stage === id)
  const overdueCount = leads.filter(l => daysSince(l.lastContact) >= 5).length

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM Pipeline</h1>
          <p className="page-subtitle">
            {leads.length} leads ·{' '}
            {overdueCount > 0 ? `${overdueCount} need follow-up` : 'All leads current'}
          </p>
        </div>
        <div className="page-actions">
          {overdueCount > 0 && (
            <span className="badge badge-rose">⚠ {overdueCount} overdue</span>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="pill-tabs">
        {[
          { id: 'pipeline',    label: 'Pipeline' },
          { id: 'pipelineiq',  label: 'PipelineIQ Sync' },
          { id: 'referrals',   label: 'Referrals' },
          { id: 'testimonials',label: 'Testimonials' },
        ].map(t => (
          <button
            key={t.id}
            className={`pill-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.id === 'pipelineiq' && <Zap size={11} style={{ marginRight: 2 }} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Pipeline Board ── */}
      {tab === 'pipeline' && (
        leads.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon" style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>
                <UserPlus size={24} />
              </div>
              <p className="empty-title">Your pipeline is empty</p>
              <p className="empty-desc">
                Add leads manually or sync from PipelineIQ. Calendly calls auto-appear here via Make.com.
              </p>
              <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add First Lead
              </button>
            </div>
          </div>
        ) : (
          <div className="kanban-board">
            {STAGES.map(stage => {
              const stageLeads = byStage(stage.id)
              return (
                <div key={stage.id} className="kanban-col">
                  <div className="kanban-col-header">
                    <div className="kanban-col-title" style={{ color: stage.color }}>
                      {stage.label}
                    </div>
                    <span className="kanban-count">{stageLeads.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {stageLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onSelect={setSelected} onDelete={handleDeleteStart} />
                    ))}
                    <button
                      onClick={() => setShowAdd(true)}
                      style={{
                        width: '100%', padding: '7px', background: 'none',
                        border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
                        fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      }}
                    >
                      <Plus size={11} /> Add
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── PipelineIQ Sync ── */}
      {tab === 'pipelineiq' && (
        <PipelineIQSync leads={leads} onSync={upsert} />
      )}

      {/* ── Referrals ── */}
      {tab === 'referrals' && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--green-light)', color: 'var(--green-dark)' }}>
              <Star size={24} />
            </div>
            <p className="empty-title">Referral Tracker</p>
            <p className="empty-desc">
              Track who you've asked for referrals, who has sent one, and who still needs a follow-up ask.
              Auto-triggers when a client hits 100% delivery.
            </p>
            <button className="btn btn-secondary" style={{ marginTop: '8px' }}>
              <Plus size={14} /> Log Referral Ask
            </button>
          </div>
        </div>
      )}

      {/* ── Testimonials ── */}
      {tab === 'testimonials' && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}>
              <MessageSquare size={24} />
            </div>
            <p className="empty-title">Testimonial Vault</p>
            <p className="empty-desc">
              Store client testimonials (text or screenshots) here. Auto-requests trigger when client delivery hits 100%.
            </p>
            <button className="btn btn-secondary" style={{ marginTop: '8px' }}>
              <Plus size={14} /> Add Testimonial
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddLeadModal
          onSave={payload => upsert(payload)}
          onClose={() => setShowAdd(false)}
        />
      )}
      {selected && (
        <LeadDetailModal
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateLead}
          onConvertStart={lead => setConvertLead(lead)}
          onDelete={handleDeleteStart}
        />
      )}
      {convertLead && (
        <ConvertToClientModal
          lead={convertLead}
          onConvert={handleConvertDone}
          onClose={() => setConvertLead(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          lead={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
