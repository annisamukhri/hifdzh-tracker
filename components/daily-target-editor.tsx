'use client'

import { useState } from 'react'
import { isMonday, validateTarget } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface DailyTargetEditorProps {
  currentTarget: number
  userId: string
  onTargetUpdated: (newTarget: number) => void
}

export function DailyTargetEditor({
  currentTarget,
  userId,
  onTargetUpdated,
}: DailyTargetEditorProps) {
  const [inputValue, setInputValue] = useState(String(currentTarget))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const enabled = isMonday(new Date())

  async function performSave(value: number) {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const supabase = createClient()
      const { error: supabaseError } = await supabase
        .from('profiles')
        .update({ daily_target: value })
        .eq('id', userId)

      if (supabaseError) throw supabaseError

      onTargetUpdated(value)
      setSaveSuccess(true)
    } catch {
      setError('Failed to save. Please try again.')
      setInputValue(String(currentTarget))
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaveSuccess(false)

    const validationError = validateTarget(inputValue)
    if (validationError) {
      setError(validationError)
      return
    }

    const parsed = parseInt(inputValue.trim(), 10)
    if (parsed > 20) {
      setShowConfirm(true)
      return
    }

    performSave(parsed)
  }

  function handleConfirm() {
    setShowConfirm(false)
    const parsed = parseInt(inputValue.trim(), 10)
    performSave(parsed)
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          type="number"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError(null)
            setSaveSuccess(false)
          }}
          disabled={!enabled}
          aria-label="Daily target"
          className="w-24"
        />
        <Button type="submit" disabled={!enabled || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </form>

      {!enabled && (
        <p className="text-sm text-muted-foreground">
          Daily target can only be changed on Mondays
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {saveSuccess && (
        <p className="text-sm text-green-600" role="status">
          Target saved successfully!
        </p>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm high target</DialogTitle>
            <DialogDescription>
              You&apos;ve set a daily target of {inputValue} ayahs. That&apos;s
              quite ambitious! Are you sure you want to save this?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
