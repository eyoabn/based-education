"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export interface AudioRecordingResult {
  blob: Blob
  url: string
  durationSec: number
  sizeBytes: number
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [durationSec, setDurationSec] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingResult, setRecordingResult] = useState<AudioRecordingResult | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {})
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async (existingStream?: MediaStream | null) => {
    try {
      chunksRef.current = []
      setRecordingResult(null)
      setDurationSec(0)

      let stream: MediaStream
      if (existingStream && existingStream.getAudioTracks().length > 0) {
        stream = existingStream
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      }
      streamRef.current = stream

      // Audio level analyser for waveform feedback
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioContextClass()
        audioContextRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const updateLevel = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)))
          animFrameRef.current = requestAnimationFrame(updateLevel)
        }
        updateLevel()
      } catch (e) {}

      // Pick best supported MIME type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ]
      let selectedMime = ""
      for (const m of mimeTypes) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
          selectedMime = m
          break
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const mime = selectedMime || "audio/webm"
        const finalBlob = new Blob(chunksRef.current, { type: mime })
        const url = URL.createObjectURL(finalBlob)
        setRecordingResult({
          blob: finalBlob,
          url,
          durationSec,
          sizeBytes: finalBlob.size,
        })
        setIsRecording(false)
        setIsPaused(false)

        if (timerRef.current) clearInterval(timerRef.current)
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        setAudioLevel(0)
      }

      // Collect audio chunks every 1 second
      recorder.start(1000)
      setIsRecording(true)
      setIsPaused(false)

      timerRef.current = setInterval(() => {
        setDurationSec(prev => prev + 1)
      }, 1000)

      return true
    } catch (err) {
      console.error("Failed to start audio recording:", err)
      return false
    }
  }, [durationSec])

  const stopRecording = useCallback((): Promise<AudioRecordingResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null)
        return
      }

      const recorder = mediaRecorderRef.current
      const currentDuration = durationSec

      recorder.addEventListener(
        "stop",
        () => {
          const mime = recorder.mimeType || "audio/webm"
          const finalBlob = new Blob(chunksRef.current, { type: mime })
          const url = URL.createObjectURL(finalBlob)
          const result: AudioRecordingResult = {
            blob: finalBlob,
            url,
            durationSec: currentDuration,
            sizeBytes: finalBlob.size,
          }
          setRecordingResult(result)
          resolve(result)
        },
        { once: true }
      )

      recorder.stop()
    })
  }, [durationSec])

  const downloadRecording = useCallback((blob?: Blob | null, filename = "lecture-recording.webm") => {
    const targetBlob = blob || recordingResult?.blob
    if (!targetBlob) return
    const url = URL.createObjectURL(targetBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [recordingResult])

  return {
    isRecording,
    isPaused,
    durationSec,
    audioLevel,
    recordingResult,
    startRecording,
    stopRecording,
    downloadRecording,
    setRecordingResult,
  }
}
