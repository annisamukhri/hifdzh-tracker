-- Add memorized_count to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS memorized_count INTEGER NOT NULL DEFAULT 0;

-- Surah stats: tracks total sessions and memorized ayahs per surah per user
CREATE TABLE IF NOT EXISTS surah_stats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_number     INTEGER NOT NULL CHECK (surah_number BETWEEN 1 AND 114),
  surah_name       TEXT NOT NULL,
  total_sessions   INTEGER NOT NULL DEFAULT 0,
  total_memorized  INTEGER NOT NULL DEFAULT 0,
  last_session_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, surah_number)
);

ALTER TABLE surah_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_surah_stats ON surah_stats
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
