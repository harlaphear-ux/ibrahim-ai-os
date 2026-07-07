import { useState } from 'react'
import { Eye, EyeOff, Zap } from 'lucide-react'

export default function Login({ onLogin, isFirstTime }) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (!pw.trim()) return
    if (isFirstTime && pw.length < 6) {
      setErr('Choose a password of at least 6 characters.')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const res = onLogin(pw)
    if (!res.ok) {
      setErr('Wrong password. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>I</span>
        </div>
        <h1 className="login-title">Ibrahim's AI OS</h1>
        <p className="login-sub">
          {isFirstTime
            ? 'Set your access password to get started'
            : 'Enter your password to continue'}
        </p>

        <form onSubmit={handle}>
          <div className="form-group">
            <label className="label">
              {isFirstTime ? 'Create Password' : 'Password'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={show ? 'text' : 'password'}
                placeholder={isFirstTime ? 'Choose a secure password' : '••••••••'}
                value={pw}
                onChange={e => { setPw(e.target.value); setErr('') }}
                autoFocus
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center'
                }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {err && (
              <p style={{ fontSize: '12px', color: 'var(--rose)', marginTop: '6px' }}>
                {err}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: '4px' }}
          >
            {loading
              ? <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
              : <><Zap size={16} /> {isFirstTime ? 'Create & Enter' : 'Enter OS'}</>
            }
          </button>
        </form>

        {isFirstTime && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px', lineHeight: '1.6' }}>
            This password is stored locally on your device.<br />
            You can change it anytime in Settings.
          </p>
        )}
      </div>

      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: '10%', left: '-5%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(0,200,150,0.08) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', right: '-5%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(123,94,167,0.1) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />
    </div>
  )
}
