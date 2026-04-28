'use client'

import { useState, useEffect, useRef } from 'react'
import { InfoIcon, X } from 'lucide-react'
import type { Surah, AyahProgress } from '@/lib/types'
import { useAyahEditor } from '@/hooks/use-ayah-editor'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { ConfirmationDialog } from './confirmation-dialog'
import { cn } from '@/lib/utils'

interface SurahAyahEditorProps {
  surah: Surah | null
  userId: string
  initialProgress: AyahProgress[]
  onClose: () => void
  onSaved: (updated: AyahProgress[]) => void
}


export function SurahAyahEditor({
  surah,
  userId,
  initialProgress,
  onClose,
  onSaved,
}: SurahAyahEditorProps) {
  const {
    pendingState,
    savedState,
    diff,
    hasChanges,
    saving,
    error,
    toggle,
    save,
    reset,
  } = useAyahEditor(surah, userId, initialProgress)

  const [showConfirmSave, setShowConfirmSave] = useState(false)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false)
  const [dismissedError, setDismissedError] = useState(false)

  const pendingSaveResult = useRef<AyahProgress[] | null>(null)

  useEffect(() => {
    if (!saving && pendingSaveResult.current !== null) {
      const result = pendingSaveResult.current
      pendingSaveResult.current = null
      if (!error) {
        onSaved(result)
        onClose()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving])

  const memorizedCount = Object.values(pendingState).filter(Boolean).length
  const visibleError = error && !dismissedError ? error : null

  function handleCancelClick() {
    if (hasChanges) {
      setShowDiscardPrompt(true)
    } else {
      onClose()
    }
  }

  function handleDiscard() {
    reset()
    setShowDiscardPrompt(false)
    onClose()
  }

  async function handleConfirmSave() {
    setShowConfirmSave(false)
    setDismissedError(false)
    const result = await save()
    pendingSaveResult.current = result
  }


  return (
    <>
      <Drawer
        open={surah !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelClick()
        }}
        direction="bottom"
      >
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base">
                {surah?.name ?? ''}
              </DrawerTitle>
              <span className="text-sm text-muted-foreground">
                {memorizedCount} / {surah?.numberOfAyahs ?? 0} memorized
              </span>
            </div>
          </DrawerHeader>

          <div className="flex items-start gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground text-xs border-b">
            <InfoIcon className="size-3.5 mt-0.5 shrink-0" />
            <span>Changes here do not count toward session-based progress</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {surah &&
              Array.from({ length: surah.numberOfAyahs }, (_, i) => i + 1).map((ayahNum) => {
                const isPending = pendingState[ayahNum] ?? false
                const isSaved = savedState[ayahNum] ?? false
                const isChanged = isPending !== isSaved

                return (
                  <label
                    key={ayahNum}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer select-none border-b border-border/50 transition-colors',
                      isChanged
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-muted/40',
                    )}
                  >
                    <Checkbox
                      checked={isPending}
                      onCheckedChange={() => toggle(ayahNum)}
                    />
                    <span className="text-sm">Ayah {ayahNum}</span>
                  </label>
                )
              })}
          </div>


          <DrawerFooter className="border-t pt-3 gap-2">
            {showDiscardPrompt && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive flex items-start justify-between gap-2">
                <span>Discard unsaved changes?</span>
                <div className="flex gap-2 shrink-0">
                  <button
                    className="underline text-xs font-medium"
                    onClick={() => setShowDiscardPrompt(false)}
                  >
                    Keep editing
                  </button>
                  <button
                    className="underline text-xs font-medium"
                    onClick={handleDiscard}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {visibleError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive flex items-start justify-between gap-2">
                <span>{visibleError}</span>
                <button onClick={() => setDismissedError(true)} aria-label="Dismiss error">
                  <X className="size-4 shrink-0" />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCancelClick}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!hasChanges}
                onClick={() => {
                  setDismissedError(false)
                  setShowConfirmSave(true)
                }}
              >
                Save
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConfirmationDialog
        open={showConfirmSave}
        toAdd={diff.toAdd}
        toRemove={diff.toRemove}
        saving={saving}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirmSave(false)}
      />
    </>
  )
}
