// Hifdzh Tracker Types

export type TargetType = 'one_ayah' | 'morning_night' | 'five_prayers'
export type SessionMode = 'physical' | 'digital'
export type AyahStatus = 'memorized' | 'reviewing' | 'learning'

export interface Profile {
  id: string
  full_name: string | null
  target_type: TargetType | null
  daily_target: number | null
  onboarding_completed: boolean
  current_streak: number
  longest_streak: number
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  mode: SessionMode
  surah_number: number
  surah_name: string
  start_ayah: number
  end_ayah: number
  memorized_count: number
  duration_seconds: number
  completed_at: string
  created_at: string
}

export interface SurahStats {
  id: string
  user_id: string
  surah_number: number
  surah_name: string
  total_sessions: number
  total_memorized: number
  last_session_at: string | null
  created_at: string
  updated_at: string
}

export interface AyahProgress {
  id: string
  user_id: string
  session_id: string | null
  surah_number: number
  ayah_number: number
  status: AyahStatus
  memorized_at: string
  last_reviewed_at: string | null
  review_count: number
  created_at: string
}

export interface WeeklySummary {
  id: string
  user_id: string
  week_start: string
  week_end: string
  total_ayahs: number
  total_sessions: number
  total_duration_seconds: number
  streak_maintained: boolean
  created_at: string
}

// Quran data types
export interface Surah {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  revelationType: 'Meccan' | 'Medinan'
}

export interface Ayah {
  number: number
  text: string
  numberInSurah: number
  juz: number
  page: number
  hizbQuarter: number
}

export interface Word {
  id: number
  position: number
  text: string
  translation: string
  transliteration: string
}

// Stats
export interface UserStats {
  totalAyahs: number
  totalSurahs: number
  totalJuz: number
  currentStreak: number
  longestStreak: number
  totalSessions: number
  totalDurationMinutes: number
}

// Chatbot types

export interface Message {
  id: string          // crypto.randomUUID()
  role: 'user' | 'bot'
  text: string
  timestamp: number   // Date.now()
}

export interface ChatSession {
  id: string          // crypto.randomUUID()
  createdAt: number   // Date.now()
  messages: Message[]
}
