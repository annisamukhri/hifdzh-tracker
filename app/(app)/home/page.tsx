import { createClient } from '@/lib/supabase/server'
import { HomeContent } from './home-content'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: ayahProgress }, { data: recentSessions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('ayah_progress').select('surah_number, ayah_number, status').eq('user_id', user!.id).eq('status', 'memorized'),
    supabase.from('sessions').select('*').eq('user_id', user!.id).order('completed_at', { ascending: false }).limit(3),
  ])

  return (
    <HomeContent
      profile={profile}
      ayahProgress={ayahProgress || []}
      recentSessions={recentSessions || []}
    />
  )
}
