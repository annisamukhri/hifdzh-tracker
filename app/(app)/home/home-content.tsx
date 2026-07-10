'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame, BookOpen, Clock, Play, Smartphone, ChevronDown, Sun, Moon } from 'lucide-react'
import type { Profile, Session } from '@/lib/types'
import { getSurahsForJuz } from '@/lib/quran-data'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface MemorizedRow {
  surah_number: number
  ayah_number: number
}

interface HomeContentProps {
  profile: Profile | null
  ayahProgress: MemorizedRow[]
  recentSessions: Session[]
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function HomeContent({ profile, ayahProgress, recentSessions }: HomeContentProps) {
  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null)
  const [juzOpen, setJuzOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const saved = localStorage.getItem('muhaffiz_selected_juz')
    if (saved) setSelectedJuz(parseInt(saved))

    // Clean up OAuth code param from URL if present
    if (window.location.search.includes('code=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  function selectJuz(juz: number) {
    setSelectedJuz(juz)
    setJuzOpen(false)
    localStorage.setItem('muhaffiz_selected_juz', String(juz))
  }

  // Build memorized ayahs set per surah
  const memorizedBySurah: Record<number, Set<number>> = {}
  for (const row of ayahProgress) {
    if (!memorizedBySurah[row.surah_number]) memorizedBySurah[row.surah_number] = new Set()
    memorizedBySurah[row.surah_number].add(row.ayah_number)
  }

  const surahsInJuz = selectedJuz ? getSurahsForJuz(selectedJuz) : []
  const firstIncompleteSurah = surahsInJuz.find(s => (memorizedBySurah[s.number]?.size ?? 0) < s.numberOfAyahs)
  const allComplete = surahsInJuz.length > 0 && !firstIncompleteSurah

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {firstName}</h1>
          <p className="text-muted-foreground">Continue your memorization journey</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 text-muted-foreground" />
              : <Moon className="w-4 h-4 text-muted-foreground" />
            }
          </button>
          <div className="flex items-center gap-1.5 bg-accent/20 px-3 py-1.5 rounded-full">
            <Flame className="w-5 h-5 text-accent-foreground" />
            <span className="font-bold text-accent-foreground">{profile?.current_streak || 0}</span>
          </div>
        </div>
      </div>

      {/* Surah Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Your Progress
            </CardTitle>
            <div className="relative">
              <button
                onClick={() => setJuzOpen(o => !o)}
                className="flex items-center gap-1 text-xs bg-muted px-3 py-1.5 rounded-lg hover:bg-muted/80 transition-colors"
              >
                {selectedJuz ? `Juz ${selectedJuz}` : 'Select Juz'}
                <ChevronDown className={cn('w-3 h-3 transition-transform', juzOpen && 'rotate-180')} />
              </button>
              {juzOpen && (
                <div className="absolute right-0 top-8 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 w-48">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                    <button
                      key={j}
                      onClick={() => { selectJuz(j) }}
                      className={cn(
                        'text-xs px-2 py-1.5 rounded-md transition-colors',
                        selectedJuz === j ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedJuz ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Select a Juz to view surah progress
            </p>
          ) : allComplete ? (
            <div className="text-center py-4 space-y-1">
              <p className="text-2xl">🎉</p>
              <p className="font-semibold text-primary">Barakallah!</p>
              <p className="text-sm text-muted-foreground">You have completed Juz {selectedJuz}</p>
            </div>
          ) : firstIncompleteSurah ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Current surah to memorize:</p>
              {(() => {
                const s = firstIncompleteSurah
                const memorized = memorizedBySurah[s.number]?.size ?? 0
                const pct = Math.round((memorized / s.numberOfAyahs) * 100)
                return (
                  <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-sm font-semibold text-primary truncate">{s.englishName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{s.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground shrink-0 ml-2">
                        {memorized}/{s.numberOfAyahs} ayat
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: '#4bbfb0' }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{pct}% completed</p>
                  </div>
                )
              })()}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Start Session */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Start Session</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/session/physical">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Physical Quran</p>
                  <p className="text-xs text-muted-foreground">Use your printed Quran</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/session/digital">
            <Card className="cursor-pointer hover:border-secondary/50 transition-colors h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-secondary" />
                </div>
                <div>
                  <p className="font-semibold">Digital Quran</p>
                  <p className="text-xs text-muted-foreground">Read in-app with translation</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Sessions</h2>
        </div>
        {recentSessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No sessions yet</p>
              <p className="text-sm text-muted-foreground">Start your first memorization session!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    session.mode === 'physical' ? 'bg-primary/10' : 'bg-secondary/20'
                  }`}>
                    {session.mode === 'physical'
                      ? <BookOpen className="w-5 h-5 text-primary" />
                      : <Smartphone className="w-5 h-5 text-secondary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{session.surah_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.memorized_count} ayah{session.memorized_count !== 1 ? 's' : ''} memorized
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{Math.floor(session.duration_seconds / 60)}m</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.completed_at), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
