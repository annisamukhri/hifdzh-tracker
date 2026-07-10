# Hifdh Tracker

A personal Quran memorization tracker built to help you stay consistent with your daily hifdh goals. Track your progress ayah by ayah, maintain streaks, and get a clear picture of how your memorization is going week by week.

## Features

- **Daily Target** — Set a memorization goal (1, 2, or 5 ayahs/day) based on your preferred schedule. Target changes are gated to Mondays to encourage intentional weekly planning.
- **Session Tracking** — Log memorization sessions using a physical or digital Quran, with per-surah progress tracking.
- **Dashboard** — Weekly progress chart, monthly radial heatmap, and surah-level breakdown by Juz.
- **Streak System** — Stay motivated with current and longest streak tracking.
- **AI Chatbot** — Ask questions about your memorization journey powered by Gemini/Groq.
- **Google & Email Auth** — Sign in with Google or email/password via Supabase Auth.
- **Profile** — Edit your name, age, and gender. Delete account when needed.
- **Dark Mode** — Toggle between light and dark theme from the home screen.

## Tech Stack

- [Next.js 15](https://nextjs.org) — App Router
- [Supabase](https://supabase.com) — Auth, database, and row-level security
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) — UI components
- [Recharts](https://recharts.org) — Weekly progress charts
- [next-themes](https://github.com/pacocoursey/next-themes) — Dark mode

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Copy `.env.example` to `.env` and fill in your Supabase and API keys:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```
