-- ============================================================
-- Hifdh Tracker — Initial Schema
-- ============================================================

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  is_premium    BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auto-create profile on new user sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------
-- memorization_records
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memorization_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id    INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id     INTEGER NOT NULL CHECK (ayah_id >= 1),
  status      TEXT NOT NULL CHECK (status IN ('not_started', 'memorizing', 'memorized')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, surah_id, ayah_id)
);

ALTER TABLE memorization_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON memorization_records
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- sessions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id     INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  start_ayah   INTEGER NOT NULL CHECK (start_ayah >= 1),
  end_ayah     INTEGER NOT NULL CHECK (end_ayah >= 1),
  duration_sec INTEGER NOT NULL CHECK (duration_sec >= 0),
  notes        TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_ayah_range CHECK (end_ayah >= start_ayah)
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON sessions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- session_play_counts
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_play_counts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id    INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id     INTEGER NOT NULL CHECK (ayah_id >= 1),
  play_count  INTEGER NOT NULL DEFAULT 0 CHECK (play_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, surah_id, ayah_id)
);

ALTER TABLE session_play_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON session_play_counts
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- targets
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  unit         TEXT NOT NULL CHECK (unit IN ('ayahs', 'surahs', 'juz', 'minutes')),
  start_date   DATE NOT NULL,
  end_date     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON targets
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- milestones
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('surah', 'juz', 'custom')),
  target_surah   INTEGER CHECK (target_surah BETWEEN 1 AND 114),
  target_juz     INTEGER CHECK (target_juz BETWEEN 1 AND 30),
  target_date    DATE,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON milestones
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- calendar_markers
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_markers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  is_setoran   BOOLEAN NOT NULL DEFAULT FALSE,
  is_murajaah  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE calendar_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON calendar_markers
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- bookmarks
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id    INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id     INTEGER NOT NULL CHECK (ayah_id >= 1),
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, surah_id, ayah_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON bookmarks
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- notes
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id    INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id     INTEGER NOT NULL CHECK (ayah_id >= 1),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON notes
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- tags
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON tags
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- ayah_tags
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ayah_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  surah_id    INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id     INTEGER NOT NULL CHECK (ayah_id >= 1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tag_id, surah_id, ayah_id)
);

ALTER TABLE ayah_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON ayah_tags
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- highlights
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS highlights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id    INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id     INTEGER NOT NULL CHECK (ayah_id >= 1),
  color       TEXT NOT NULL DEFAULT '#FFFF00',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, surah_id, ayah_id)
);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON highlights
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- recordings
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recordings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id        INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id         INTEGER NOT NULL CHECK (ayah_id >= 1),
  storage_path    TEXT NOT NULL,
  duration_sec    INTEGER CHECK (duration_sec >= 0),
  file_size_bytes INTEGER CHECK (file_size_bytes >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON recordings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- self_test_results
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS self_test_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL CHECK (mode IN ('fill_in_the_blank', 'audio_test')),
  surah_id     INTEGER CHECK (surah_id BETWEEN 1 AND 114),
  score        INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  total_ayahs  INTEGER NOT NULL CHECK (total_ayahs > 0),
  correct      INTEGER NOT NULL CHECK (correct >= 0),
  taken_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE self_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON self_test_results
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- review_schedules
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id     INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id      INTEGER NOT NULL CHECK (ayah_id >= 1),
  next_review  DATE NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1 CHECK (interval_days > 0),
  ease_factor  NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  repetitions  INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, surah_id, ayah_id)
);

ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON review_schedules
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- tajwid_quiz_results
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tajwid_quiz_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  surah_id     INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
  ayah_id      INTEGER NOT NULL CHECK (ayah_id >= 1),
  rule_asked   TEXT NOT NULL,
  rule_given   TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL,
  taken_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tajwid_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_data ON tajwid_quiz_results
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
