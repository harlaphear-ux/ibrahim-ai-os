import { useState, useEffect } from 'react'
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Check, Clock,
  UserPlus, MessageSquare, Zap, PenLine, Send, Users,
  RefreshCw, Star, Briefcase, PhoneCall, X, Calendar,
  Repeat, Brain, Pin
} from 'lucide-react'
import { Planner as PlannerDB } from '../lib/db'
import { isSupabaseReady } from '../lib/supabase'

// ─── ACTIVITY TYPES ────────────────────────────────────────────────
export const ACTIVITY_TYPES = [
  { id: 'connection', label: 'Send Connection', icon: UserPlus,      color: '#0b0085', bg: '#EEEEFF', short: 'Connection' },
  { id: 'convo',      label: 'Start Convo',     icon: MessageSquare, color: '#7B5EA7', bg: '#F0EAFF', short: 'Convo' },
  { id: 'offer',      label: 'Offer Campaign',  icon: Zap,           color: '#FF6B35', bg: '#FFF0EB', short: 'Offer' },
  { id: 'create',     label: 'Create Content',  icon: PenLine,       color: '#7B5EA7', bg: '#F0EAFF', short: 'Create' },
  { id: 'post',       label: 'Post Content',    icon: Send,          color: '#0b0085', bg: '#EEEEFF', short: 'Post' },
  { id: 'meeting',    label: 'Meeting',         icon: Users,         color: '#00C896', bg: '#E6FFF8', short: 'Meeting' },
  { id: 'followup',   label: 'Follow Up',       icon: RefreshCw,     color: '#F59E0B', bg: '#FFFBEB', short: 'Follow Up' },
  { id: 'extramile',  label: 'Extra Mile',      icon: Star,          color: '#F43F5E', bg: '#FFF1F4', short: 'Extra Mile' },
  { id: 'clientwork', label: 'Client Work',     icon: Briefcase,     color: '#009E77', bg: '#E6FFF8', short: 'Client Work' },
]

const DAYS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const STORAGE_KEY       = 'ai_os_planner_tasks'
const RECURRING_KEY     = 'ai_os_recurring_tasks'
const RECURRING_DONE_KEY= 'ai_os_recurring_done'

// ─── HELPERS ───────────────────────────────────────────────────────
function getWeekDates(weekOffset = 0) {
  const now = new Date()
  // Ensure we have a clean date at midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
  
  return DAYS.map((name, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    
    // Manual ISO string to avoid potential timezone/mobile issues
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const key = `${yyyy}-${mm}-${dd}`

    return {
      name, 
      num: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      key: key,
    }
  })
}

function getDayName(dateKey) {
  // Mobile-safe date parsing (YYYY-MM-DD)
  const parts = dateKey.split('-')
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return DAY_FULL[d.getDay()].slice(0, 3)
}

function getRecurringForDay(recurring, dateKey) {
  const dayName = getDayName(dateKey)
  const isWeekday = !['Sat', 'Sun'].includes(dayName)
  return recurring.filter(r => {
    if (r.frequency === 'daily')    return true
    if (r.frequency === 'weekdays') return isWeekday
    if (r.frequency === 'custom')   return (r.days || []).includes(dayName)
    return false
  })
}

function loadTasks()    { return PlannerDB.load() }
function saveTasks(t)   { PlannerDB.save(t) }
function loadRecurring()     { try { return JSON.parse(localStorage.getItem(RECURRING_KEY)      || '[]') } catch { return [] } }
function saveRecurring(a)    { localStorage.setItem(RECURRING_KEY, JSON.stringify(a)) }
function loadRecurringDone() { try { return JSON.parse(localStorage.getItem(RECURRING_DONE_KEY) || '{}') } catch { return {} } }
function saveRecurringDone(o){ localStorage.setItem(RECURRING_DONE_KEY, JSON.stringify(o)) }

// ─── ACTIVITY PICKER ───────────────────────────────────────────────
function ActivityPicker({ onSelect, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(6,0,42,0.6)', backdropFilter:'blur(4px)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'var(--card)', borderRadius:'var(--radius-xl)', padding:'24px', width:'100%', maxWidth:'440px', boxShadow:'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:'800' }}>What are you doing?</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16} /></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
          {ACTIVITY_TYPES.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => onSelect(t)}
                style={{ padding:'12px 8px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--card)', cursor:'pointer', textAlign:'center', transition:'var(--transition)', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}
                onMouseEnter={e => { e.currentTarget.style.background = t.bg; e.currentTarget.style.borderColor = t.color }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:t.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={15} style={{ color:t.color }} />
                </div>
                <span style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-primary)', lineHeight:'1.2' }}>{t.short}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── ADD TASK FORM (time required) ────────────────────────────────
function AddTaskForm({ activityType, dayKey, onAdd, onBack, onClose }) {
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [timeError, setTimeError] = useState(false)
  const Icon = activityType.icon
  const needsNote = activityType.id === 'extramile' || activityType.id === 'clientwork'

  const submit = () => {
    if (!time) { setTimeError(true); return }
    if (activityType.id === 'extramile' && !note.trim()) return
    onAdd({ id: Date.now(), type: activityType.id, note: note.trim(), time, done: false, isCalendly: false })
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(6,0,42,0.6)', backdropFilter:'blur(4px)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'var(--card)', borderRadius:'var(--radius-xl)', padding:'24px', width:'100%', maxWidth:'380px', boxShadow:'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>←</button>
          <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:activityType.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon size={15} style={{ color:activityType.color }} />
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'800' }}>{activityType.label}</div>
            <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{dayKey}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', marginLeft:'auto' }}><X size={16} /></button>
        </div>

        <div className="form-group">
          <label className="label">Time <span style={{ color:'#F43F5E' }}>*</span></label>
          <input type="time" className="input" value={time} onChange={e => { setTime(e.target.value); setTimeError(false) }}
            style={{ borderColor: timeError ? '#F43F5E' : undefined }} autoFocus />
          {timeError && <p style={{ fontSize:'11px', color:'#F43F5E', marginTop:'4px' }}>Time is required</p>}
        </div>

        <div className="form-group">
          <label className="label">{needsNote && activityType.id === 'extramile' ? 'What specifically? *' : 'Note (optional)'}</label>
          <input className="input"
            placeholder={activityType.id === 'extramile' ? 'e.g. Watch Alex Hormozi course...' : activityType.id === 'clientwork' ? 'e.g. Deliver Week 2 content...' : 'Any extra context...'}
            value={note} onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        <div style={{ display:'flex', gap:'8px' }}>
          <button className="btn btn-secondary" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit}
            disabled={activityType.id === 'extramile' && !note.trim()}>
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RECURRING TASK FORM ───────────────────────────────────────────
function RecurringForm({ onSave, onClose }) {
  const [step, setStep]         = useState('type')   // 'type' | 'details'
  const [actType, setActType]   = useState(null)
  const [note, setNote]         = useState('')
  const [time, setTime]         = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [customDays, setCustomDays] = useState([])
  const [timeError, setTimeError]   = useState(false)

  const toggleDay = (d) => setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const submit = () => {
    if (!time) { setTimeError(true); return }
    if (frequency === 'custom' && customDays.length === 0) return
    onSave({ id: Date.now(), type: actType.id, note: note.trim(), time, frequency, days: customDays })
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(6,0,42,0.6)', backdropFilter:'blur(4px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'var(--card)', borderRadius:'var(--radius-xl)', padding:'24px', width:'100%', maxWidth:'440px', boxShadow:'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>

        {step === 'type' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <div>
                <h3 style={{ fontSize:'16px', fontWeight:'800' }}>New Recurring Task</h3>
                <p style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>Pick the activity type</p>
              </div>
              <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
              {ACTIVITY_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id} onClick={() => { setActType(t); setStep('details') }}
                    style={{ padding:'12px 8px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', background:'var(--card)', cursor:'pointer', textAlign:'center', transition:'var(--transition)', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}
                    onMouseEnter={e => { e.currentTarget.style.background = t.bg; e.currentTarget.style.borderColor = t.color }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:t.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={15} style={{ color:t.color }} />
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-primary)', lineHeight:'1.2' }}>{t.short}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 'details' && actType && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
              <button onClick={() => setStep('type')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>←</button>
              <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:actType.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {(() => { const Icon = actType.icon; return <Icon size={15} style={{ color:actType.color }} /> })()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:'800' }}>{actType.label}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>Recurring task setup</div>
              </div>
              <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16} /></button>
            </div>

            {/* Time */}
            <div className="form-group">
              <label className="label">Time <span style={{ color:'#F43F5E' }}>*</span></label>
              <input type="time" className="input" value={time} onChange={e => { setTime(e.target.value); setTimeError(false) }}
                style={{ borderColor: timeError ? '#F43F5E' : undefined }} autoFocus />
              {timeError && <p style={{ fontSize:'11px', color:'#F43F5E', marginTop:'4px' }}>Time is required</p>}
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="label">Label (optional)</label>
              <input className="input" placeholder={`e.g. ${actType.short} — morning session`}
                value={note} onChange={e => setNote(e.target.value)} />
            </div>

            {/* Frequency */}
            <div className="form-group">
              <label className="label">Repeat</label>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {[
                  { val:'daily',    label:'Every day' },
                  { val:'weekdays', label:'Weekdays only' },
                  { val:'custom',   label:'Specific days' },
                ].map(f => (
                  <button key={f.val} onClick={() => setFrequency(f.val)}
                    style={{
                      padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'700',
                      border: `1px solid ${frequency === f.val ? 'var(--blue)' : 'var(--border)'}`,
                      background: frequency === f.val ? 'var(--blue-light)' : 'var(--bg)',
                      color: frequency === f.val ? 'var(--blue)' : 'var(--text-secondary)',
                      cursor:'pointer', transition:'var(--transition)'
                    }}
                  >{f.label}</button>
                ))}
              </div>
            </div>

            {/* Custom day picker */}
            {frequency === 'custom' && (
              <div className="form-group">
                <label className="label">Which days? <span style={{ color:'#F43F5E' }}>*</span></label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {DAYS.map(d => (
                    <button key={d} onClick={() => toggleDay(d)}
                      style={{
                        width:'40px', height:'40px', borderRadius:'10px', fontSize:'12px', fontWeight:'700',
                        border:`1px solid ${customDays.includes(d) ? 'var(--blue)' : 'var(--border)'}`,
                        background: customDays.includes(d) ? 'var(--blue)' : 'var(--bg)',
                        color: customDays.includes(d) ? 'white' : 'var(--text-secondary)',
                        cursor:'pointer', transition:'var(--transition)'
                      }}
                    >{d}</button>
                  ))}
                </div>
                {frequency === 'custom' && customDays.length === 0 && (
                  <p style={{ fontSize:'11px', color:'#F43F5E', marginTop:'4px' }}>Pick at least one day</p>
                )}
              </div>
            )}

            <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={submit}
                disabled={frequency === 'custom' && customDays.length === 0}>
                <Repeat size={13} /> Save Recurring
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── AKANBI WEEK PLANNER MODAL ─────────────────────────────────────
function AKANBIModal({ onClose }) {
  const [input, setInput]     = useState('')
  const [thinking, setThinking] = useState(false)
  const [plan, setPlan]       = useState(null)

  const generatePlan = async () => {
    if (!input.trim()) return
    setThinking(true)
    await new Promise(r => setTimeout(r, 1200))
    setThinking(false)

    // Smart local plan (real Claude wired in Session 2)
    const leads   = (() => { try { return JSON.parse(localStorage.getItem('ai_os_pipeline_leads') || '[]') } catch { return [] } })()
    const clients = (() => { try { return JSON.parse(localStorage.getItem('ai_os_clients') || '[]') } catch { return [] } })()
    const overdue = leads.filter(l => {
      const days = Math.floor((Date.now() - new Date(l.lastContact || Date.now()).getTime()) / 86400000)
      return days >= 5 && l.stage !== 'closed'
    })

    setPlan({
      summary: `Based on what you told me and your current pipeline (${leads.length} leads, ${clients.length} clients, ${overdue.length} overdue follow-ups), here's your week:`,
      days: [
        { day: 'Monday',    tasks: ['07:00 — Post on LinkedIn', '09:00 — Check pipeline & reply DMs', overdue.length > 0 ? `10:00 — Follow up: ${overdue.slice(0,2).map(l=>l.name).join(', ')}` : '10:00 — Outreach to 5 new leads', '14:00 — Client work session'] },
        { day: 'Tuesday',   tasks: ['09:00 — Check pipeline & reply DMs', '10:00 — Content batch session', '13:00 — Business admin & invoicing'] },
        { day: 'Wednesday', tasks: ['07:00 — Post on LinkedIn', '09:00 — Check pipeline & reply DMs', '10:30 — Follow-up messages', '14:00 — Client work session'] },
        { day: 'Thursday',  tasks: ['09:00 — Check pipeline & reply DMs', '11:00 — Sales call prep', '14:00 — Deep work / project delivery'] },
        { day: 'Friday',    tasks: ['07:00 — Post on LinkedIn', '09:00 — Check pipeline & reply DMs', '11:00 — Weekly pipeline review', '15:00 — Plan next week with AKANBI'] },
        { day: 'Saturday',  tasks: ['10:00 — Content ideation & batching', '12:00 — Learning / skill-building'] },
        { day: 'Sunday',    tasks: ['18:00 — Weekly review', '19:00 — Set intentions for Monday'] },
      ]
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(6,0,42,0.7)', backdropFilter:'blur(6px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'var(--card)', borderRadius:'var(--radius-xl)', padding:'28px', width:'100%', maxWidth:'580px', maxHeight:'85vh', overflowY:'auto', boxShadow:'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'linear-gradient(135deg, #0b0085, #3A10C8)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Brain size={20} style={{ color:'white' }} />
          </div>
          <div style={{ flex:1 }}>
            <h3 style={{ fontSize:'17px', fontWeight:'900' }}>Plan My Week with AKANBI</h3>
            <p style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'1px' }}>Tell me what you want to achieve — I'll organise your week</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {!plan ? (
          <>
            <div className="form-group">
              <label className="label">What do you want to get done this week?</label>
              <textarea
                className="input"
                rows={5}
                autoFocus
                style={{ resize:'vertical', lineHeight:'1.6' }}
                placeholder={`e.g. Close Ahmed, post 3 times this week, follow up with 5 leads, finish the AI OS project for Sarah, batch content for next week...`}
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <p style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'6px' }}>
                💡 Connect Claude API in Settings for AKANBI to fully personalise this with your voice and business context.
              </p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2 }} onClick={generatePlan} disabled={!input.trim() || thinking}>
                {thinking
                  ? <><span className="loading-spinner" style={{ width:'13px', height:'13px', borderColor:'rgba(255,255,255,0.3)', borderTopColor:'white' }} /> Thinking...</>
                  : <><Brain size={14} /> Generate My Week</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background:'var(--blue-light)', borderRadius:'var(--radius-md)', padding:'12px 14px', marginBottom:'16px', fontSize:'13px', color:'var(--blue)', lineHeight:'1.5' }}>
              {plan.summary}
            </div>
            {plan.days.map((d, i) => (
              <div key={i} style={{ marginBottom:'12px', paddingBottom:'12px', borderBottom: i < plan.days.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize:'13px', fontWeight:'800', color:'var(--text-primary)', marginBottom:'6px' }}>{d.day}</div>
                {d.tasks.map((t, j) => (
                  <div key={j} style={{ fontSize:'12px', color:'var(--text-secondary)', padding:'3px 0', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Clock size={10} style={{ color:'var(--text-muted)', flexShrink:0 }} /> {t}
                  </div>
                ))}
              </div>
            ))}
            <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => setPlan(null)}>Regenerate</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={onClose}>Got it — I'll adjust in Planner</button>
            </div>
            <p style={{ fontSize:'11px', color:'var(--text-muted)', textAlign:'center', marginTop:'10px' }}>
              Connect Claude API for AKANBI to auto-fill these directly into your Planner days.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── TASK PILL ─────────────────────────────────────────────────────
function TaskPill({ task, onToggle, onDelete, compact, isRecurring }) {
  const type  = ACTIVITY_TYPES.find(t => t.id === task.type) || ACTIVITY_TYPES[0]
  const Icon  = task.isCalendly ? PhoneCall : type.icon
  const color = task.isCalendly ? '#00C896' : type.color
  const bg    = task.isCalendly ? '#E6FFF8'  : type.bg

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'6px',
      padding: compact ? '5px 6px' : '8px 10px',
      background: task.done ? 'var(--bg)' : 'var(--card)',
      border:`1px solid ${task.done ? 'var(--border)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius:'8px', marginBottom:'5px',
      borderLeft: isRecurring ? `3px solid #F59E0B` : task.isCalendly ? `3px solid #00C896` : `3px solid ${color}`,
      transition:'var(--transition)', opacity: task.done ? 0.65 : 1,
    }}>
      <button onClick={onToggle} style={{ width:'16px', height:'16px', borderRadius:'4px', flexShrink:0, border:'none', background: task.done ? '#00C896' : 'var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
        {task.done && <Check size={9} />}
      </button>

      <div style={{ width:'20px', height:'20px', borderRadius:'5px', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={11} style={{ color }} />
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color: task.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'flex', alignItems:'center', gap:'4px' }}>
          {isRecurring && <Pin size={8} style={{ color:'#F59E0B', flexShrink:0 }} />}
          {task.isCalendly ? `📞 Call: ${task.note || 'Booked Call'}` : (task.note || type.short)}
        </div>
        {task.time && (
          <div style={{ fontSize:'9px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'2px' }}>
            <Clock size={8} />{task.time}
          </div>
        )}
      </div>

      {!isRecurring && (
        <button onClick={onDelete} 
          className="task-delete-btn"
          style={{ background:'none', border:'none', cursor:'pointer', color:'#F43F5E', padding:'4px', flexShrink:0, opacity: 0.8 }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

// ─── RECURRING TASKS MANAGER ───────────────────────────────────────
function RecurringManager({ recurring, onDelete, onClose }) {
  const freqLabel = (r) => {
    if (r.frequency === 'daily')    return 'Every day'
    if (r.frequency === 'weekdays') return 'Weekdays (Mon–Fri)'
    if (r.frequency === 'custom')   return (r.days || []).join(', ')
    return ''
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(6,0,42,0.6)', backdropFilter:'blur(4px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'var(--card)', borderRadius:'var(--radius-xl)', padding:'24px', width:'100%', maxWidth:'480px', maxHeight:'80vh', overflowY:'auto', boxShadow:'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <h3 style={{ fontSize:'16px', fontWeight:'800' }}>Recurring Tasks</h3>
            <p style={{ fontSize:'12px', color:'var(--text-muted)' }}>These auto-fill every applicable day</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {recurring.length === 0 ? (
          <div className="empty-state" style={{ padding:'24px' }}>
            <div className="empty-icon" style={{ background:'#FFFBEB', color:'#F59E0B' }}><Repeat size={22} /></div>
            <p className="empty-title">No recurring tasks yet</p>
            <p className="empty-desc">Add tasks you do consistently — daily, weekdays, or specific days.</p>
          </div>
        ) : (
          recurring.map(r => {
            const type = ACTIVITY_TYPES.find(t => t.id === r.type) || ACTIVITY_TYPES[0]
            const Icon = type.icon
            return (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)', marginBottom:'8px', background:'var(--bg)' }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:type.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={14} style={{ color:type.color }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-primary)' }}>{r.note || type.short}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'8px', marginTop:'2px' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:'3px' }}><Clock size={9} />{r.time}</span>
                    <span style={{ display:'flex', alignItems:'center', gap:'3px' }}><Repeat size={9} />{freqLabel(r)}</span>
                  </div>
                </div>
                <button onClick={() => onDelete(r.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px', borderRadius:'6px' }}
                  onMouseEnter={e => { e.currentTarget.style.background='var(--border)'; e.currentTarget.style.color='#F43F5E' }}
                  onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='var(--text-muted)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── MAIN PLANNER ─────────────────────────────────────────────────
export default function Planner() {
  const [renderError, setRenderError] = useState(null)

  // Move hooks inside a safe block is not possible, so we wrap the return
  try {
    return <PlannerInner />
  } catch (e) {
    return (
      <div style={{ padding:'20px', color:'red' }}>
        <h3>Planner Crash Detected</h3>
        <pre style={{ fontSize:'10px' }}>{e.message}</pre>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }}>Full App Reset</button>
      </div>
    )
  }
}

function PlannerInner() {
  const [tasks,         setTasks]         = useState(loadTasks)
  const [recurring,     setRecurring]     = useState(loadRecurring)
  const [recurringDone, setRecurringDone] = useState(loadRecurringDone)
  const [weekOffset,    setWeekOffset]    = useState(0)
  const [view,          setView]          = useState('week')
  const [selectedDay,   setSelectedDay]   = useState(null)
  const [addingDay,     setAddingDay]     = useState(null)
  const [pickedType,    setPickedType]    = useState(null)
  const [showRecurringForm,    setShowRecurringForm]    = useState(false)
  const [showRecurringManager, setShowRecurringManager] = useState(false)
  const [showAKANBI,           setShowAKANBI]           = useState(false)
  const [syncing,              setSyncing]              = useState(false)

  const weekDates = getWeekDates(weekOffset)
  const todayKey  = new Date().toISOString().split('T')[0]

  useEffect(() => { 
    if (tasks && typeof tasks === 'object') saveTasks(tasks) 
  }, [tasks])
  
  useEffect(() => { 
    if (Array.isArray(recurring)) saveRecurring(recurring) 
  }, [recurring])

  // Poll for externally added tasks - removed to prevent infinite loops during blank screen debugging
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = loadTasks()
      setTasks(prev => JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh)
    }, 2000)
    return () => clearInterval(interval)
  }, [])
  */

  const addTask = (dayKey, task) => {
    setTasks(prev => {
      const updated = { ...prev, [dayKey]: [...(prev[dayKey] || []), task] }
      saveTasks(updated)
      return updated
    })
  }

  const toggleTask = (dayKey, id) => {
    setTasks(prev => {
      const updated = { ...prev, [dayKey]: prev[dayKey].map(t => t.id === id ? { ...t, done: !t.done } : t) }
      saveTasks(updated)
      return updated
    })
  }

  const deleteTask = (dayKey, id) => {
    setTasks(prev => {
      const updated = { ...prev, [dayKey]: (prev[dayKey] || []).filter(t => t.id !== id) }
      saveTasks(updated)
      return updated
    })
  }

  const clearDay = (dayKey) => {
    if (!window.confirm(`Clear all tasks for ${dayKey}?`)) return
    setTasks(prev => {
      const updated = { ...prev, [dayKey]: [] }
      saveTasks(updated)
      return updated
    })
  }

  const clearWeek = () => {
    if (!window.confirm('Clear all tasks for this week?')) return
    setTasks(prev => {
      const updated = { ...prev }
      weekDates.forEach(d => { updated[d.key] = [] })
      saveTasks(updated)
      return updated
    })
  }

  const clearAll = () => {
    if (!window.confirm('WIPE EVERYTHING? This cannot be undone.')) return
    setTasks({})
    saveTasks({})
    setRecurring([])
    saveRecurring([])
    setRecurringDone({})
    saveRecurringDone({})
  }

  const addRecurring = (task) => {
    setRecurring(prev => {
      const updated = [...prev, task]
      saveRecurring(updated)
      return updated
    })
  }

  const deleteRecurring = (id) => {
    setRecurring(prev => {
      const updated = prev.filter(r => r.id !== id)
      saveRecurring(updated)
      return updated
    })
  }

  const toggleRecurringDone = (dateKey, rId) => {
    setRecurringDone(prev => {
      const dayDone = prev[dateKey] || []
      const updated = {
        ...prev,
        [dateKey]: dayDone.includes(rId) ? dayDone.filter(id => id !== rId) : [...dayDone, rId]
      }
      saveRecurringDone(updated)
      return updated
    })
  }

  const todayTasks      = (tasks && typeof tasks === 'object' && tasks[todayKey]) || []
  const todayRecurring  = getRecurringForDay(recurring || [], todayKey)
  const totalDone       = (tasks && typeof tasks === 'object') ? Object.values(tasks).filter(Array.isArray).flat().filter(t => t && t.done).length : 0
  const totalAll        = (tasks && typeof tasks === 'object') ? Object.values(tasks).filter(Array.isArray).flat().filter(t => t).length : 0
  const isCloudReady    = isSupabaseReady()

  // Safety: If tasks is corrupted, provide a reset
  if (!tasks || typeof tasks !== 'object' || Array.isArray(tasks)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Planner needs a reset</h2>
        <p>Something went wrong with the data. Click below to fix it.</p>
        <button className="btn btn-primary" onClick={() => { localStorage.removeItem('ai_os_planner_tasks'); window.location.reload(); }}>
          Reset Planner Data
        </button>
      </div>
    )
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      // Save triggers a push in the current db.js logic
      PlannerDB.save(tasks)
      // Also pull to ensure we have latest from other devices
      await PlannerDB.pull()
      setTasks(PlannerDB.load())
      alert('Sync Complete!')
    } catch (e) {
      alert('Sync Failed: ' + e.message)
    } finally {
      setSyncing(false)
    }
  }

  // Helper for rendering a day's content
  const renderDayContent = (dayKey, isStandalone = false) => {
    const dayTasks      = (tasks && typeof tasks === 'object' && tasks[dayKey]) || []
    const dayRecurring  = getRecurringForDay(recurring || [], dayKey)
    const doneTasks     = (dayTasks || []).filter(t => t && t.done).length
    const doneRecurring = (recurringDone[dayKey] || []).length
    const totalDay      = dayTasks.length + dayRecurring.length
    const doneDay       = doneTasks + doneRecurring
    
    // Mobile-safe date parsing
    const parts = dayKey.split('-')
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    const dayLabel = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

    return (
      <div className={isStandalone ? "" : "day-card-content"}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: isStandalone ? '24px' : '12px' }}>
          {isStandalone && (
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDay(null)}>
              ← Back to Week
            </button>
          )}
          <div style={{ textAlign: isStandalone ? 'center' : 'left', flex: 1 }}>
            <div style={{ fontSize: isStandalone ? '12px' : '9px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
              {getDayName(dayKey)}
            </div>
            <div style={{ fontSize: isStandalone ? '32px' : '22px', fontWeight:'800', color: dayKey === todayKey ? 'var(--blue)' : 'var(--text-primary)', lineHeight:'1.1' }}>
              {isStandalone ? dayLabel : d.getDate()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {totalDay > 0 && (
              <span style={{ fontSize: isStandalone ? '12px' : '9px', fontWeight:'700', color: doneDay === totalDay ? '#00C896' : 'var(--text-muted)', background: doneDay === totalDay ? '#E6FFF8' : 'var(--border)', padding:'2px 8px', borderRadius:'10px' }}>
                {doneDay}/{totalDay}
              </span>
            )}
            {isStandalone && dayTasks.length > 0 && (
              <button className="btn btn-ghost btn-xs" style={{ color: '#F43F5E' }} onClick={() => clearDay(dayKey)}>
                Clear Day
              </button>
            )}
          </div>
        </div>

        {/* Recurring tasks */}
        {dayRecurring.length > 0 && (
          <div style={{ marginBottom:'12px' }}>
            <div style={{ fontSize: isStandalone ? '12px' : '10px', fontWeight:'700', color:'#F59E0B', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px', display:'flex', alignItems:'center', gap:'4px' }}>
              <Pin size={isStandalone ? 12 : 10} /> Recurring
            </div>
            {dayRecurring.map(r => {
              const isDone = (recurringDone[dayKey] || []).includes(r.id)
              return (
                <TaskPill key={`r-${r.id}-${dayKey}`} task={{ ...r, done: isDone }} compact={!isStandalone} isRecurring
                  onToggle={() => toggleRecurringDone(dayKey, r.id)}
                  onDelete={() => {}} />
              )
            })}
            {dayTasks.length > 0 && <div style={{ borderTop:'1px solid var(--border)', margin:'12px 0' }} />}
          </div>
        )}

        {/* Regular tasks */}
        {dayTasks.length === 0 && dayRecurring.length === 0 ? (
          <div className="empty-state" style={{ padding: isStandalone ? '60px 20px' : '20px' }}>
            <div className="empty-icon" style={{ background:'var(--blue-light)', color:'var(--blue)', width: isStandalone ? '48px' : '32px', height: isStandalone ? '48px' : '32px' }}>
              <Calendar size={isStandalone ? 24 : 16} />
            </div>
            <p className="empty-desc">No tasks scheduled for this day.</p>
            <button className="btn btn-primary" style={{ marginTop:'12px' }} onClick={() => setAddingDay(dayKey)}>
              <Plus size={14} /> Add Activity
            </button>
          </div>
        ) : (
          <div>
            {dayTasks.map(t => (
              <TaskPill key={t.id} task={t} compact={!isStandalone}
                onToggle={() => toggleTask(dayKey, t.id)}
                onDelete={() => deleteTask(dayKey, t.id)} />
            ))}
            <button className="btn btn-secondary btn-sm" style={{ marginTop:'12px', width: isStandalone ? 'auto' : '100%' }} onClick={() => setAddingDay(dayKey)}>
              <Plus size={13} /> Add Activity
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Modals */}
      {addingDay && !pickedType && (
        <ActivityPicker onSelect={t => setPickedType(t)} onClose={() => setAddingDay(null)} />
      )}
      {addingDay && pickedType && (
        <AddTaskForm activityType={pickedType} dayKey={addingDay}
          onAdd={task => addTask(addingDay, task)}
          onBack={() => setPickedType(null)}
          onClose={() => { setAddingDay(null); setPickedType(null) }} />
      )}
      {showRecurringForm && (
        <RecurringForm onSave={addRecurring} onClose={() => setShowRecurringForm(false)} />
      )}
      {showRecurringManager && (
        <RecurringManager recurring={recurring} onDelete={deleteRecurring} onClose={() => setShowRecurringManager(false)} />
      )}
      {showAKANBI && <AKANBIModal onClose={() => setShowAKANBI(false)} />}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Planner</h1>
          <p className="page-subtitle">Your daily execution board — every move tracked</p>
        </div>
        <div className="page-actions" style={{ flexWrap:'wrap', gap:'8px' }}>
          {totalAll > 0 && <span className="badge badge-green">{totalDone}/{totalAll} done this week</span>}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRecurringManager(true)} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <Repeat size={13} /> Recurring
            {recurring.length > 0 && <span style={{ background:'var(--blue)', color:'white', borderRadius:'10px', padding:'1px 6px', fontSize:'10px', fontWeight:'700' }}>{recurring.length}</span>}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRecurringForm(true)}>
            <Plus size={13} /> Add Recurring
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAKANBI(true)} style={{ background:'linear-gradient(135deg, #0b0085, #3A10C8)' }}>
            <Brain size={13} /> Plan with AKANBI
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleManualSync} disabled={syncing || !isCloudReady} style={{ display:'flex', alignItems:'center', gap:'6px', color: isCloudReady ? 'var(--blue)' : 'var(--text-muted)' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> 
            {syncing ? 'Syncing...' : isCloudReady ? 'Sync Cloud' : 'Cloud Offline'}
          </button>
          <div className="pill-tabs" style={{ margin:0 }}>
            <button className={`pill-tab${view === 'today' ? ' active' : ''}`} onClick={() => setView('today')}>Today</button>
            <button className={`pill-tab${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}>Week</button>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: '#F43F5E' }} onClick={clearAll}>
            <Trash2 size={13} /> Wipe All
          </button>
        </div>
      </div>

      {/* Activity legend */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'18px' }}>
        {ACTIVITY_TYPES.map(t => {
          const Icon = t.icon
          return (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', background:t.bg, border:`1px solid ${t.color}22` }}>
              <Icon size={10} style={{ color:t.color }} />
              <span style={{ fontSize:'10px', fontWeight:'700', color:t.color }}>{t.short}</span>
            </div>
          )
        })}
        <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', background:'#FFFBEB', border:'1px solid #F59E0B44' }}>
          <Pin size={10} style={{ color:'#F59E0B' }} />
          <span style={{ fontSize:'10px', fontWeight:'700', color:'#F59E0B' }}>Recurring</span>
        </div>
      </div>

      {selectedDay ? (
        <div style={{ maxWidth:'800px', margin:'0 auto' }}>
          <div className="card" style={{ padding:'32px' }}>
            {renderDayContent(selectedDay, true)}
          </div>
        </div>
      ) : view === 'today' ? (
        <div style={{ maxWidth:'640px' }}>
          <div className="card" style={{ padding:'20px' }}>
            {renderDayContent(todayKey, false)}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={14} /></button>
            <span style={{ fontSize:'14px', fontWeight:'700', minWidth:'100px', textAlign:'center' }}>
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
            </span>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={14} /></button>
            {weekOffset !== 0 && <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>Today</button>}
            <button className="btn btn-ghost btn-sm" style={{ color: '#F43F5E', marginLeft: 'auto' }} onClick={clearWeek}>
              Clear Week
            </button>
          </div>

          <div className="week-grid">
            {weekDates.map(day => {
              const dayTasks      = tasks[day.key] || []
              const dayRecurring  = getRecurringForDay(recurring, day.key)
              const doneTasks     = dayTasks.filter(t => t.done).length
              const doneRecurring = (recurringDone[day.key] || []).length
              const totalDay      = dayTasks.length + dayRecurring.length
              const doneDay       = doneTasks + doneRecurring

              return (
                <div key={day.key} className="day-col" 
                  onClick={() => setSelectedDay(day.key)}
                  style={{
                    borderTop: day.isToday ? '3px solid var(--blue)' : '1px solid var(--border)',
                    background: day.isToday ? 'var(--blue-light)' : 'var(--card)',
                    borderRadius:'var(--radius-md)', padding:'12px', minHeight:'160px',
                    cursor: 'pointer', transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div>
                      <div style={{ fontSize:'9px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{day.name}</div>
                      <div style={{ fontSize:'22px', fontWeight:'800', color: day.isToday ? 'var(--blue)' : 'var(--text-primary)', lineHeight:'1' }}>{day.num}</div>
                    </div>
                    {totalDay > 0 && (
                      <span style={{ fontSize:'9px', fontWeight:'700', color: doneDay === totalDay ? '#00C896' : 'var(--text-muted)', background: doneDay === totalDay ? '#E6FFF8' : 'var(--border)', padding:'2px 6px', borderRadius:'10px' }}>
                        {doneDay}/{totalDay}
                      </span>
                    )}
                  </div>

                  {/* Recurring tasks for this day */}
                  {dayRecurring.slice(0, 3).map(r => {
                    const isDone = (recurringDone[day.key] || []).includes(r.id)
                    return (
                      <TaskPill key={`r-${r.id}-${day.key}`} task={{ ...r, done: isDone }} compact isRecurring
                        onToggle={(e) => { e.stopPropagation(); toggleRecurringDone(day.key, r.id) }}
                        onDelete={() => {}} />
                    )
                  })}

                  {/* Regular tasks */}
                  {(dayTasks.slice(0, 3) || []).map(t => (
                    <TaskPill key={t.id} task={t} compact
                      onToggle={(e) => { e.stopPropagation(); toggleTask(day.key, t.id) }}
                      onDelete={(e) => { e.stopPropagation(); deleteTask(day.key, t.id) }} />
                  ))}
                  
                  {(dayTasks.length + dayRecurring.length) > 6 && (
                    <div style={{ fontSize:'9px', color:'var(--text-muted)', textAlign:'center', marginTop:'4px' }}>
                      + {(dayTasks.length + dayRecurring.length) - 6} more...
                    </div>
                  )}

                  <button onClick={(e) => { e.stopPropagation(); setAddingDay(day.key) }}
                    style={{ marginTop:'6px', width:'100%', padding:'5px', background:'none', border:'1px dashed var(--border)', borderRadius:'6px', fontSize:'11px', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', transition:'var(--transition)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.color='var(--blue)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)' }}>
                    <Plus size={11} /> Add
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
