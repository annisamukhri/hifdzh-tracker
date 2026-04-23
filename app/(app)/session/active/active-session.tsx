'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSurahByNumber, getAudioUrl } from '@/lib/quran-data'
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Repeat,
  Circle,
  Volume2,
  VolumeX,
  Square,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Surah, SessionMode } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AyahState {
  number: number
  memorized: boolean
}

export function ActiveSession() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const surahNumber = parseInt(searchParams.get('surah') || '1')
  const startAyah = parseInt(searchParams.get('start') || '1')
  const endAyah = parseInt(searchParams.get('end') || '1')
  const mode = (searchParams.get('mode') || 'physical') as SessionMode

  const [surah, setSurah] = useState<Surah | null>(null)
  const [ayahs, setAyahs] = useState<AyahState[]>([])
  const [currentAyah, setCurrentAyah] = useState(startAyah)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [saving, setSaving] = useState(false)
  const [quranText, setQuranText] = useState<Record<number, { text: string; words: { text: string; translation: string }[] }>>({})
  const [loadingText, setLoadingText] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize
  useEffect(() => {
    const s = getSurahByNumber(surahNumber)
    if (s) {
      setSurah(s)
      // Initialize ayah states
      const initialAyahs: AyahState[] = []
      for (let i = startAyah; i <= endAyah; i++) {
        initialAyahs.push({ number: i, memorized: false })
      }
      setAyahs(initialAyahs)
    }
  }, [surahNumber, startAyah, endAyah])

  // Load Quran text for digital mode
  useEffect(() => {
    if (mode === 'digital' && surah) {
      setLoadingText(true)
      fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=en&words=true&translations=131&per_page=286&word_fields=text_uthmani,translation`)
        .then(res => res.json())
        .then(data => {
          const textMap: Record<number, { text: string; words: { text: string; translation: string }[] }> = {}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.verses?.forEach((verse: any) => {
            const verseNumber = verse.verse_number
            if (verseNumber >= startAyah && verseNumber <= endAyah) {
              textMap[verseNumber] = {
                text: verse.text_uthmani,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                words: verse.words?.filter((w: any) => w.char_type_name === 'word').map((w: any) => ({
                  text: w.text_uthmani,
                  translation: w.translation?.text || ''
                })) || []
              }
            }
          })
          setQuranText(textMap)
          setLoadingText(false)
        })
        .catch(() => setLoadingText(false))
    }
  }, [mode, surah, surahNumber, startAyah, endAyah])

  // Timer
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  // Format time
  const formatTime = useCallback((s: number) => {
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    const secs = s % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Audio playback
  /*function playAudio(ayahNum: number) {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    audioRef.current = new Audio(getAudioUrl(surahNumber, ayahNum))
    audioRef.current.muted = isMuted
    audioRef.current.play()
    audioRef.current.onended = () => setIsPlaying(false)
    setIsPlaying(true)
  }*/
  function playAudio(ayahNum: number) {
    // 1. Clean up existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null; // Clear previous listener
    }

    // 2. Initialize new audio
    const url = getAudioUrl(surahNumber, ayahNum);
    audioRef.current = new Audio(url);
    audioRef.current.play();
    setIsPlaying(true);

    // 3. Handle what happens when this Ayah finishes
    audioRef.current.onended = () => {
      // Check if we should play the next one
      if (isAutoplay) {
        const nextAyah = ayahNum + 1;

        // Check if the next Ayah is within your current session range
        // Assuming 'endAyah' is the last Ayah in your current session
        if (nextAyah <= endAyah) {
          // You might want to update your UI's currentAyah state here too
          setCurrentAyah(nextAyah);
          playAudio(nextAyah);
        } else {
          // Reached the end of the session
          setIsPlaying(false);
        }
      } else {
        // Normal behavior: just stop
        setIsPlaying(false);
      }
    };
  }

  function toggleAudio() {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      playAudio(currentAyah)
    }
  }

  function toggleAutoplay() {
    setIsAutoplay(!isAutoplay);
  }

  // Toggle ayah memorized
  function toggleAyahMemorized(ayahNum: number) {
    setAyahs(prev => prev.map(a =>
      a.number === ayahNum ? { ...a, memorized: !a.memorized } : a
    ))
  }

  // Navigate ayahs
  function goToAyah(direction: 'prev' | 'next') {
    if (direction === 'prev' && currentAyah > startAyah) {
      setCurrentAyah(currentAyah - 1)
    } else if (direction === 'next' && currentAyah < endAyah) {
      setCurrentAyah(currentAyah + 1)
    }
  }

  // Save session (can be partial or complete)
  async function saveSession(isComplete: boolean) {
    setSaving(true)
    setIsRunning(false) // Stop the timer

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !surah) {
      router.push('/home')
      return
    }

    const memorizedAyahs = ayahs.filter(a => a.memorized)

    // Only save if there's at least some progress
    if (seconds === 0 && memorizedAyahs.length === 0) {
      router.push('/home')
      return
    }

    // Fetch already-memorized ayahs for this surah to avoid double-counting
    const { data: alreadyMemorized } = await supabase
      .from('ayah_progress')
      .select('ayah_number')
      .eq('user_id', user.id)
      .eq('surah_number', surahNumber)
      .eq('status', 'memorized')

    const alreadyMemorizedSet = new Set((alreadyMemorized || []).map(a => a.ayah_number))

    // Only count ayahs that are NEW (not previously memorized)
    const newlyMemorizedAyahs = memorizedAyahs.filter(a => !alreadyMemorizedSet.has(a.number))
    const memorizedCount = newlyMemorizedAyahs.length

    // Create session — memorized_count = only newly memorized ayahs this session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        mode,
        surah_number: surahNumber,
        surah_name: surah.englishName,
        start_ayah: startAyah,
        end_ayah: endAyah,
        memorized_count: memorizedCount,
        duration_seconds: seconds,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Session error:', sessionError)
      setSaving(false)
      return
    }

    // Save ayah progress — upsert all checked ayahs (new + re-checked)
    if (memorizedAyahs.length > 0) {
      const progressData = memorizedAyahs.map(a => ({
        user_id: user.id,
        session_id: session.id,
        surah_number: surahNumber,
        ayah_number: a.number,
        status: 'memorized' as const,
      }))

      await supabase
        .from('ayah_progress')
        .upsert(progressData, {
          onConflict: 'user_id,surah_number,ayah_number',
          ignoreDuplicates: true  // once memorized, never overwrite — ayah checklist is permanent
        })
    }

    // Update surah_stats — increment sessions by 1, memorized by newly memorized count only
    const { data: existingStats } = await supabase
      .from('surah_stats')
      .select('total_sessions, total_memorized')
      .eq('user_id', user.id)
      .eq('surah_number', surahNumber)
      .single()

    await supabase
      .from('surah_stats')
      .upsert({
        user_id: user.id,
        surah_number: surahNumber,
        surah_name: surah.englishName,
        total_sessions: (existingStats?.total_sessions ?? 0) + 1,
        total_memorized: (existingStats?.total_memorized ?? 0) + memorizedCount,
        last_session_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,surah_number' })

    // Update streak
    const today = new Date().toISOString().split('T')[0]
    const { data: latestSession } = await supabase
      .from('sessions')
      .select('completed_at')
      .eq('user_id', user.id)
      .neq('id', session.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    let newStreak = 1
    if (latestSession) {
      const lastDate = new Date(latestSession.completed_at).toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

      if (lastDate === today) {
        // Same day, don't increment
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_streak')
          .eq('id', user.id)
          .single()
        newStreak = profile?.current_streak || 1
      } else if (lastDate === yesterday) {
        // Consecutive day, increment
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_streak')
          .eq('id', user.id)
          .single()
        newStreak = (profile?.current_streak || 0) + 1
      }
      // If more than 1 day gap, reset to 1
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('longest_streak')
      .eq('id', user.id)
      .single()

    await supabase
      .from('profiles')
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, profile?.longest_streak || 0),
      })
      .eq('id', user.id)

    router.push('/home')
  }

  if (!surah) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const memorizedCount = ayahs.filter(a => a.memorized).length
  const totalAyahs = ayahs.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{surah.englishName}</h1>
            <p className="text-sm text-muted-foreground">
              Ayah {startAyah}-{endAyah}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">{formatTime(seconds)}</p>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isRunning ? 'Pause' : 'Resume'} timer
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-32">
        {/* Taawudz & Bismillah */}
        <div className="text-center space-y-1 py-1 border-b pb-3">
          <p className="text-base leading-loose text-muted-foreground" dir="rtl">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>
          <p className="text-base leading-loose text-muted-foreground" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
        </div>
        {/* Digital Mode: Quran Text */}
        {mode === 'digital' && (
          <Card>
            <CardContent className="p-4">
              {loadingText ? (
                <p className="text-center text-muted-foreground py-8">Loading Quran text...</p>
              ) : quranText[currentAyah] ? (
                <div className="space-y-4">
                  <p className="text-2xl leading-loose text-right font-serif" dir="rtl">
                    {quranText[currentAyah].text}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
                    {quranText[currentAyah].words.map((word, i) => (
                      <div key={i} className="text-center bg-muted/50 rounded-lg px-2 py-1">
                        <p className="text-lg font-serif">{word.text}</p>
                        <p className="text-xs text-muted-foreground">{word.translation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No text available</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Ayah Navigation */}
        <Card className={mode === 'physical' ? 'bg-primary/5' : 'bg-secondary/10'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goToAyah('prev')}
                disabled={currentAyah <= startAyah}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Ayah</p>
                <p className="text-3xl font-bold">{currentAyah}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => goToAyah('next')}
                disabled={currentAyah >= endAyah}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audio Controls */}
        {/* Audio Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* NEW: Toggle Play All / Autoplay */}
          <Button
            variant={isAutoplay ? "default" : "outline"}
            size="icon"
            onClick={toggleAutoplay}
            className={cn(
              isAutoplay && "bg-primary/20 text-primary border-primary"
            )}
          >
            <Repeat className={cn("w-5 h-5", isAutoplay && "animate-pulse")} />
          </Button>

          <Button
            size="lg"
            className="w-16 h-16 rounded-full"
            onClick={toggleAudio}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => playAudio(currentAyah)}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>


        {/* Ayah Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Memorization Progress</p>
            <p className="text-sm text-muted-foreground">{memorizedCount}/{totalAyahs} memorized</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {ayahs.map((ayah) => (
              <button
                key={ayah.number}
                onClick={() => toggleAyahMemorized(ayah.number)}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${ayah.memorized
                  ? 'bg-primary text-primary-foreground'
                  : currentAyah === ayah.number
                    ? 'bg-muted ring-2 ring-primary'
                    : 'bg-muted hover:bg-muted/80'
                  }`}
              >
                {ayah.memorized ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  ayah.number
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/home')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => saveSession(true)}
            disabled={saving}
          >
            {saving ?
              ('Saving...'

              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop & Save
                </>
              )}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {memorizedCount > 0
            ? `${memorizedCount} ayah${memorizedCount > 1 ? 's' : ''} will be saved`
            : 'Mark ayahs as memorized to save progress'
          }
        </p>
      </div>
    </div>
  )
}
