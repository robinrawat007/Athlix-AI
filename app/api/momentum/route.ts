import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";
import { computeMomentum } from "@/lib/momentum";
import type { DailyLog, HabitLog, WaterEntry } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const date = req.nextUrl.searchParams.get("date") ?? getTodayIST();

    const [
      { data: dailyLog },
      { data: habits },
      { data: habitLogs },
      { data: workouts },
      { data: waterEntries },
    ] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("sleep_hours, mood, water_ml")
        .eq("date", date)
        .single(),
      supabase.from("habits").select("id").eq("active", true),
      supabase.from("habit_logs").select("completed").eq("date", date),
      supabase.from("workout_logs").select("id").eq("date", date).limit(1),
      supabase.from("water_entries").select("amount_ml").eq("date", date),
    ]);

    const log = dailyLog as Pick<DailyLog, "sleep_hours" | "mood" | "water_ml"> | null;
    const waterMl = ((waterEntries ?? []) as Pick<WaterEntry, "amount_ml">[]).reduce(
      (sum, e) => sum + e.amount_ml,
      0
    );

    const breakdown = computeMomentum({
      sleepHours: log?.sleep_hours ?? null,
      habitsTotal: (habits ?? []).length,
      habitsCompleted: ((habitLogs ?? []) as Pick<HabitLog, "completed">[]).filter(
        (l) => l.completed
      ).length,
      workoutLogged: (workouts ?? []).length > 0,
      waterMl,
      mood: log?.mood ?? null,
    });

    return ok({ date, ...breakdown });
  } catch {
    return err("Failed to compute momentum score", 500);
  }
}
