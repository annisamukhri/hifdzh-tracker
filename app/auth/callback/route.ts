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

    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // SMART ROUTING: Cek apakah profile sudah ada
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      // Jika profile tidak ada atau error, user baru → onboarding
      if (profileError || !profile) {
        console.log('New user detected, redirecting to onboarding')
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Jika onboarding belum selesai → onboarding
      if (!profile.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Jika sudah complete → ikuti next parameter atau default /home
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    // Fallback ke next parameter
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Tidak ada code
  return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
}