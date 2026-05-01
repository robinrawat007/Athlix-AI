import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST, getDateIST } from "@/lib/date";
import { ok, err } from "@/lib/api";
import { computeMomentum } from "@/lib/momentum";
import type { DailyLog, Habit, HabitLog, WorkoutLog, WaterEntry } from "@/lib/types";

function buildLast7Dates(): string[] {
  const now = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(getDateIST(d));
  }
  return dates;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const dates = buildLast7Dates();
    const from = dates[0];
    const to = dates[6];

    const [
      { data: dailyLogs, error: dlErr },
      { data: habits, error: habitsErr },
      { data: habitLogs, error: hlErr },
      { data: workouts, error: wkErr },
      { data: waterEntries, error: weErr },
    ] = await Promise.all([
      supabase.from("daily_logs").select("*").gte("date", from).lte("date", to),
      supabase.from("habits").select("id, name").eq("active", true),
      supabase.from("habit_logs").select("*").gte("date", from).lte("date", to),
      supabase
        .from("workout_logs")
        .select("date, type")
        .gte("date", from)
        .lte("date", to),
      supabase
        .from("water_entries")
        .select("date, amount_ml")
        .gte("date", from)
        .lte("date", to),
    ]);

    if (dlErr) throw dlErr;
    if (habitsErr) throw habitsErr;
    if (hlErr) throw hlErr;
    if (wkErr) throw wkErr;
    if (weErr) throw weErr;

    const logs = (dailyLogs ?? []) as DailyLog[];
    const allHabits = (habits ?? []) as Pick<Habit, "id" | "name">[];
    const allHabitLogs = (habitLogs ?? []) as HabitLog[];
    const allWorkouts = (workouts ?? []) as Pick<WorkoutLog, "date" | "type">[];
    const allWater = (waterEntries ?? []) as Pick<WaterEntry, "date" | "amount_ml">[];

    // ── Per-day momentum ──────────────────────────────────────────────────────
    const momentumByDay = dates.map((date) => {
      const log = logs.find((l) => l.date === date) ?? null;
      const dayWater = allWater
        .filter((w) => w.date === date)
        .reduce((sum, w) => sum + w.amount_ml, 0);
      const dayHabitLogs = allHabitLogs.filter((l) => l.date === date);
      const dayWorkouts = allWorkouts.filter((w) => w.date === date);

      const score = computeMomentum({
        sleepHours: log?.sleep_hours ?? null,
        habitsTotal: allHabits.length,
        habitsCompleted: dayHabitLogs.filter((l) => l.completed).length,
        workoutLogged: dayWorkouts.length > 0,
        waterMl: dayWater,
        mood: log?.mood ?? null,
      }).total;

      return { date, score };
    });

    // ── Habit completion rates ────────────────────────────────────────────────
    const habitStats = allHabits.map((h) => {
      const daysCompleted = dates.filter((date) =>
        allHabitLogs.some(
          (l) => l.habit_id === h.id && l.date === date && l.completed
        )
      ).length;
      return {
        habit_id: h.id,
        name: h.name,
        days_completed: daysCompleted,
        completion_rate: Math.round((daysCompleted / 7) * 100),
      };
    });

    // ── Water target hit rate ─────────────────────────────────────────────────
    const waterHitDays = dates.filter((date) => {
      const total = allWater
        .filter((w) => w.date === date)
        .reduce((sum, w) => sum + w.amount_ml, 0);
      return total >= 2500;
    }).length;

    // ── Averages ─────────────────────────────────────────────────────────────
    const logsWithSleep = logs.filter((l) => l.sleep_hours !== null);
    const logsWithMood = logs.filter((l) => l.mood !== null);

    const avgSleep =
      logsWithSleep.length > 0
        ? Math.round(
            (logsWithSleep.reduce((sum, l) => sum + (l.sleep_hours as number), 0) /
              logsWithSleep.length) *
              10
          ) / 10
        : null;

    const avgMood =
      logsWithMood.length > 0
        ? Math.round(
            (logsWithMood.reduce((sum, l) => sum + (l.mood as number), 0) /
              logsWithMood.length) *
              10
          ) / 10
        : null;

    // ── Workout count (non-rest sessions) ────────────────────────────────────
    const workoutCount = allWorkouts.filter((w) => w.type !== "rest").length;

    const scores = momentumByDay.map((d) => d.score);

    return ok({
      period: { from, to },
      average_sleep_hours: avgSleep,
      average_mood: avgMood,
      water_target_hit_days: waterHitDays,
      water_target_hit_rate: Math.round((waterHitDays / 7) * 100),
      workout_count: workoutCount,
      habit_stats: habitStats,
      momentum_scores: momentumByDay,
      momentum_range: {
        min: scores.length > 0 ? Math.min(...scores) : 0,
        max: scores.length > 0 ? Math.max(...scores) : 0,
      },
    });
  } catch {
    return err("Failed to generate weekly report", 500);
  }
}
