'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Surah, AyahProgress } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

export interface AyahEditorDiff {
  toAdd: number[]
  toRemove: number[]
}

export interface UseAyahEditor {
  pendingState: Record<number, boolean>
  savedState: Record<number, boolean>
  diff: AyahEditorDiff
  hasChanges: boolean
  saving: boolean
  error: string | null
  toggle: (ayahNumber: number) => void
  save: () => Promise<AyahProgress[]>
  reset: () => void
}

function buildStateFromProgress(progress: AyahProgress[]): Record<number, boolean> {
  return progress.reduce<Record<number, boolean>>((acc, p) => {
    if (p.status === 'memorized') {
      acc[p.ayah_number] = true
    }
    return acc
  }, {})
}

export function useAyahEditor(
  surah: Surah | null,
  userId: string,
  initialProgress: AyahProgress[]
): UseAyahEditor {
  const [savedState, setSavedState] = useState<Record<number, boolean>>(
    () => buildStateFromProgress(initialProgress)
  )
  const [pendingState, setPendingState] = useState<Record<number, boolean>>(
    () => buildStateFromProgress(initialProgress)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync when surah changes so the editor always reflects the correct surah's progress
  useEffect(() => {
    const newState = buildStateFromProgress(initialProgress)
    setSavedState(newState)
    setPendingState(newState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah?.number])

  const diff = useMemo<AyahEditorDiff>(() => {
    const toAdd: number[] = []
    const toRemove: number[] = []

    const allKeys = new Set([
      ...Object.keys(savedState).map(Number),
      ...Object.keys(pendingState).map(Number),
    ])

    for (const ayahNumber of allKeys) {
      const wasSaved = savedState[ayahNumber] ?? false
      const isPending = pendingState[ayahNumber] ?? false
      if (!wasSaved && isPending) toAdd.push(ayahNumber)
      if (wasSaved && !isPending) toRemove.push(ayahNumber)
    }

    return { toAdd, toRemove }
  }, [savedState, pendingState])

  const hasChanges = diff.toAdd.length > 0 || diff.toRemove.length > 0

  function toggle(ayahNumber: number): void {
    setPendingState(prev => ({
      ...prev,
      [ayahNumber]: !prev[ayahNumber],
    }))
  }

  async function save(): Promise<AyahProgress[]> {
    if (!surah) return []
    const supabase = createClient()
    const surahNumber = surah.number
    const { toAdd, toRemove } = diff

    setSaving(true)
    setError(null)
    try {
      // Upsert rows for ayahs being marked as memorized
      if (toAdd.length > 0) {
        const rows = toAdd.map(ayahNumber => ({
          user_id: userId,
          session_id: null,
          surah_number: surahNumber,
          ayah_number: ayahNumber,
          status: 'memorized' as const,
          memorized_at: new Date().toISOString(),
        }))
        const { error: upsertError } = await supabase
          .from('ayah_progress')
          .upsert(rows, { onConflict: 'user_id,surah_number,ayah_number' })
        if (upsertError) throw new Error(upsertError.message)
      }

      // Delete rows for ayahs being unmarked
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('ayah_progress')
          .delete()
          .eq('user_id', userId)
          .eq('surah_number', surahNumber)
          .in('ayah_number', toRemove)
        if (deleteError) throw new Error(deleteError.message)
      }

      // Fetch the updated records for this surah
      const { data, error: fetchError } = await supabase
        .from('ayah_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('surah_number', surahNumber)
      if (fetchError) throw new Error(fetchError.message)

      setSavedState({ ...pendingState })
      return (data ?? []) as AyahProgress[]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return []
    } finally {
      setSaving(false)
    }
  }

  function reset(): void {
    setPendingState(savedState)
  }

  return { pendingState, savedState, diff, hasChanges, saving, error, toggle, save, reset }
}
