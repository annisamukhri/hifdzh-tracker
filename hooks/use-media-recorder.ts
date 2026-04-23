import { useState, useRef } from 'react'

interface UseMediaRecorder {
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob>
  permissionError: string | null
}

export function useMediaRecorder(): UseMediaRecorder {
  const [isRecording, setIsRecording] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = async (): Promise<void> => {
    setPermissionError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError('Voice recording not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionError('Microphone access denied. Please allow microphone permission in your browser settings.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setPermissionError('No microphone found. Please connect a microphone and try again.')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setPermissionError('Microphone is already in use by another application.')
        } else {
          setPermissionError(`Microphone error: ${err.name} — ${err.message}`)
        }
      } else {
        setPermissionError('Could not access microphone. Make sure you are on a secure (HTTPS or localhost) connection.')
      }
    }
  }

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder) {
        resolve(new Blob([], { type: 'audio/webm' }))
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []

        // Clean up stream tracks
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        mediaRecorderRef.current = null

        setIsRecording(false)
        resolve(blob)
      }

      recorder.stop()
    })
  }

  return { isRecording, startRecording, stopRecording, permissionError }
}
