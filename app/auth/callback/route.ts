import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    // Check if user has completed onboarding
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        // Jika profile belum ada, mungkin user baru - redirect ke onboarding
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      if (!profile?.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
    
    // Redirect tanpa code di URL
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Jika tidak ada code, redirect ke login
  return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
}