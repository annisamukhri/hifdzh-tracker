'use client'

import { Button } from '@/components/ui/button'

export type DhikrType = 'morning' | 'evening' | 'istighfar'
type Step = 'initial' | 'confirm'

interface DhikrDialogProps {
  type: DhikrType
  step: Step
  onYes: () => void
  onNo: () => void
}

export function DhikrDialog({ type, step, onYes, onNo }: DhikrDialogProps) {
  if (type === 'istighfar') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
        <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-5">
          <div className="text-center space-y-2">
            <p className="text-3xl">🤲</p>
            <p className="font-semibold text-base">Seek Forgiveness First</p>
            <p className="text-sm text-muted-foreground">
              Please take a moment to seek forgiveness (Istighfar) before starting your session.
            </p>
            <p className="text-lg font-arabic text-right leading-loose" dir="rtl">
              أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ
            </p>
          </div>
          <Button className="w-full" onClick={onYes}>Start Now</Button>
        </div>
      </div>
    )
  }

  const label = type === 'morning' ? 'morning' : 'evening'
  const emoji = type === 'morning' ? '🌅' : '🌙'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-5">
        <div className="text-center space-y-2">
          <p className="text-3xl">{emoji}</p>
          <p className="font-semibold text-base">
            {step === 'initial'
              ? `Have you performed your ${label} dhikr?`
              : `Do you want to perform your ${label} dhikr first?`}
          </p>
          {step === 'confirm' && (
            <p className="text-sm text-muted-foreground">
              Taking a moment for dhikr before your session is a beautiful habit.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onNo}>No</Button>
          <Button className="flex-1" onClick={onYes}>Yes</Button>
        </div>
      </div>
    </div>
  )
}

export function getDhikrType(): DhikrType {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes >= 5 * 60 + 30 && minutes <= 8 * 60 + 30) return 'morning'
  if (minutes >= 16 * 60 + 30 && minutes <= 19 * 60 + 30) return 'evening'
  return 'istighfar'
}
