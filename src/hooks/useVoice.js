import { useState, useRef, useCallback } from 'react'

/*
  useVoice — unlimited-length speech-to-text
  Uses Web Speech API with auto-restart so it never cuts off (browser stops
  recognition after ~60s; we restart silently while keeping all transcribed text).

  Usage:
    const { listening, toggle, supported } = useVoice(text => setInput(text))
*/
export function useVoice(onTranscript) {
  const [listening, setListening] = useState(false)

  const recognitionRef  = useRef(null)
  const shouldListenRef = useRef(false)   // survives restarts
  const finalTextRef    = useRef('')      // accumulated final transcript
  const baseTextRef     = useRef('')      // text in input before voice started

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const buildRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null

    const r = new SR()
    r.continuous      = true
    r.interimResults  = true
    r.lang            = 'en-US'

    r.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTextRef.current += t + ' '
        } else {
          interim = t
        }
      }
      onTranscript(baseTextRef.current + finalTextRef.current + interim)
    }

    r.onend = () => {
      // Auto-restart if the user hasn't stopped — handles the ~60s browser limit
      if (shouldListenRef.current) {
        try {
          const next = buildRecognition()
          recognitionRef.current = next
          next?.start()
        } catch {}
      } else {
        setListening(false)
      }
    }

    r.onerror = (e) => {
      // 'no-speech' is benign — just restart
      if (e.error === 'no-speech' && shouldListenRef.current) return
      shouldListenRef.current = false
      setListening(false)
    }

    return r
  }, [onTranscript])

  const start = useCallback((currentText = '') => {
    if (!supported) return
    baseTextRef.current  = currentText ? currentText.trimEnd() + ' ' : ''
    finalTextRef.current = ''
    shouldListenRef.current = true

    const r = buildRecognition()
    if (!r) return
    recognitionRef.current = r
    try {
      r.start()
      setListening(true)
    } catch {}
  }, [supported, buildRecognition])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const toggle = useCallback((currentText = '') => {
    if (listening) stop()
    else start(currentText)
  }, [listening, start, stop])

  return { listening, toggle, start, stop, supported }
}
