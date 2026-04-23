-- Hifdzh Tracker Database Schema
-- This script creates all necessary tables for the Quran memorization tracking app

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  target_type text check (target_type in ('one_ayah', 'morning_night', 'five_prayers')),
  onboarding_completed boolean default false,
  current_streak integer default 0,
  longest_streak integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- 2. Sessions table (memorization sessions)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('physical', 'digital')),
  surah_number integer not null,
  surah_name text not null,
  start_ayah integer not null,
  end_ayah integer not null,
  duration_seconds integer not null default 0,
  completed_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;

create policy "sessions_select_own" on public.sessions for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions for update using (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions for delete using (auth.uid() = user_id);

-- 3. Ayah Progress table (individual ayah tracking)
create table if not exists public.ayah_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  surah_number integer not null,
  ayah_number integer not null,
  status text not null check (status in ('memorized', 'reviewing', 'learning')),
  memorized_at timestamptz default now(),
  last_reviewed_at timestamptz,
  review_count integer default 1,
  created_at timestamptz default now(),
  unique(user_id, surah_number, ayah_number)
);

alter table public.ayah_progress enable row level security;

create policy "ayah_progress_select_own" on public.ayah_progress for select using (auth.uid() = user_id);
create policy "ayah_progress_insert_own" on public.ayah_progress for insert with check (auth.uid() = user_id);
create policy "ayah_progress_update_own" on public.ayah_progress for update using (auth.uid() = user_id);
create policy "ayah_progress_delete_own" on public.ayah_progress for delete using (auth.uid() = user_id);

-- 4. Weekly Summaries table
create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  total_ayahs integer default 0,
  total_sessions integer default 0,
  total_duration_seconds integer default 0,
  streak_maintained boolean default false,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table public.weekly_summaries enable row level security;

create policy "weekly_summaries_select_own" on public.weekly_summaries for select using (auth.uid() = user_id);
create policy "weekly_summaries_insert_own" on public.weekly_summaries for insert with check (auth.uid() = user_id);
create policy "weekly_summaries_update_own" on public.weekly_summaries for update using (auth.uid() = user_id);
create policy "weekly_summaries_delete_own" on public.weekly_summaries for delete using (auth.uid() = user_id);

-- 5. Auto-create profile trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 6. Updated_at trigger function
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

-- 7. Create indexes for performance
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_completed_at on public.sessions(completed_at);
create index if not exists idx_ayah_progress_user_id on public.ayah_progress(user_id);
create index if not exists idx_ayah_progress_surah on public.ayah_progress(surah_number, ayah_number);
create index if not exists idx_weekly_summaries_user_week on public.weekly_summaries(user_id, week_start);
