'use client'

/**
 * useVoiceRecorder
 *
 * Handles MediaRecorder lifecycle:
 *   - Requests mic permission once
 *   - Records to webm (Opus codec — best for Whisper)
 *   - Streams raw audio levels for the waveform visualiser
 *   - Returns a Blob on stop ready to POST to /api/voice/transcribe
 *
 * Usage:
 *   const { state, audioBlob, audioLevel, startRecording, stopRecording, resetRecording } = useVoiceRecorder()
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'done' | 'error'

interface UseVoiceRecorderReturn {
  state:          RecorderState
  audioBlob:      Blob | null
  audioLevel:     number          // 0–100 for waveform display
  durationMs:     number          // how long recording has been running
  errorMessage:   string
  startRecording: () => Promise<void>
  stopRecording:  () => void
  resetRecording: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state,        setState]        = useState<RecorderState>('idle')
  const [audioBlob,    setAudioBlob]    = useState<Blob | null>(null)
  const [audioLevel,   setAudioLevel]   = useState(0)
  const [durationMs,   setDurationMs]   = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const streamRef        = useRef<MediaStream | null>(null)
  const analyserRef      = useRef<AnalyserNode | null>(null)
  const animFrameRef     = useRef<number>(0)
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef     = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _cleanup()
    }
  }, [])

  const _cleanup = () => {
    cancelAnimationFrame(animFrameRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const _startWaveform = (stream: MediaStream) => {
    try {
      // Use webkit prefix for Safari compatibility
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const ctx      = new AudioContextClass()
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(Math.min(100, Math.round(avg * 2)))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      // Gracefully continue even if waveform visualization fails
      console.warn('Waveform initialization failed:', err)
    }
  }

  const startRecording = useCallback(async () => {
    setErrorMessage('')
    setState('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Prefer webm/opus — best Whisper performance
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'  // Safari fallback

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setState('done')
        _cleanup()
        setAudioLevel(0)
      }

      recorder.onerror = () => {
        setErrorMessage('Recording failed. Please try again.')
        setState('error')
        _cleanup()
      }

      // Collect data every 250ms (needed for Safari)
      recorder.start(250)

      _startWaveform(stream)

      // Duration timer
      startTimeRef.current = Date.now()
      setDurationMs(0)
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current)
      }, 200)

      setState('recording')
    } catch (err: any) {
      let msg = `Could not start recording: ${err?.message ?? err}`
      
      // Handle specific error types
      if (err?.name === 'NotAllowedError') {
        msg = 'Microphone access denied. Please check your browser settings and allow microphone access, then click Retry.'
      } else if (err?.name === 'NotFoundError') {
        msg = 'No microphone found. Please check that your microphone is connected.'
      } else if (err?.name === 'NotReadableError') {
        msg = 'Microphone is in use by another application. Please close other apps and retry.'
      } else if (err?.name === 'SecurityError') {
        msg = 'Microphone access blocked due to security policy. This page must be served over HTTPS.'
      }
      
      setErrorMessage(msg)
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setState('processing')
    }
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
  }, [])

  const resetRecording = useCallback(() => {
    _cleanup()
    setAudioBlob(null)
    setAudioLevel(0)
    setDurationMs(0)
    setErrorMessage('')
    setState('idle')
  }, [])

  return {
    state,
    audioBlob,
    audioLevel,
    durationMs,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  }
}
