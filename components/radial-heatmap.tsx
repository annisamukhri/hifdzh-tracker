'use client'

import { useState } from 'react'
import type { Session } from '@/lib/types'

interface TooltipData {
  x: number
  y: number
  surahName: string
  time: string
  duration: number
}

interface RadialHeatmapProps {
  sessions: Session[]
  month: number // 0-indexed
  year: number
}

export function RadialHeatmap({ sessions, month, year }: RadialHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const SIZE = 320
  const cx = SIZE / 2
  const cy = SIZE / 2
  const INNER_R = 28  // center hole
  const OUTER_R = 148 // max radius
  const ringWidth = (OUTER_R - INNER_R) / daysInMonth

  // Filter sessions for this month
  const monthSessions = sessions.filter(s => {
    const d = new Date(s.completed_at)
    return d.getMonth() === month && d.getFullYear() === year
  })

  // Build lookup: day -> hour -> session[]
  const map: Record<number, Record<number, Session[]>> = {}
  for (const s of monthSessions) {
    const d = new Date(s.completed_at)
    const day = d.getDate() // 1-indexed
    const hour = d.getHours()
    if (!map[day]) map[day] = {}
    if (!map[day][hour]) map[day][hour] = []
    map[day][hour].push(s)
  }

  // Convert polar to cartesian
  function polar(r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  // Build arc path for a segment
  function arcPath(innerR: number, outerR: number, startAngle: number, endAngle: number) {
    const p1 = polar(outerR, startAngle)
    const p2 = polar(outerR, endAngle)
    const p3 = polar(innerR, endAngle)
    const p4 = polar(innerR, startAngle)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return [
      `M ${p1.x} ${p1.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
      `L ${p3.x} ${p3.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
      'Z',
    ].join(' ')
  }

  const hourSlice = 360 / 24 // 15 degrees per hour

  // Hour labels (every 3 hours)
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21]

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="overflow-visible"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Background rings (grid) */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const r = INNER_R + (i + 1) * ringWidth
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={0.4}
              opacity={0.5}
            />
          )
        })}

        {/* Hour dividers */}
        {Array.from({ length: 24 }, (_, h) => {
          const angle = h * hourSlice - 90
          const rad = (angle * Math.PI) / 180
          return (
            <line
              key={h}
              x1={cx + INNER_R * Math.cos(rad)}
              y1={cy + INNER_R * Math.sin(rad)}
              x2={cx + OUTER_R * Math.cos(rad)}
              y2={cy + OUTER_R * Math.sin(rad)}
              stroke="hsl(var(--border))"
              strokeWidth={0.4}
              opacity={0.5}
            />
          )
        })}

        {/* Session arcs */}
        {Object.entries(map).map(([dayStr, hours]) =>
          Object.entries(hours).map(([hourStr, sesList]) => {
            const day = parseInt(dayStr)
            const hour = parseInt(hourStr)
            const innerR = INNER_R + (day - 1) * ringWidth + 1
            const outerR = INNER_R + day * ringWidth - 1
            const startAngle = hour * hourSlice
            const endAngle = (hour + 1) * hourSlice - 1
            const totalDuration = sesList.reduce((a, s) => a + s.duration_seconds, 0)
            const intensity = Math.min(sesList.length / 3, 1) // 1-3 sessions = full color
            const opacity = 0.4 + intensity * 0.6
            // Distinct colors per session count for better contrast
            const color = sesList.length === 1 ? '#93c5fd' : sesList.length === 2 ? '#2563eb' : '#1e3a5f'

            // Midpoint for tooltip anchor
            const midAngle = (startAngle + endAngle) / 2
            const midR = (innerR + outerR) / 2
            const midPt = polar(midR, midAngle)

            return (
              <path
                key={`${day}-${hour}`}
                d={arcPath(innerR, outerR, startAngle, endAngle)}
                fill={color}
                opacity={1}
                className="cursor-pointer hover:opacity-100 transition-opacity"
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect()
                  const svgScale = SIZE / rect.width
                  setTooltip({
                    x: midPt.x / svgScale,
                    y: midPt.y / svgScale,
                    surahName: sesList[0].surah_name,
                    time: `${String(hour).padStart(2, '0')}:00`,
                    duration: Math.round(totalDuration / 60),
                  })
                }}
              />
            )
          })
        )}

        {/* Center circle */}
        <circle cx={cx} cy={cy} r={INNER_R - 2} fill="hsl(var(--card))" />

        {/* Hour labels */}
        {hourLabels.map(h => {
          const angle = h * hourSlice
          const pt = polar(OUTER_R + 16, angle)
          return (
            <text
              key={h}
              x={pt.x} y={pt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fill="hsl(var(--muted-foreground))"
            >
              {`${String(h).padStart(2, '0')}:00`}
            </text>
          )
        })}

        {/* Day labels — show 1st, 15th, last */}
        {[1, 15, daysInMonth].map(day => {
          const r = INNER_R + (day - 0.5) * ringWidth
          const pt = polar(r, 0)
          const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
          return (
            <text
              key={day}
              x={pt.x + 4} y={pt.y}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={7}
              fill="hsl(var(--muted-foreground))"
            >
              {`${day}${suffix}`}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-md z-10 whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <p className="font-semibold">{tooltip.surahName}</p>
          <p className="text-muted-foreground">Jam {tooltip.time} · {tooltip.duration} Menit</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#93c5fd' }} />
          <span>1 sesi</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#2563eb' }} />
          <span>2 sesi</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1e3a5f' }} />
          <span>3+ sesi</span>
        </div>
      </div>
    </div>
  )
}
