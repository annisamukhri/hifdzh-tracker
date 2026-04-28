'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Sun, Moon, Clock, Loader2, Check } from 'lucide-react'
import type { TargetType } from '@/lib/types'

const TARGET_OPTIONS: { type: TargetType; title: string; description: string; icon: React.ReactNode; dailyTarget: number }[] = [
  {
    type: 'one_ayah',
    title: 'One Ayah per Day',
    description: 'One ayah memorized per day at your own pace',
    icon: <BookOpen className="w-6 h-6" />,
    dailyTarget: 1,
  },
  {
    type: 'morning_night',
    title: 'Morning & Night',
    description: 'One ayah memorized in each morning and night',
    icon: <div className="flex -space-x-1"><Sun className="w-5 h-5" /><Moon className="w-5 h-5" /></div>,
    dailyTarget: 2,
  },
  {
    type: 'five_prayers',
    title: 'Five Daily Prayers',
    description: 'One ayah memorized after each of the 5 daily prayers',
    icon: <Clock className="w-6 h-6" />,
    dailyTarget: 5,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedTarget, setSelectedTarget] = useState<TargetType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleContinue() {
    if (!selectedTarget) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const option = TARGET_OPTIONS.find(o => o.type === selectedTarget)!
    const dailyTarget = option.dailyTarget

    // Monday of the current week
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMonday)
    const mondayStr = monday.toISOString().split('T')[0]

    const { error } = await supabase
      .from('profiles')
      .update({
        target_type: selectedTarget,
        daily_target: dailyTarget,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Deactivate previous targets and insert new one
    await supabase.from('targets').update({ is_active: false }).eq('user_id', user.id).eq('type', 'daily')
    await supabase.from('targets').insert({
      user_id: user.id,
      type: 'daily',
      target_value: dailyTarget,
      unit: 'ayahs',
      start_date: mondayStr,
      is_active: true,
      label: option.title,
    })

    router.push('/home')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Choose Your Target</h1>
          <p className="text-muted-foreground">
            How would you like to structure your memorization?
          </p>
        </div>

        <div className="space-y-3">
          {TARGET_OPTIONS.map((option) => (
            <Card
              key={option.type}
              className={`cursor-pointer transition-all ${
                selectedTarget === option.type
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-muted-foreground/30'
              }`}
              onClick={() => setSelectedTarget(option.type)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedTarget === option.type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{option.title}</CardTitle>
                  <CardDescription className="text-sm">{option.description}</CardDescription>
                </div>
                {selectedTarget === option.type && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            {error}
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!selectedTarget || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          You can change this later in settings
        </p>
      </div>
    </div>
  )
}
