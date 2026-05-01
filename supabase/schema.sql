-- Athlix Personal OS Dashboard — full schema
-- Run this once in your Supabase project's SQL editor

-- ── daily_logs ───────────────────────────────────────────────────────────────
-- One row per calendar day (IST). Upserted on every metric save.
create table if not exists daily_logs (
  id            bigint generated always as identity primary key,
  date          date not null unique,
  sleep_hours   numeric(4, 2),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  mood          smallint check (mood between 1 and 5),
  mood_note     text,
  water_ml      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── habits ───────────────────────────────────────────────────────────────────
-- Habit definitions — set up once, rarely changed.
create table if not exists habits (
  id         bigint generated always as identity primary key,
  name       text not null,
  icon       text,
  sort_order smallint not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── habit_logs ───────────────────────────────────────────────────────────────
-- One row per habit per day.
create table if not exists habit_logs (
  id         bigint generated always as identity primary key,
  habit_id   bigint not null references habits (id) on delete cascade,
  date       date not null,
  completed  boolean not null default false,
  logged_at  timestamptz,
  unique (habit_id, date)
);

-- ── workout_logs ─────────────────────────────────────────────────────────────
-- Multiple entries per day are allowed.
create table if not exists workout_logs (
  id          bigint generated always as identity primary key,
  date        date not null,
  type        text not null check (type in ('push','pull','legs','cardio','rest','other')),
  duration    integer,                     -- minutes
  intensity   smallint check (intensity between 1 and 5),
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── nutrition_logs ───────────────────────────────────────────────────────────
create table if not exists nutrition_logs (
  id          bigint generated always as identity primary key,
  date        date not null,
  meal_slot   text not null check (meal_slot in ('breakfast','lunch','dinner','snack')),
  description text not null,
  calories    integer,
  created_at  timestamptz not null default now()
);

-- ── water_entries ────────────────────────────────────────────────────────────
-- Individual water log entries. daily_logs.water_ml is always the sum of these.
create table if not exists water_entries (
  id         bigint generated always as identity primary key,
  date       date not null,
  amount_ml  integer not null check (amount_ml > 0),
  logged_at  timestamptz not null default now()
);

-- ── work_tasks ───────────────────────────────────────────────────────────────
create table if not exists work_tasks (
  id         bigint generated always as identity primary key,
  date       date not null,
  title      text not null,
  done       boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ── news_cache ───────────────────────────────────────────────────────────────
-- Populated by n8n only. Never written by the app.
create table if not exists news_cache (
  id         bigint generated always as identity primary key,
  fetch_date date not null,
  category   text not null check (category in ('ai','world','india','soccer')),
  headlines  jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (fetch_date, category)
);

-- ── chat_history ─────────────────────────────────────────────────────────────
create table if not exists chat_history (
  id         bigint generated always as identity primary key,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists habit_logs_date_idx     on habit_logs (date);
create index if not exists workout_logs_date_idx   on workout_logs (date);
create index if not exists nutrition_logs_date_idx on nutrition_logs (date);
create index if not exists water_entries_date_idx  on water_entries (date);
create index if not exists work_tasks_date_idx     on work_tasks (date);
create index if not exists news_cache_date_idx     on news_cache (fetch_date);
create index if not exists chat_history_date_idx   on chat_history (created_at);

-- ── Starter habits ───────────────────────────────────────────────────────────
insert into habits (name, icon, sort_order) values
  ('Morning walk',  '🚶', 1),
  ('Read',          '📖', 2),
  ('No junk food',  '🥗', 3),
  ('Meditate',      '🧘', 4),
  ('Cold shower',   '🚿', 5)
on conflict do nothing;
