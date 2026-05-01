# Personal OS Dashboard — CLAUDE.md

Read this entire file before doing anything. This is the single source of truth for the project.

---

## What this is

A personal life dashboard built for one person — the owner. Not a product, not a SaaS. A private daily tool that tracks sleep, mood, water, workouts, habits, nutrition, and work schedule. Also includes a daily AI-curated news feed and an AI chat assistant with full context of the user's day.

There is no multi-user support. There is no onboarding. There are no settings pages beyond what the owner needs.

---

## Core principles

- Everything on one page. No deep navigation.
- Every input auto-saves. No save buttons anywhere.
- Minimum friction to log anything. Nothing should take more than 30 seconds.
- Dark theme. This is a personal power tool, not a consumer app.
- Mobile-first layout — single column on small screens, grid on desktop.
- The backend API must be mobile-ready from day one so a React Native app can consume the same endpoints later with zero backend changes.

---

## Tech stack

- Framework: Next.js 14 with App Router
- Styling: Tailwind CSS
- Language: TypeScript throughout, strict mode, no any types
- Database: Supabase (Postgres)
- AI: Anthropic Claude API
- Automations: n8n (external, connects via webhooks)
- Hosting: Vercel

No substitutions. Use exactly these.

---

## Authentication

No login system. A single middleware password protects the entire app at the edge. API routes are excluded from this check so n8n and the future mobile app can reach them. There is a simple login page that sets a cookie. That is the entire auth story for v1.

---

## Database tables

**daily_logs** — one row per day, upserted. Stores sleep hours, sleep quality (1–5), mood (1–5), mood note, and total water ml for the day. The water total is always recalculated from water entries — never manually set.

**habits** — the user's habit definitions. Set up once. Each has a name, an optional emoji icon, a sort order, and an active flag.

**habit_logs** — one row per habit per day. Records whether the habit was completed and when. Unique constraint on habit + date.

**workout_logs** — individual workout entries. Stores date, type (push/pull/legs/cardio/rest/other), duration in minutes, intensity (1–5), and notes. Multiple entries per day allowed.

**nutrition_logs** — meal entries. Stores date, meal slot (breakfast/lunch/dinner/snack), description as free text, and optional estimated calories.

**water_entries** — individual water log entries. Each has a date, amount in ml (manually entered by the user), and a timestamp. The sum of these for a given day always equals daily_logs.water_ml.

**work_tasks** — today's task list. Each task has a date, title, done flag, and sort order.

**news_cache** — populated by n8n, never by the app itself. Stores fetch date, category (ai/world/india/soccer), and a JSON array of headlines. Each headline has a title, one-sentence summary, URL, and source name.

**chat_history** — all AI chat messages. Each row has a role (user or assistant), content, and timestamp.

---

## Water logging

Water is always entered manually. The user types how many ml they drank. There are also quick-add preset buttons (150ml, 250ml, 330ml, 500ml) that are just shortcuts — they use the same flow as manual entry, not a different mechanism.

Each entry creates a row in water_entries. After every new entry, the day's total is recalculated as the sum of all water_entries for that date and written back to daily_logs.water_ml. The widget shows the running total, a progress bar toward the 2500ml daily target, and a small timestamp history of each entry made today.

---

## Momentum score

A single number from 0 to 100 that represents the user's day. Displayed in the header. Updates live as the user checks things off throughout the day.

Calculated from five inputs: sleep (20 points), habits completion rate (30 points), workout done (20 points), water toward target (15 points), and mood (15 points). It is always computed fresh from live data — never stored in the database.

---

## Habit streaks

Streaks are never stored. They are always calculated by reading backward through habit_logs from today. If there is a gap of more than one day, or a day where the habit was not completed, the streak resets. This keeps streaks accurate even if the user logs late or edits past data.

---

## AI chat

The chat has full context of the user's day on every message. Before calling Claude, the server queries all tables for today and assembles a structured summary — sleep, mood, water, each habit and whether it was done, workouts, and meals. This summary is injected into every request as context.

The tone of the AI should be like a direct, honest coach — not cheerful or generic. It should reference the user's actual data, not give general health advice. Responses should be concise unless the user asks for detail.

Use claude-sonnet-4-6 for chat. Stream the response back.

---

## News feed

The app only reads news from the database. It never fetches news itself.

n8n runs a workflow every morning at 6am IST. It fetches RSS feeds for four categories — AI/tech, world news, India news, and soccer. It uses Claude to summarize the top five headlines per category into one sentence each. It then inserts the results into news_cache via the Supabase REST API.

The dashboard reads from news_cache and displays four columns, one per category, five headlines each. Each headline links to the original source.

Use claude-haiku-4-5-20251001 for news summarization in n8n — it is faster and cheaper for this task.

---

## Weekly report

A single API endpoint aggregates the last 7 days across all tables and returns a structured summary — average sleep, average mood, water target hit rate, habit completion rate per habit, workout count, and momentum score range.

n8n calls this endpoint every Sunday evening, sends the JSON to Claude with a prompt to write a 150-word honest coaching debrief, and emails it to the user. The endpoint can also be called manually from the dashboard.

---

## Timezones

The user is in IST (UTC+5:30). All date calculations, midnight resets, and day boundaries must use IST. There is one utility function for getting today's date in IST that is used everywhere. Never rely on the server's local timezone.

---

## API design

All routes live under /api so the future mobile app can consume them directly. Every response uses the same envelope: success true with a data field, or success false with an error message. All routes accept an optional date query parameter in YYYY-MM-DD format, defaulting to today in IST. No authentication logic inside API routes — that is handled at the middleware level.

---

## Dashboard layout (top to bottom)

1. Header — today's date, a greeting, and the live momentum score
2. Quick vitals — sleep, mood, and water in a three-column row
3. Habits and workout — two columns
4. Nutrition and work schedule — two columns
5. News feed — four columns, one per category, five headlines each
6. AI chat — full width, persistent, scrollable history

---

## Build order

Follow this exactly. Each step must be working before starting the next.

1. Project setup — Next.js, Tailwind, Supabase client, environment variables, middleware password
2. Database — run schema in Supabase, seed a few starter habits
3. All API routes — build these before any UI
4. Dashboard shell — layout and header with a static placeholder score
5. Habit widget
6. Sleep, mood, and water widgets
7. Workout and nutrition widgets
8. Work schedule widget
9. Wire up live momentum score
10. News widget — reads from DB, build n8n workflow separately in parallel
11. AI chat with streaming and day context
12. Polish — loading states, mobile layout, error handling

---

## What not to build yet

- User registration or multi-user support
- Push notifications
- Calorie tracking or macro breakdown
- Charts or historical graphs
- Social features
- Data export
- React Native app — the API will be ready for it, but the app itself is v2

---

## Environment variables needed

- Supabase URL — public
- Supabase anon key — public
- Supabase service role key — server only, never exposed to client
- Anthropic API key — server only
- Dashboard password — server only
