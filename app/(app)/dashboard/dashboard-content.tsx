'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame, Target, Clock, BookOpen, TrendingUp } from 'lucide-react'
import type { Profile, Session, AyahProgress, SurahStats, Surah } from '@/lib/types'
import { format, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getSurahByNumber, getSurahsForJuz } from '@/lib/quran-data'
import { RadialHeatmap } from '@/components/radial-heatmap'
import { SurahAyahEditor } from '@/components/ayah-editor/surah-ayah-editor'

interface DashboardContentProps {
  profile: Profile | null
  sessions: Session[]
  ayahProgress: AyahProgress[]
  surahStats: SurahStats[]
  targets: { target_value: number; start_date: string; end_date: string | null; is_active: boolean }[]
}

export function DashboardContent({ profile, sessions, ayahProgress: initialAyahProgress, surahStats, targets }: DashboardContentProps) {
  // W1=3 weeks ago, W2=2 weeks ago, W3=last week, W4=this week (default)
  const [selectedWeek, setSelectedWeek] = useState(3)
  const [radialMonth, setRadialMonth] = useState(new Date().getMonth())
  const [radialYear, setRadialYear] = useState(new Date().getFullYear())
  const [progressJuz, setProgressJuz] = useState<number | null>(null)
  const [progressJuzOpen, setProgressJuzOpen] = useState(false)
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null)
  const [ayahProgress, setAyahProgress] = useState<AyahProgress[]>(initialAyahProgress)

  const weekOffset = selectedWeek - 3 // 0=this week, -1=last, -2=2 ago, -3=3 ago
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  // Derive daily_target from target_type as the source of truth fallback
  const TARGET_TYPE_VALUES: Record<string, number> = { one_ayah: 1, morning_night: 2, five_prayers: 5 }
  const profileDailyTarget = profile?.target_type
    ? TARGET_TYPE_VALUES[profile.target_type] ?? profile?.daily_target ?? 1
    : profile?.daily_target ?? 1

  // Find the daily_target that was active on the Monday of the selected week.
  // targets are ordered by start_date desc, so the first one whose start_date <= weekStart is the one in effect.
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const activeTarget = targets.find(t => t.start_date <= weekStartStr)
  const dailyTarget = activeTarget?.target_value ?? profileDailyTarget

  const stats = useMemo(() => {
    const totalDurationSec = sessions.reduce((acc, s) => acc + s.duration_seconds, 0)
    const totalAyahs = new Set(
      ayahProgress.filter(a => a.status === 'memorized').map(a => `${a.surah_number}-${a.ayah_number}`)
    ).size
    const quranPct = Math.round((totalAyahs / 6236) * 100)
    const totalMins = Math.floor(totalDurationSec / 60)
    const days = Math.floor(totalMins / 1440)
    const hours = Math.floor((totalMins % 1440) / 60)
    const mins = totalMins % 60
    return {
      totalDurationFormatted: `${days}d ${hours}h ${mins}m`,
      totalAyahs,
      quranPct,
      currentStreak: profile?.current_streak || 0,
      longestStreak: profile?.longest_streak || 0,
    }
  }, [sessions, ayahProgress, profile])

  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const daySessions = sessions.filter(s => isSameDay(new Date(s.completed_at), date))
      // Sum memorized_count from all sessions on this day
      const totalAyahs = daySessions.reduce((acc, s) => acc + (s.memorized_count || 0), 0)
      const totalDuration = Math.round(daySessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60)
      return {
        day: format(date, 'EEE'),
        totalAyahs,
        met: totalAyahs >= dailyTarget ? dailyTarget : 0,
        extra: totalAyahs > dailyTarget ? totalAyahs - dailyTarget : 0,
        notMet: totalAyahs < dailyTarget ? totalAyahs : 0,
        duration: totalDuration,
        sessions: daySessions.length,
      }
    })
  }, [sessions, dailyTarget, weekStart.getTime()])

  const weeklySummary = useMemo(() => {
    const totalAyahs = weeklyData.reduce((a, d) => a + d.totalAyahs, 0)
    const totalMinutes = weeklyData.reduce((a, d) => a + d.duration, 0)
    const totalSessions = weeklyData.reduce((a, d) => a + d.sessions, 0)
    const avgMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
    const avgH = Math.floor(avgMinutes / 60), avgM = avgMinutes % 60
    const durH = Math.floor(totalMinutes / 60), durM = totalMinutes % 60
    return {
      totalAyahs,
      totalSessions,
      avgDuration: avgH > 0 ? `${avgH}h ${avgM}m` : `${avgM}m`,
      totalDuration: durH > 0 ? `${durH}h ${durM}m` : `${durM}m`,
    }
  }, [weeklyData])

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Track your memorization progress</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center"><Flame className="w-5 h-5 text-accent-foreground" /></div>
          <div><p className="text-2xl font-bold">{stats.currentStreak}</p><p className="text-xs text-muted-foreground">Current Streak</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{stats.longestStreak}</p><p className="text-xs text-muted-foreground">Longest Streak</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center"><Target className="w-5 h-5 text-secondary" /></div>
          <div><p className="text-2xl font-bold">{stats.quranPct}%</p><p className="text-xs text-muted-foreground">Quran Memorized</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><Clock className="w-5 h-5 text-muted-foreground" /></div>
          <div><p className="text-lg font-bold leading-tight">{stats.totalDurationFormatted}</p><p className="text-xs text-muted-foreground">Total Duration</p></div>
        </CardContent></Card>
      </div>

      {/* Hybrid Weekly Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold">Weekly Progress Overview</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
              </p>
              <p className="text-xs text-muted-foreground">
                This Week&apos;s Plan: {profile?.target_type === 'morning_night' ? 'Morning & Night' : profile?.target_type === 'five_prayers' ? 'Five Prayers' : 'Standard'} ({dailyTarget} Ayah{dailyTarget > 1 ? 's' : ''}/Day)
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-xs shrink-0">
              {['W1', 'W2', 'W3', 'W4'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => setSelectedWeek(i)}
                  className={cn('px-2 py-1 rounded-md transition-colors',
                    selectedWeek === i ? 'bg-background shadow text-foreground font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-1">
          <p className="text-sm font-medium px-3 mb-2">Hybrid Target Chart</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={weeklyData} margin={{ top: 20, right: 36, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="ayah" orientation="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                label={{ value: 'Ayahs', angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 10, fill: '#9ca3af' } }} />
              <YAxis yAxisId="duration" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                label={{ value: 'Duration (Min)', angle: 90, position: 'insideRight', offset: 12, style: { fontSize: 10, fill: '#9ca3af' } }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold mb-1">{label} Session:</p>
                      <p>{d.duration} min total, {d.totalAyahs} ayahs</p>
                      <p>{d.sessions} session{d.sessions !== 1 ? 's' : ''}</p>
                    </div>
                  )
                }}
              />
              <Bar yAxisId="ayah" dataKey="met" stackId="a" fill="#1a5c55" radius={[0, 0, 4, 4]} maxBarSize={44} name="Target Met" />
              <Bar yAxisId="ayah" dataKey="extra" stackId="a" fill="#4bbfb0" radius={[4, 4, 0, 0]} maxBarSize={44} name="Extra" />
              <Bar yAxisId="ayah" dataKey="notMet" stackId="a" fill="#4bbfb0" radius={[4, 4, 4, 4]} maxBarSize={44} name="Below Target" />
              <Line yAxisId="duration" type="monotone" dataKey="duration" stroke="#374151" strokeWidth={2}
                dot={{ r: 4, fill: '#ffffff', stroke: '#374151', strokeWidth: 2 }}
                label={{ position: 'top', fontSize: 10, formatter: (v: number) => v > 0 ? `${v}m` : '0m', fill: '#9ca3af' }}
                name="Duration" />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-4 mt-1 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1a5c55' }} />
              <span className="text-xs text-muted-foreground">Target Met</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#4bbfb0' }} />
              <span className="text-xs text-muted-foreground">Other</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-foreground/70" />
              <span className="text-xs text-muted-foreground">Duration</span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border border-t pt-3">
            <div className="text-center px-2">
              <p className="text-xs text-muted-foreground">Weekly Total</p>
              <p className="text-sm font-semibold">{weeklySummary.totalAyahs} Ayahs</p>
            </div>
            <div className="text-center px-2">
              <p className="text-xs text-muted-foreground">Total Duration</p>
              <p className="text-sm font-semibold">{weeklySummary.totalDuration}</p>
            </div>
            <div className="text-center px-2">
              <p className="text-xs text-muted-foreground">Avg Session</p>
              <p className="text-sm font-semibold">{weeklySummary.avgDuration}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Radial Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Monthly Clock View
            </CardTitle>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <button
                onClick={() => setRadialMonth(m => m === 0 ? 11 : m - 1)}
                className="px-2 py-1 rounded hover:bg-muted transition-colors"
              >‹</button>
              <span className="w-20 text-center font-medium">
                {format(new Date(radialYear, radialMonth), 'MMM yyyy')}
              </span>
              <button
                onClick={() => setRadialMonth(m => {
                  const next = m === 11 ? 0 : m + 1
                  if (m === 11) setRadialYear(y => y + 1)
                  return next
                })}
                className="px-2 py-1 rounded hover:bg-muted transition-colors"
              >›</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <RadialHeatmap sessions={sessions} month={radialMonth} year={radialYear} />
          {/* Monthly footer */}
          {(() => {
            const daysInMonth = new Date(radialYear, radialMonth + 1, 0).getDate()
            const monthlyTarget = dailyTarget * daysInMonth
            const monthlyTotal = sessions
              .filter(s => {
                const d = new Date(s.completed_at)
                return d.getMonth() === radialMonth && d.getFullYear() === radialYear
              })
              .reduce((a, s) => a + (s.memorized_count || 0), 0)
            const pct = monthlyTarget > 0 ? Math.min(Math.round((monthlyTotal / monthlyTarget) * 100), 100) : 0
            return (
              <div className="w-full border-t pt-3">
                <div className="text-center px-2">
                  <p className="text-xs text-muted-foreground">Target Achievement</p>
                  <p className="text-sm font-semibold" style={{ color: pct >= 100 ? '#1a5c55' : pct >= 50 ? '#4bbfb0' : undefined }}>
                    {pct}%
                  </p>
                  <p className="text-xs text-muted-foreground">{monthlyTotal}/{monthlyTarget} ayat</p>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Surah Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Surah Progress
            </CardTitle>
            {/* Juz selector */}
            <div className="relative">
              <button
                onClick={() => setProgressJuzOpen(o => !o)}
                className={cn('flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors',
                  progressJuz ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                )}
              >
                {progressJuz ? `Juz ${progressJuz}` : 'Select Juz'}
                <svg className={cn('w-3 h-3 transition-transform', progressJuzOpen && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {progressJuzOpen && (
                <div className="absolute right-0 top-8 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 w-48">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                    <button
                      key={j}
                      onClick={() => { setProgressJuz(j); setProgressJuzOpen(false) }}
                      className={cn('text-xs px-2 py-1.5 rounded-md transition-colors',
                        progressJuz === j ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
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
          {!progressJuz ? (
            <p className="text-sm text-muted-foreground text-center py-4">Select a Juz to view surah progress</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {getSurahsForJuz(progressJuz).map(s => {
                const memorized = new Set(
                  ayahProgress.filter(a => a.surah_number === s.number && a.status === 'memorized').map(a => a.ayah_number)
                ).size
                const stat = surahStats.find(st => st.surah_number === s.number)
                const totalSessions = stat?.total_sessions ?? 0
                const totalDurationSec = sessions
                  .filter(ses => ses.surah_number === s.number)
                  .reduce((a, ses) => a + ses.duration_seconds, 0)
                const totalDurationMin = Math.round(totalDurationSec / 60)
                const pct = s.numberOfAyahs > 0 ? Math.round((memorized / s.numberOfAyahs) * 100) : 0
                const isComplete = memorized >= s.numberOfAyahs
                return (
                  <div
                    key={s.number}
                    className="space-y-1.5 cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSurah(s)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{s.englishName}</span>
                        <span className="text-xs text-muted-foreground">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span>{totalSessions} session</span>
                        <span>{totalDurationMin}m</span>
                        <span className={cn('font-semibold', isComplete ? 'text-primary' : 'text-foreground')}>
                          {memorized}/{s.numberOfAyahs}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: isComplete ? '#1a5c55' : '#4bbfb0' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SurahAyahEditor
        surah={selectedSurah}
        userId={profile?.id ?? ''}
        initialProgress={ayahProgress.filter(a => a.surah_number === selectedSurah?.number)}
        onClose={() => setSelectedSurah(null)}
        onSaved={(updated) => {
          setAyahProgress(prev => [
            ...prev.filter(a => a.surah_number !== selectedSurah?.number),
            ...updated,
          ])
        }}
      />
    </div>
  )
}
