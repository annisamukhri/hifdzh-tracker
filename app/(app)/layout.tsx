import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { headers } from 'next/headers'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 1. Identify current path via injected header
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isSessionPage = pathname.includes('/session/')
  const isOnboardingPage = pathname === '/onboarding'

  // 2. Check onboarding (Skip if already on onboarding to avoid infinite loops)
  if (!isOnboardingPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (!profile?.onboarding_completed) {
      redirect('/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-24">{children}</main>
      <BottomNav />
    </div>
  )
}