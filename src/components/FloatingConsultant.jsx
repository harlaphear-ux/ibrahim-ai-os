import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Brain, Mic, MicOff, Flame } from 'lucide-react'
import { useVoice } from '../hooks/useVoice'

const WARRIOR_QUOTES = [
  "The difference between where you are and where you want to be is the work you've been avoiding.",
  "Every competitor you have is sleeping in right now. That's your window — use it.",
  "Comfort is the enemy. The moment you feel settled is the moment you stop growing.",
  "Most people stop when it gets hard. That's exactly where you need to start.",
  "You don't need motivation. You need discipline. Motivation is for amateurs.",
  "Your goals don't care how you feel today. Show up anyway.",
  "The market rewards those who deliver, not those who try.",
  "Average people want to be comfortable. Winners want to be useful.",
  "Stop waiting for the right moment. The right moment is built by the right action — today.",
  "Your business is a direct reflection of your standards. What do your standards say right now?",
  "The cost of inaction is always higher than the cost of action. Always.",
  "Every 'I'll do it tomorrow' is a vote against the life you say you want.",
  "Hard work is not the path to success — it is the minimum requirement to get on the path.",
  "You are one decision away from a completely different trajectory. Make it.",
  "The person you need to become matters more than the goal you want to achieve.",
  "Stop being impressed by people who talk. Be impressed by people who execute.",
  "Pain is temporary. Regret is permanent. Choose your suffering wisely.",
  "The world doesn't pay you for potential. It pays for production.",
  "Discipline is just choosing between what you want now and what you want most.",
  "Your business needs a leader, not another employee. Stop managing tasks. Start leading outcomes.",
  "Every excuse you make is a brick in the wall around your own potential.",
  "The market doesn't care about your story. It cares about the problem you solve.",
  "You can't build a $100K business with $10 habits.",
  "Most people won't do what it takes. That's why most people don't get what they want. Be different.",
  "Show me your calendar and I'll show you your priorities. Are you proud of what it says?",
  "The gap between where you are and where you could be is just consistency applied every single day.",
  "You're not tired. You're distracted. There is a difference — and you know it.",
  "Elite consultants don't wait for clients — they create demand.",
  "Every rejection is a redirect. Keep moving.",
  "The man with purpose beats the man with talent every single time.",
  "Your competition isn't working as hard as you think. You are your only real limit.",
  "Winners do what losers won't. Simple as that.",
  "The work you avoid today becomes the regret you carry tomorrow.",
  "Pressure is a privilege. Only those who are doing something that matters get put under it.",
  "Stop asking if you're ready. You won't be. Start anyway.",
]

const CONTEXT_HINTS = {
  command:   'I can see your Command Center. Ask me to analyse your day, prioritise tasks, or break down your numbers.',
  planner:   'I can see your Planner. Ask me to organise your week, set recurring tasks, or tell me what you want to achieve.',
  pipeline:  'I can see your CRM Pipeline. Ask me to draft a follow-up, analyse your pipeline health, or prep for a sales call.',
  clients:   'I can see your Clients tab. Ask me to generate a proposal, suggest an upsell, or review a client\'s progress.',
  content:   'I can see your Content Engine. Ask me to generate a post, repurpose content, or build your weekly content plan.',
  analytics: 'I can see your Analytics. Ask me to spot patterns, interpret your numbers, or identify what needs attention.',
  intel:     "You're in the Intelligence Hub — this is where I operate fully. Ask me anything.",
  vault:     'I can see your Vault. Ask me to help write an SOP, add to your Voice Bible, or search your notes.',
}

const QUICK_PROMPTS = [
  '🔥 Challenge me',
  '🧠 Mindset reset',
  'Draft a follow-up',
  'Analyse my pipeline',
  'Generate a post',
  'Plan my week',
]

const CHALLENGE_RESPONSES = [
  "You said you want to grow your consulting business. So here's the real question: what's the one conversation you've been avoiding this week — a follow-up, a pitch, a price increase? Do it before midnight tonight. Not tomorrow. Tonight. What's stopping you?",
  "Look at your pipeline right now. If every lead disappeared tomorrow, could you generate 5 new ones by Friday? If the answer is no, you don't have a business — you have a dependency. Fix that this week. Start with one cold outreach today.",
  "Most consultants price based on what they think clients can afford. That's backwards and it's costing you money. Price based on the outcome you deliver. When did you last raise your rates? If it's been more than 6 months, you are leaving money on the table right now.",
  "What task have you been putting off for 3+ days? That task is not the problem — the fact that you keep avoiding it is. Do it first thing tomorrow. Before email, before your phone, before anything. Can you commit to that right now?",
  "Here's your challenge: Send one targeted outreach message to a cold prospect today. One. Not a template — a specific, researched, personal message. The consultants who do this consistently are the ones who stay fully booked. Will you do it?",
  "You're building a consulting business in Nigeria charging in dollars. That's already a bold move. Now double down. Who is the one person in your network who could refer you to 3 clients right now? Have you called them this month? Go do it.",
  "Most people spend 80% of their time on things that generate 20% of their results. Look at your last 7 days — be brutally honest. What were you doing that felt productive but wasn't moving revenue? Cut it. This week. What is it?",
]

const MINDSET_RESPONSES = [
  "You're building something most people don't have the courage to even start. Every day you show up is a win over the version of you that stayed comfortable. But showing up isn't enough — showing up with intention is what separates consultants from freelancers. What's your intention for today?",
  "Success is boring. It's the same things, done with excellence, over and over again. The exciting moments are just the compound interest of all the boring days you showed up anyway. Stop chasing the highlight reel. Go do the boring work.",
  "Stop comparing your chapter 3 to someone else's chapter 30. Your only competition is the person you were yesterday. Are you better today? That's the only question that matters.",
  "The market doesn't care about your background, your location, or your circumstances. It cares about results. You already have what it takes — the question is whether you'll consistently deploy it, especially on the days you don't feel like it.",
  "Hard days are where character is built. Easy days are just maintenance. If today feels hard, good — that means you're in the room where growth actually happens. Most people leave that room. You stay.",
  "Discipline isn't punishment. It's the highest form of self-respect. When you do what you said you'd do, even when you don't feel like it, you're building trust with yourself. And a man who trusts himself becomes unstoppable.",
]

export default function FloatingConsultant({ activeTab }) {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([{
    role: 'ai',
    text: "Ibrahim. AKANBI here. I'm not here to comfort you — I'm here to make sure you win. I know your pipeline, your clients, your content, and every goal you've set. What are we conquering today?"
  }])
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)
  const { listening, toggle: toggleVoice, supported: voiceSupported } = useVoice(t => setInput(t))

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const dailyQuote = WARRIOR_QUOTES[dayOfYear % WARRIOR_QUOTES.length]

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (directText) => {
    const text = (directText !== undefined ? directText : input).trim()
    if (!text) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setThinking(true)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400))
    setThinking(false)

    const lower = text.toLowerCase()
    let response

    if (lower.includes('challenge') || lower.includes('push me') || lower.includes('push harder')) {
      response = CHALLENGE_RESPONSES[Math.floor(Math.random() * CHALLENGE_RESPONSES.length)]
    } else if (lower.includes('mindset') || lower.includes('reset') || lower.includes('motivat') || lower.includes('struggling') || lower.includes('feeling') || lower.includes('inspired')) {
      response = MINDSET_RESPONSES[Math.floor(Math.random() * MINDSET_RESPONSES.length)]
    } else {
      response = `Heard. To give you a real, data-driven answer on "${text}", I need your Claude API key connected — go to Vault → Settings → API Keys and paste it in. Once connected, I'll respond with full context from your entire business and give you the exact moves to make. Don't delay on this — every day without it is a day you're operating at 20% of my capability.`
    }

    setMessages(m => [...m, { role: 'ai', text: response }])
  }

  const handleQuickPrompt = (p) => {
    const clean = p.replace(/^[^\w]+/, '').trim()
    if (clean === 'Challenge me' || clean === 'Mindset reset') {
      send(clean)
    } else {
      setInput(p)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="chat-avatar" style={{ background: 'linear-gradient(135deg, #0b0085, #3A10C8)', fontSize: '13px', fontWeight: '900', letterSpacing: '0.02em' }}>AK</div>
            <div style={{ flex: 1 }}>
              <div className="chat-name">AKANBI</div>
              <div className="chat-status">
                <span className="chat-status-dot" />
                Watching: {activeTab}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Daily ignition quote */}
          <div style={{
            margin: '10px 12px 0',
            padding: '10px 13px',
            background: 'linear-gradient(135deg, rgba(11,0,133,0.1), rgba(58,16,200,0.16))',
            border: '1px solid rgba(58,16,200,0.22)',
            borderLeft: '3px solid #3A10C8',
            borderRadius: '10px',
          }}>
            <div style={{ fontSize: '9px', fontWeight: '800', color: '#7C6AF7', letterSpacing: '0.1em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Flame size={9} /> TODAY'S IGNITION
            </div>
            <p style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.55', margin: 0, fontStyle: 'italic' }}>
              "{dailyQuote}"
            </p>
          </div>

          {/* Context hint */}
          <div style={{ padding: '8px 14px', background: 'var(--purple-light)', borderBottom: '1px solid var(--border)', marginTop: '10px' }}>
            <p style={{ fontSize: '11px', color: 'var(--purple)', lineHeight: '1.5', margin: 0 }}>
              <Sparkles size={10} style={{ display: 'inline', marginRight: '4px' }} />
              {CONTEXT_HINTS[activeTab] || CONTEXT_HINTS.command}
            </p>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}
            {thinking && (
              <div className="chat-msg ai" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s 0.2s infinite' }} />
                <span style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s 0.4s infinite' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: '6px', overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
            {QUICK_PROMPTS.map(p => {
              const isWarrior = p.startsWith('🔥') || p.startsWith('🧠')
              return (
                <button
                  key={p}
                  onClick={() => handleQuickPrompt(p)}
                  style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                    fontWeight: '600',
                    border: `1px solid ${isWarrior ? 'rgba(58,16,200,0.3)' : 'var(--border)'}`,
                    background: isWarrior ? 'linear-gradient(135deg, rgba(11,0,133,0.1), rgba(58,16,200,0.15))' : 'var(--bg)',
                    color: isWarrior ? '#7C6AF7' : 'var(--text-secondary)',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'var(--transition)',
                  }}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <div className="chat-input-row">
            {voiceSupported && (
              <button
                onClick={() => toggleVoice(input)}
                title={listening ? 'Stop recording' : 'Speak to AKANBI'}
                style={{
                  width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                  background: listening ? 'rgba(244,63,94,0.15)' : 'var(--bg)',
                  color: listening ? '#F43F5E' : 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.2s',
                  boxShadow: listening ? '0 0 0 3px rgba(244,63,94,0.2)' : 'none',
                  animation: listening ? 'pulse 1.2s infinite' : 'none',
                }}
              >
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            )}
            <input
              className="chat-input"
              placeholder={listening ? '🎙️ Listening...' : 'Tell AKANBI what you need...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button className="btn btn-primary btn-icon" onClick={() => send()} disabled={!input.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button className="floating-btn" onClick={() => setOpen(o => !o)} title="AKANBI — Warrior. Conqueror. Business Partner.">
        {open ? <X size={22} /> : <Brain size={22} />}
      </button>
    </>
  )
}
