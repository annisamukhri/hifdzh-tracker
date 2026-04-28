import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, Target, Flame, BarChart3 } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Check if onboarding is completed
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()
    
    if (profile?.onboarding_completed) {
      redirect('/home')
    } else {
      redirect('/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold text-lg">Hifdh</span>
        </div>
        <Link href="/auth/login">
          <Button variant="outline" size="sm">Sign In</Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-balance">
              Your Quran Memorization Companion
            </h1>
            <p className="text-muted-foreground text-lg text-pretty">
              Track your hifdzh progress, build consistent habits, and achieve your memorization goals
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-6">
            <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl border">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium">Daily Goals</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl border">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium">Streaks</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl border">
              <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-secondary" />
              </div>
              <span className="text-sm font-medium">Progress</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/auth/sign-up" className="block">
              <Button size="lg" className="w-full text-base">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login" className="block">
              <Button variant="ghost" size="lg" className="w-full text-base">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p className="text-pretty">
          {"\"And We have certainly made the Quran easy for remembrance\""}
        </p>
        <p className="mt-1 font-medium">Al-Qamar 54:17</p>
      </footer>
    </div>
  )
}
