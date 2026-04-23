import { createClient } from '@/lib/supabase/server'
import { ProfileContent } from './profile-content'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <ProfileContent
      profile={profile}
      email={user?.email || ''}
    />
  )
}
