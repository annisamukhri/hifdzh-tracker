'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  User, 
  Mail, 
  Target, 
  BookOpen, 
  Calendar, 
  LogOut, 
  ChevronRight,
  Sun,
  Moon,
  Clock,
  Loader2
} from 'lucide-react'
import type { Profile, TargetType } from '@/lib/types'
import { format } from 'date-fns'

interface ProfileContentProps {
  profile: Profile | null
  email: string
}

const TARGET_LABELS: Record<TargetType, { label: string; icon: React.ReactNode }> = {
  one_ayah: { label: 'One Ayah per Day', icon: <BookOpen className="w-4 h-4" /> },
  morning_night: { label: 'Morning & Night', icon: <><Sun className="w-3 h-3" /><Moon className="w-3 h-3" /></> },
  five_prayers: { label: 'Five Daily Prayers', icon: <Clock className="w-4 h-4" /> },
}

export function ProfileContent({ profile, email }: ProfileContentProps) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const targetInfo = profile?.target_type ? TARGET_LABELS[profile.target_type] : null

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </div>

      {/* User Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {profile?.full_name || 'User'}
              </h2>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Memorization Target</p>
                {targetInfo && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {targetInfo.icon}
                    {targetInfo.label}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.created_at 
                    ? format(new Date(profile.created_at), 'MMMM d, yyyy')
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing out...
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </>
        )}
      </Button>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground">
        Hifdzh Tracker v1.0
      </p>
    </div>
  )
}
