import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: sessions }, { data: ayahProgress }, { data: surahStats }, { data: targets }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('sessions').select('*').eq('user_id', user!.id).order('completed_at', { ascending: false }),
    supabase.from('ayah_progress').select('*').eq('user_id', user!.id),
    supabase.from('surah_stats').select('*').eq('user_id', user!.id).order('total_sessions', { ascending: false }),
    supabase.from('targets').select('*').eq('user_id', user!.id).eq('type', 'daily').order('start_date', { ascending: false }),
  ])

  return (
    <DashboardContent
      profile={profile}
      sessions={sessions || []}
      ayahProgress={ayahProgress || []}
      surahStats={surahStats || []}
      targets={targets || []}
    />
  )
}
