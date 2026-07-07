import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, RefreshCw, Mic, MicOff, Copy, Check,
  Bookmark, Trash2, Plus, Send, Image, FileImage,
  Wand2, Layers, Lightbulb, PenLine, CalendarDays,
  FileText, TrendingUp, ArrowRight, Square, Volume2, Download
} from 'lucide-react'
import { Drafts as DraftsDB, Ideas as IdeasDB } from '../lib/db'

/* ─── Sub-tabs ──────────────────────────────────────── */
const SUB_TABS = [
  { id: 'intelligence', label: 'Ideas',           Icon: Lightbulb },
  { id: 'create',       label: 'Draft + Voice',   Icon: PenLine },
  { id: 'repurpose',    label: 'Repurpose',        Icon: RefreshCw },
  { id: 'recycle',      label: 'Recycle',          Icon: RefreshCw },
  { id: 'weekly',       label: 'Weekly Plan',      Icon: CalendarDays },
  { id: 'library',      label: 'Library',          Icon: Bookmark },
  { id: 'drafts',       label: 'Drafts',           Icon: FileText },
  { id: 'best',         label: 'Best Performing',  Icon: TrendingUp },
  { id: 'visuals',      label: 'Visuals',          Icon: Image },
]

const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const IMAGE_TYPES = [
  { id: 'twitter',       label: 'Twitter-Style',   desc: 'Quote card, bold text on solid bg', color: '#1DA1F2', emoji: '🐦' },
  { id: 'billboard',     label: 'Billboard',        desc: 'Large-format, headline + visual',   color: '#FF6B35', emoji: '🪧' },
  { id: 'infographic',   label: 'Infographic',      desc: 'Data, steps, or frameworks visual', color: '#7B5EA7', emoji: '📊' },
  { id: 'handwriting',   label: 'Handwriting',      desc: 'Personal, raw, authentic note feel', color: '#F59E0B', emoji: '✍️' },
  { id: 'illustration',  label: 'Illustration',     desc: 'Custom icon or character art',       color: '#00C896', emoji: '🎨' },
]

/* ─── localStorage keys ─────────────────────────────── */
const DRAFTS_KEY = 'ai_os_content_drafts'
const IDEAS_KEY  = 'ai_os_content_ideas'

function loadDrafts() {
  return DraftsDB.load()
}
function saveDraftsToStorage(arr) {
  DraftsDB.save(arr)
}
function loadIdeas() {
  return IdeasDB.load()
}
function saveIdeasToStorage(arr) {
  IdeasDB.save(arr)
}

/* ─── Web Speech API hook ───────────────────────────── */
function useSpeechRecognition() {
  const [transcript,  setTranscript]  = useState('')
  const [interim,     setInterim]     = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [supported,   setSupported]   = useState(false)
  const [duration,    setDuration]    = useState(0)

  const recognitionRef = useRef(null)
  const recordingRef   = useRef(false)   // ref for use inside callbacks
  const timerRef       = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setSupported(true)

    const rec = new SR()
    rec.continuous      = true
    rec.interimResults  = true
    rec.lang            = 'en-US'
    rec.maxAlternatives = 1

    rec.onresult = (event) => {
      let final = '', interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + ' '
        else interim += t
      }
      if (final) setTranscript(prev => prev + final)
      setInterim(interim)
    }

    rec.onend = () => {
      setInterim('')
      if (recordingRef.current) {
        // Auto-restart so recording works beyond browser's time limit (10+ min sessions)
        try { rec.start() } catch { /* already started */ }
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setIsRecording(false)
        recordingRef.current = false
        alert('Microphone access denied. Please allow mic access in your browser.')
      }
    }

    recognitionRef.current = rec
    return () => { rec.abort() }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    recordingRef.current = true
    setIsRecording(true)
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    try { recognitionRef.current.start() } catch { /* already running */ }
  }, [])

  const stop = useCallback(() => {
    recordingRef.current = false
    setIsRecording(false)
    clearInterval(timerRef.current)
    try { recognitionRef.current?.stop() } catch {}
    setInterim('')
  }, [])

  const clear = useCallback(() => {
    setTranscript('')
    setInterim('')
    setDuration(0)
  }, [])

  return { transcript, interim, isRecording, supported, duration, start, stop, clear, setTranscript }
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* ─── CONTENT INTELLIGENCE ──────────────────────────── */
function ContentIntelligence({ onSaveIdea }) {
  const [generating, setGenerating] = useState(false)
  const [ideas, setIdeas] = useState([])

  const refresh = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1200))
    setGenerating(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Content Intelligence</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            7 pre-built ideas per day — hook, psychology, and angle. All from your real stories.
          </p>
        </div>
        <button className="btn btn-primary" onClick={refresh} disabled={generating}>
          {generating
            ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Generating...</>
            : <><RefreshCw size={14} /> Generate Ideas</>}
        </button>
      </div>

      {ideas.length === 0 && (
        <div style={{ background: 'linear-gradient(135deg, var(--purple-light), var(--blue-light))', border: '1px solid rgba(123,94,167,0.15)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>💡</div>
          <p style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px' }}>Your ideas will appear here</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '400px', margin: '0 auto 20px' }}>
            Fill your Memory &amp; Vault with real stories, client wins, and frameworks. Then hit Generate — the AI pulls from your actual experience, not generic advice.
          </p>
          <button className="btn btn-primary" onClick={refresh} disabled={generating}>
            <Sparkles size={14} /> Generate Ideas (needs API key)
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
            Add your Claude API key in Vault → Settings to unlock this
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── CREATE (merged Draft + Voice) ─────────────────── */
function CreateStudio({ onSaveDraft }) {
  const [mode,      setMode]      = useState('write') // 'write' | 'voice'
  const [idea,      setIdea]      = useState('')
  const [ctaType,   setCtaType]   = useState(null)
  const [generating,setGenerating]= useState(false)
  const [output,    setOutput]    = useState('')
  const [copied,    setCopied]    = useState(false)
  const [format,    setFormat]    = useState(null)
  const [genFormat, setGenFormat] = useState(false)
  const [saved,     setSaved]     = useState(false)

  const speech = useSpeechRecognition()

  const FORMATS = [
    { id: 'post',        label: 'Full Post',          desc: 'Complete LinkedIn post' },
    { id: 'hooks',       label: '3 Hook Options',     desc: 'Pick the strongest opener' },
    { id: 'thread',      label: 'Thread Outline',     desc: 'Multi-post thread structure' },
    { id: 'carousel',    label: 'Carousel Structure', desc: 'Slide-by-slide outline' },
    { id: 'educational', label: 'Educational Post',   desc: 'Teach something valuable' },
  ]

  const activeText = mode === 'voice' ? speech.transcript : idea

  const generate = async () => {
    if (!activeText.trim()) return
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1200))
    const fLabel = mode === 'voice'
      ? (FORMATS.find(f => f.id === format)?.label || 'post')
      : (ctaType === 'comment' ? 'Comment-bait post' : 'DM funnel post')
    setOutput(`Connect your Claude API key in Vault → Settings to generate a ${fLabel} in your exact voice. The AI uses your Voice Bible to match your tone, filters banned phrases, and builds the CTA naturally into the post.`)
    setGenerating(false)
    setSaved(false)
  }

  const saveAndClear = () => {
    onSaveDraft(output)
    setSaved(true)
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content' }}>
        <button
          onClick={() => { setMode('write'); speech.stop() }}
          style={{
            padding: '8px 20px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
            background: mode === 'write' ? 'var(--blue)' : 'var(--card)',
            color: mode === 'write' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <PenLine size={13} /> Write
        </button>
        <button
          onClick={() => setMode('voice')}
          style={{
            padding: '8px 20px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
            background: mode === 'voice' ? 'var(--blue)' : 'var(--card)',
            color: mode === 'voice' ? 'white' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <Mic size={13} /> Voice
        </button>
      </div>

      {/* ── WRITE MODE ── */}
      {mode === 'write' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Draft Generator</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Write in your exact voice. One question first, then it builds.
          </p>

          <div className="form-group">
            <label className="label">Your Idea or Topic</label>
            <textarea
              className="input textarea"
              placeholder="Paste a raw idea, a note, a story... anything. The AI turns it into a post."
              value={idea}
              onChange={e => setIdea(e.target.value)}
              style={{ minHeight: '100px' }}
            />
          </div>

          {idea.trim() && !ctaType && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>One question before I write this:</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>What do you want this post to do?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { key: 'comment', icon: '💬', label: 'Drive Conversation', desc: 'Comment-bait, algorithm growth' },
                  { key: 'dms',     icon: '📥', label: 'Pull Warm Leads',     desc: 'Bottom-of-funnel, DMs to pipeline' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setCtaType(opt.key)}
                    style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', background: 'var(--card)', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{opt.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {ctaType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className={`badge ${ctaType === 'comment' ? 'badge-blue' : 'badge-green'}`}>
                {ctaType === 'comment' ? '💬 Comment-bait CTA' : '📥 DM funnel CTA'}
              </span>
              <button onClick={() => setCtaType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px' }}>change</button>
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={generate}
            disabled={!idea.trim() || !ctaType || generating}
          >
            {generating
              ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Writing in your voice...</>
              : <><Wand2 size={14} /> Write This Post</>}
          </button>
        </div>
      )}

      {/* ── VOICE MODE ── */}
      {mode === 'voice' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Voice Studio</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Speak your thoughts. Works for 10+ minutes. Transcribed live.
          </p>

          {!speech.supported && (
            <div style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--amber-dark)' }}>
              ⚠️ Voice recognition is only supported in Chrome and Edge. Please use one of those browsers.
            </div>
          )}

          {/* Record button */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button
              className={`voice-pill${speech.isRecording ? ' recording' : ''}`}
              onClick={speech.isRecording ? speech.stop : speech.start}
              disabled={!speech.supported}
              style={{ padding: '14px 28px', fontSize: '14px' }}
            >
              {speech.isRecording
                ? <><Square size={14} /> Stop Recording</>
                : <><Mic size={14} /> Tap to Record</>}
            </button>
            {speech.isRecording && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Recording · {formatDuration(speech.duration)} · Auto-restarts for long sessions
                </span>
              </div>
            )}
          </div>

          {/* Live transcript */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="label" style={{ marginBottom: 0 }}>Live Transcript</label>
              {speech.transcript && (
                <button onClick={speech.clear} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Trash2 size={11} /> Clear
                </button>
              )}
            </div>
            <div
              style={{
                minHeight: '120px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '13px',
                lineHeight: 1.7, color: 'var(--text-primary)',
                outline: speech.isRecording ? '2px solid var(--blue)' : 'none',
              }}
            >
              {speech.transcript || (
                <span style={{ color: 'var(--text-muted)' }}>
                  {speech.isRecording ? '🎙 Listening... speak now' : 'Your transcript will appear here as you speak'}
                </span>
              )}
              {speech.interim && (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{speech.interim}</span>
              )}
            </div>
          </div>

          {/* Format picker */}
          {speech.transcript.trim() && (
            <div style={{ marginBottom: '16px' }}>
              <label className="label">Turn this into...</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'post',        label: 'Full Post',           desc: 'Complete LinkedIn post' },
                  { id: 'hooks',       label: '3 Hook Options',      desc: 'Pick the strongest' },
                  { id: 'thread',      label: 'Thread Outline',      desc: 'Multi-post structure' },
                  { id: 'carousel',    label: 'Carousel',            desc: 'Slide-by-slide plan' },
                  { id: 'educational', label: 'Educational Post',    desc: 'Teach the lesson' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    style={{
                      padding: '10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${format === f.id ? 'var(--blue)' : 'var(--border)'}`,
                      background: format === f.id ? 'var(--blue-light)' : 'var(--card)',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1px' }}>{f.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {speech.transcript.trim() && (
            <button
              className="btn btn-primary btn-full"
              onClick={generate}
              disabled={!speech.transcript.trim() || generating}
            >
              {generating
                ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Turning speech into post...</>
                : <><Wand2 size={14} /> Turn into {format ? FORMATS?.find(f => f.id === format)?.label || 'Post' : 'Post'}</>}
            </button>
          )}
        </div>
      )}

      {/* ── Output (shared for both modes) ── */}
      {output && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generated Post</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={copy}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={saveAndClear}
                style={saved ? { color: 'var(--green-dark)', borderColor: 'var(--green-dark)' } : {}}
              >
                {saved ? <><Check size={12} /> Saved to Drafts</> : <><Bookmark size={12} /> Save to Drafts</>}
              </button>
            </div>
          </div>
          <div className="proposal-out">{output}</div>
        </div>
      )}
    </div>
  )
}

/* ─── REPURPOSE ENGINE ──────────────────────────────── */
function RepurposeEngine({ onSaveDraft }) {
  const [input,      setInput]      = useState('')
  const [generating, setGenerating] = useState(false)
  const [results,    setResults]    = useState([])
  const [saved,      setSaved]      = useState({})
  const [copied,     setCopied]     = useState(null)

  const TYPES = [
    { id: 'quick-win',  label: 'Quick Win',           color: 'badge-green'  },
    { id: 'contrarian', label: 'Contrarian Take',      color: 'badge-orange' },
    { id: 'mistake',    label: 'Mistake Story',        color: 'badge-rose'   },
    { id: 'narrative',  label: 'Full Narrative',       color: 'badge-blue'   },
    { id: 'pattern',    label: 'Pattern Observation',  color: 'badge-purple' },
  ]

  const repurpose = async () => {
    if (!input.trim()) return
    setGenerating(true)
    setSaved({})
    await new Promise(r => setTimeout(r, 1500))
    setResults(TYPES.map(t => ({
      ...t,
      text: `Connect your Claude API key to get a "${t.label}" version of this content, written in your exact voice using your Voice Bible.`,
    })))
    setGenerating(false)
  }

  const copyResult = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const saveResult = (id, text) => {
    onSaveDraft(text)
    setSaved(s => ({ ...s, [id]: true }))
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Repurpose Engine</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Paste anything — get 5 angles back simultaneously, all in your voice.
      </p>

      <div className="form-group">
        <label className="label">Content to Repurpose</label>
        <textarea
          className="input textarea"
          placeholder="Paste a post, transcript, note, voice memo... anything."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ minHeight: '120px' }}
        />
      </div>

      <button className="btn btn-primary btn-full" onClick={repurpose} disabled={!input.trim() || generating}>
        {generating
          ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Creating 5 versions...</>
          : <><Layers size={14} /> Get 5 Versions</>}
      </button>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
          {results.map(r => (
            <div key={r.id} className="repurpose-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className={`badge ${r.color}`} style={{ display: 'inline-flex' }}>{r.label}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyResult(r.id, r.text)}>
                    {copied === r.id ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => saveResult(r.id, r.text)}
                    style={saved[r.id] ? { color: 'var(--green-dark)' } : {}}
                  >
                    {saved[r.id] ? <><Check size={11} /> Saved</> : <><Bookmark size={11} /> Save to Drafts</>}
                  </button>
                </div>
              </div>
              <div className="repurpose-text">{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── CONTENT RECYCLER ──────────────────────────────── */
function ContentRecycler({ onSaveDraft }) {
  const [original,   setOriginal]   = useState('')
  const [recycling,  setRecycling]  = useState(false)
  const [results,    setResults]    = useState([])
  const [saved,      setSaved]      = useState({})

  const ANGLES = [
    { id: 'opposite',  label: 'Opposite Take',      desc: 'Flip the argument — fight the other side',   color: 'badge-rose'   },
    { id: 'story',     label: 'Story Version',       desc: 'Turn the insight into a personal story',     color: 'badge-blue'   },
    { id: 'framework', label: 'Framework Post',      desc: 'Extract the system, name it, teach it',      color: 'badge-purple' },
    { id: 'newdata',   label: 'Updated With Data',   desc: 'Add a stat, result, or new development',     color: 'badge-green'  },
    { id: 'short',     label: 'Shorter + Punchier',  desc: 'Cut it to the bone — hook only + insight',   color: 'badge-amber'  },
    { id: 'offer',     label: 'Offer Version',       desc: 'Rewrite it to naturally lead to your CTA',   color: 'badge-orange' },
  ]

  const recycle = async () => {
    if (!original.trim()) return
    setRecycling(true)
    setSaved({})
    await new Promise(r => setTimeout(r, 1400))
    setResults(ANGLES.map(a => ({
      ...a,
      text: `[${a.label}]\n\nConnect your Claude API key to get this post recycled as a "${a.label}" — same core insight, completely new angle, written in your voice.\n\nOriginal: "${original.slice(0, 80)}${original.length > 80 ? '…' : ''}"`,
    })))
    setRecycling(false)
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Content Recycler</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Paste any old post. Get 6 completely different angles — same gold, new packaging.
        Never waste a great idea by posting it only once.
      </p>

      <div className="form-group">
        <label className="label">Paste Your Original Post</label>
        <textarea
          className="input textarea"
          placeholder="Paste any post you've written before — even if it's old, low-performing, or never posted..."
          value={original}
          onChange={e => setOriginal(e.target.value)}
          style={{ minHeight: '120px' }}
        />
      </div>

      <button className="btn btn-primary btn-full" onClick={recycle} disabled={!original.trim() || recycling}>
        {recycling
          ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Recycling into 6 angles...</>
          : <><RefreshCw size={14} /> Recycle into 6 Angles</>}
      </button>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
          {results.map(r => (
            <div key={r.id} className="repurpose-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div>
                  <span className={`badge ${r.color}`} style={{ display: 'inline-flex', marginBottom: '4px' }}>{r.label}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.desc}</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { onSaveDraft(r.text); setSaved(s => ({ ...s, [r.id]: true })) }}
                  style={saved[r.id] ? { color: 'var(--green-dark)' } : {}}
                >
                  {saved[r.id] ? <><Check size={11} /> Saved</> : <><Bookmark size={11} /> Save</>}
                </button>
              </div>
              <div className="repurpose-text">{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── WEEKLY PLANNER ────────────────────────────────── */
function WeeklyPlanner({ onMoveToIdeas }) {
  const [focus,      setFocus]      = useState('')
  const [generating, setGenerating] = useState(false)
  const [plan,       setPlan]       = useState(null)
  const [movedToIdea, setMovedToIdea] = useState({})

  const [mode, setMode] = useState('standard') // 'standard' | 'offer'

  const generate = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1500))
    if (mode === 'offer') {
      setPlan(DAYS_OF_WEEK.map((day, i) => ({
        day,
        format: ['Pain Point Story','Social Proof','Offer Breakdown','Objection Killer','Behind the Scenes','Client Win','Direct CTA'][i],
        hook: 'Connect Claude API key → offer campaign post crafted around your specific service + ICP pain points',
        angle: i === 6 ? '🔥 Direct offer + CTA — "DM me if you want this"' : 'Builds toward the offer without selling',
        time: ['7:00 AM','8:00 AM','7:30 AM','8:00 AM','7:00 AM','9:00 AM','8:00 AM'][i],
        isOffer: true,
      })))
    } else {
      setPlan(DAYS_OF_WEEK.map((day, i) => ({
        day,
        format: ['Personal Story','Insight','Client Win','Contrarian','How-to','Reflection','Week Wrap'][i],
        hook: 'Connect Claude API key → hook crafted from your Voice Bible',
        angle: 'Angle matched to your ICP',
        time: ['7:00 AM','8:00 AM','7:30 AM','8:00 AM','7:00 AM','9:00 AM','Rest'][i],
      })))
    }
    setGenerating(false)
    setMovedToIdea({})
  }

  const moveToIdeas = (dayPlan, idx) => {
    onMoveToIdeas(`[${dayPlan.day}] ${dayPlan.format}: ${dayPlan.hook}`)
    setMovedToIdea(m => ({ ...m, [idx]: true }))
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Weekly Content Planner</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        One tap. Full 7-day plan with format, hook, angle, and best time.
      </p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content' }}>
        {[
          { id: 'standard', label: 'Standard Week' },
          { id: 'offer',    label: '🔥 Offer Campaign' },
        ].map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setPlan(null) }}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: mode === m.id ? 'var(--blue)' : 'var(--card)', color: mode === m.id ? 'white' : 'var(--text-secondary)' }}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: '200px' }}
          placeholder={mode === 'offer' ? "What offer are you promoting? e.g. 'AI OS Build at $2,500'" : "Weekly focus? e.g. 'AI automation for coaches'"}
          value={focus}
          onChange={e => setFocus(e.target.value)}
        />
        <button className="btn btn-primary" onClick={generate} disabled={generating}>
          {generating
            ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Building plan...</>
            : <><Sparkles size={14} /> Build 7-Day Plan</>}
        </button>
      </div>

      {!plan ? (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>📅</div>
          <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Your weekly plan will appear here</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Auto-generates every Monday using your Voice Bible, client results, and AI trends.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.map((day, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '70px', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{day.day.slice(0, 3)}</div>
                <div style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: '600', marginTop: '2px' }}>{day.time}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '6px' }}>
                  <span className="badge badge-blue">{day.format}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{day.hook}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{day.angle}</div>
              </div>
              <button
                onClick={() => moveToIdeas(day, i)}
                disabled={movedToIdea[i]}
                title="Move to Ideas Library"
                style={{
                  flexShrink: 0, padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px',
                  fontWeight: '600', cursor: movedToIdea[i] ? 'default' : 'pointer', border: 'none',
                  background: movedToIdea[i] ? 'var(--green-light)' : 'var(--blue-light)',
                  color: movedToIdea[i] ? 'var(--green-dark)' : 'var(--blue)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                {movedToIdea[i] ? <><Check size={11} /> Saved</> : <><ArrowRight size={11} /> Ideas</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── IDEA LIBRARY ──────────────────────────────────── */
function IdeaLibrary({ ideas, onAddIdea, onDeleteIdea }) {
  const [newIdea, setNewIdea] = useState('')

  const add = () => {
    if (!newIdea.trim()) return
    onAddIdea({ id: Date.now(), text: newIdea.trim(), saved: new Date().toLocaleDateString() })
    setNewIdea('')
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Idea Library</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Capture any idea. Items moved from Weekly Plan also land here.
      </p>

      <div className="input-row" style={{ marginBottom: '20px' }}>
        <input className="input" placeholder="Quick idea capture..." value={newIdea} onChange={e => setNewIdea(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-primary" onClick={add}><Plus size={14} /> Save</button>
      </div>

      {ideas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'var(--amber-light)', color: 'var(--amber-dark)' }}><Bookmark size={22} /></div>
          <p className="empty-title">No ideas yet</p>
          <p className="empty-desc">Type an idea above, or move items from the Weekly Plan tab using the → Ideas button.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ideas.map(idea => (
            <div key={idea.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{idea.text}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{idea.saved}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}><Layers size={11} /> Repurpose</button>
                <button onClick={() => onDeleteIdea(idea.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── DRAFTS ────────────────────────────────────────── */
function Drafts({ drafts, onDelete }) {
  const [copied, setCopied] = useState(null)
  const copy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Drafts</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Every saved post lives here — from Draft Generator, Voice Studio, and Repurpose Engine.
      </p>
      {drafts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}><FileImage size={22} /></div>
          <p className="empty-title">No drafts yet</p>
          <p className="empty-desc">Generate posts in Draft + Voice or Repurpose and click "Save to Drafts".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {drafts.map((d) => (
            <div key={d.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{d.savedAt}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.7', marginBottom: '10px' }}>{d.text}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => copy(d.id, d.text)}>
                  {copied === d.id ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(d.id)}><Trash2 size={11} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── BEST PERFORMING ───────────────────────────────── */
function BestPerforming({ onSaveDraft }) {
  const [posts,      setPosts]      = useState([])
  const [newPost,    setNewPost]    = useState('')
  const [analyzing,  setAnalyzing]  = useState(null)
  const [repurposing,setRepurposing]= useState(null)
  const [savedR,     setSavedR]     = useState({})

  const addPost = () => {
    if (!newPost.trim()) return
    setPosts(p => [...p, { id: Date.now(), text: newPost.trim(), analysis: null }])
    setNewPost('')
  }

  const analyze = async (id) => {
    setAnalyzing(id)
    await new Promise(r => setTimeout(r, 1500))
    setPosts(p => p.map(x => x.id === id ? {
      ...x,
      analysis: {
        score: Math.floor(Math.random() * 30) + 70,
        reasons: [
          'Strong pattern-interrupt hook in line 1',
          'Specific number creates credibility and curiosity',
          'Personal story with clear before/after arc',
          'Natural CTA that invites without pressure',
        ],
        topElement: 'The hook',
      }
    } : x))
    setAnalyzing(null)
  }

  const repurpose = async (id, text) => {
    setRepurposing(id)
    const draft = `Repurposed version of your best-performing post:\n\n${text}\n\n[Connect Claude API key to get 5 angles: Quick Win, Contrarian Take, Mistake Story, Narrative, Pattern Observation]`
    await new Promise(r => setTimeout(r, 800))
    onSaveDraft(draft)
    setSavedR(s => ({ ...s, [id]: true }))
    setRepurposing(null)
    setTimeout(() => setSavedR(s => ({ ...s, [id]: false })), 3000)
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Best Performing Content</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Paste your top posts. See why they worked. Repurpose with one click.
        The AI learns your winning patterns and applies them to new drafts.
      </p>

      <div className="form-group">
        <label className="label">Paste a Top Performing Post</label>
        <textarea
          className="input textarea"
          placeholder="Paste a post that performed well — high impressions, lots of comments, DMs it generated..."
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          style={{ minHeight: '100px' }}
        />
      </div>
      <button className="btn btn-primary" style={{ marginBottom: '24px' }} disabled={!newPost.trim()} onClick={addPost}>
        <Plus size={14} /> Add Post
      </button>

      {posts.length === 0 ? (
        <div style={{ background: 'linear-gradient(135deg, var(--amber-light), var(--orange-light))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-lg)', padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🏆</div>
          <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Add your best posts above</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The AI will analyze why each one worked — hooks, structure, psychology, timing —
            and automatically apply those patterns to every new draft you generate.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: '12px' }}>
                {post.text}
              </div>

              {!post.analysis ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" disabled={analyzing === post.id} onClick={() => analyze(post.id)}>
                    {analyzing === post.id
                      ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '12px', height: '12px' }} /> Analyzing...</>
                      : <><Sparkles size={12} /> Why Did This Work?</>}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={() => setPosts(p => p.filter(x => x.id !== post.id))}>
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'var(--green-light)', border: '1px solid rgba(0,158,119,0.2)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--green-dark)' }}>Why this post worked:</p>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--green-dark)' }}>{post.analysis.score}/100</span>
                    </div>
                    {post.analysis.reasons.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--green-dark)', fontSize: '11px', marginTop: '1px' }}>✓</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={repurposing === post.id}
                      onClick={() => repurpose(post.id, post.text)}
                      style={savedR[post.id] ? { background: 'var(--green-dark)' } : {}}
                    >
                      {repurposing === post.id
                        ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '12px', height: '12px' }} /> Repurposing...</>
                        : savedR[post.id]
                          ? <><Check size={12} /> Saved to Drafts</>
                          : <><RefreshCw size={12} /> Repurpose → Drafts</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── PDF CAROUSEL GENERATOR ────────────────────────── */
function PDFCarousel() {
  const [slides,     setSlides]     = useState([{ id: 1, title: '', body: '' }])
  const [brandName,  setBrandName]  = useState('')
  const [brandColor, setBrandColor] = useState('#0b0085')
  const [generating, setGenerating] = useState(false)

  const addSlide = () => {
    if (slides.length >= 20) return
    setSlides(s => [...s, { id: Date.now(), title: '', body: '' }])
  }

  const removeSlide = (id) => {
    if (slides.length <= 1) return
    setSlides(s => s.filter(x => x.id !== id))
  }

  const updateSlide = (id, key, val) =>
    setSlides(s => s.map(x => x.id === id ? { ...x, [key]: val } : x))

  const hasContent = slides.some(s => s.title.trim() || s.body.trim())

  const generatePDF = () => {
    setGenerating(true)
    const pw = window.open('', '_blank')
    if (!pw) {
      alert('Please allow pop-ups to generate your PDF carousel.')
      setGenerating(false)
      return
    }

    const escape = str => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    const slidesHTML = slides.map((sl, i) => `
      <div class="slide">
        <div class="slide-num">${i + 1} <span style="opacity:0.4">/ ${slides.length}</span></div>
        ${sl.title ? `<h2 class="slide-title">${escape(sl.title)}</h2>` : ''}
        ${sl.body  ? `<p  class="slide-body">${escape(sl.body)}</p>`   : ''}
        ${brandName ? `<div class="slide-brand" style="color:${brandColor}">${escape(brandName)}</div>` : ''}
        <div class="slide-bar" style="background:${brandColor}"></div>
      </div>
    `).join('')

    pw.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>LinkedIn PDF Carousel</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#e8e8e8; }
  .slide {
    width: 1080px; min-height: 1080px; background: white;
    display: flex; flex-direction: column; justify-content: center;
    padding: 90px 80px 90px; position: relative;
    margin: 24px auto; page-break-after: always;
    box-shadow: 0 6px 30px rgba(0,0,0,0.12);
  }
  .slide-num {
    position: absolute; top: 36px; right: 44px;
    font-size: 15px; font-weight: 700; color: #aaa;
  }
  .slide-title {
    font-size: 52px; font-weight: 900; line-height: 1.15;
    margin-bottom: 28px; color: #111; letter-spacing: -0.02em;
  }
  .slide-body {
    font-size: 26px; line-height: 1.75; color: #333; flex: 1;
  }
  .slide-brand {
    position: absolute; bottom: 52px; left: 80px;
    font-size: 15px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
  }
  .slide-bar {
    position: absolute; bottom: 0; left: 0; right: 0; height: 8px; border-radius: 0 0 4px 4px;
  }
  @media print {
    body { background: white; }
    .slide { box-shadow: none; margin: 0; width: 100vw; min-height: 100vh; }
  }
</style>
</head><body>
${slidesHTML}
<script>setTimeout(() => { window.print(); }, 600 );</script>
</body></html>`)
    pw.document.close()
    setTimeout(() => setGenerating(false), 1200)
  }

  return (
    <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>PDF Carousel Generator</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Build slide-by-slide → export as PDF → upload to LinkedIn as a document post
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={addSlide}
          disabled={slides.length >= 20}
        >
          <Plus size={12} /> Add Slide {slides.length >= 20 ? '(max)' : `(${slides.length}/20)`}
        </button>
      </div>

      {/* Brand settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <input
          className="input"
          placeholder="Your name or brand (shown on each slide)"
          value={brandName}
          onChange={e => setBrandName(e.target.value)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Brand colour</span>
          <input
            type="color"
            value={brandColor}
            onChange={e => setBrandColor(e.target.value)}
            style={{
              width: '36px', height: '36px', border: '2px solid var(--border)',
              borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'var(--card)',
            }}
          />
        </div>
      </div>

      {/* Slides */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {slides.map((sl, i) => (
          <div
            key={sl.id}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{
                fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                Slide {i + 1}
              </span>
              {slides.length > 1 && (
                <button
                  onClick={() => removeSlide(sl.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '2px', lineHeight: 1,
                  }}
                  title="Remove slide"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <input
              className="input"
              placeholder={i === 0 ? 'Slide title — e.g. "5 things I learned about AI ops"' : 'Slide title (optional)'}
              value={sl.title}
              onChange={e => updateSlide(sl.id, 'title', e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <textarea
              className="input textarea"
              placeholder={i === 0 ? 'Hook or intro text...' : 'Slide content — keep it punchy, one idea per slide'}
              value={sl.body}
              onChange={e => updateSlide(sl.id, 'body', e.target.value)}
              style={{ minHeight: '70px' }}
            />
          </div>
        ))}
      </div>

      {/* Generate button */}
      <button
        className="btn btn-primary btn-full"
        onClick={generatePDF}
        disabled={!hasContent || generating}
      >
        {generating
          ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Opening print preview...</>
          : <><Download size={14} /> Export PDF Carousel ({slides.length} slide{slides.length !== 1 ? 's' : ''})</>}
      </button>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
        Opens a styled print preview · Choose <strong>"Save as PDF"</strong> in the print dialog
      </p>
    </div>
  )
}

/* ─── VISUALS ───────────────────────────────────────── */
function Visuals() {
  const [imageType,  setImageType]  = useState(null)
  const [prompt,     setPrompt]     = useState('')
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1500))
    setGenerating(false)
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>LinkedIn Visuals</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Choose the type of creative, paste your content, generate.
      </p>

      {/* Image type selector */}
      <div className="form-group">
        <label className="label">Image Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          {IMAGE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setImageType(t.id)}
              style={{
                padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${imageType === t.id ? t.color : 'var(--border)'}`,
                background: imageType === t.id ? t.color + '18' : 'var(--card)',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.emoji}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{t.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content input */}
      <div className="form-group">
        <label className="label">Your Content</label>
        <textarea
          className="input textarea"
          placeholder="Paste your post, quote, or key message here. The AI will design a visual around it."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ minHeight: '100px' }}
        />
      </div>

      <button
        className="btn btn-primary btn-full"
        onClick={generate}
        disabled={!imageType || !prompt.trim() || generating}
      >
        {generating
          ? <><span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }} /> Generating visual...</>
          : <><Image size={14} /> Generate {imageType ? IMAGE_TYPES.find(t => t.id === imageType)?.label : 'Visual'}</>}
      </button>

      {!imageType && (
        <div style={{ marginTop: '24px', background: 'linear-gradient(135deg, var(--blue-light), var(--purple-light))', border: '1px solid rgba(0,119,181,0.15)', borderRadius: 'var(--radius-xl)', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🖼️</div>
          <p style={{ fontSize: '15px', fontWeight: '800', marginBottom: '8px' }}>Visual Content Engine</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto 16px' }}>
            Select a visual type above, paste your content, and generate branded LinkedIn creatives — Twitter cards, billboard images, infographics, handwriting notes, and illustrations.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Requires API key + design context — full activation in Session 3
          </p>
        </div>
      )}

      {/* PDF Carousel — always visible */}
      <PDFCarousel />
    </div>
  )
}

/* ─── MAIN CONTENT ENGINE ───────────────────────────── */
export default function Content() {
  const [activeTab,   setActiveTab]   = useState('intelligence')
  const [savedDrafts, setSavedDrafts] = useState(loadDrafts)
  const [savedIdeas,  setSavedIdeas]  = useState(loadIdeas)

  // Persist to localStorage
  useEffect(() => { saveDraftsToStorage(savedDrafts) }, [savedDrafts])
  useEffect(() => { saveIdeasToStorage(savedIdeas) }, [savedIdeas])

  const addDraft = (text) => {
    setSavedDrafts(d => [{ id: Date.now(), text, savedAt: new Date().toLocaleDateString() }, ...d])
  }
  const deleteDraft = (id) => setSavedDrafts(d => d.filter(x => x.id !== id))

  const addIdea = (idea) => setSavedIdeas(i => [idea, ...i])
  const deleteIdea = (id) => setSavedIdeas(i => i.filter(x => x.id !== id))

  const moveWeeklyToIdeas = (text) => {
    addIdea({ id: Date.now(), text, saved: new Date().toLocaleDateString() })
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'intelligence': return <ContentIntelligence onSaveIdea={addIdea} />
      case 'create':       return <CreateStudio onSaveDraft={addDraft} />
      case 'repurpose':    return <RepurposeEngine onSaveDraft={addDraft} />
      case 'recycle':      return <ContentRecycler onSaveDraft={addDraft} />
      case 'weekly':       return <WeeklyPlanner onMoveToIdeas={moveWeeklyToIdeas} />
      case 'library':      return <IdeaLibrary ideas={savedIdeas} onAddIdea={addIdea} onDeleteIdea={deleteIdea} />
      case 'drafts':       return <Drafts drafts={savedDrafts} onDelete={deleteDraft} />
      case 'best':         return <BestPerforming onSaveDraft={addDraft} />
      case 'visuals':      return <Visuals />
      default:             return null
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Content Engine</h1>
          <p className="page-subtitle">Create, repurpose, and plan LinkedIn content in your exact voice</p>
        </div>
        <div className="page-actions">
          {savedDrafts.length > 0 && (
            <span className="badge badge-blue">{savedDrafts.length} saved drafts</span>
          )}
        </div>
      </div>

      <div className="content-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`content-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.Icon && <t.Icon size={13} style={{ flexShrink: 0 }} />}
            {t.label}
            {t.id === 'drafts' && savedDrafts.length > 0 && (
              <span style={{
                marginLeft: '4px', background: 'var(--blue)', color: 'white',
                fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '8px',
              }}>
                {savedDrafts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  )
}
