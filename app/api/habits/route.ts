import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";
import type { Habit, HabitLog, HabitWithLog } from "@/lib/types";

function getDate(req: NextRequest): string {
  return req.nextUrl.searchParams.get("date") ?? getTodayIST();
}

function calcStreak(
  habitId: number,
  date: string,
  completedByHabit: Map<number, Set<string>>
): number {
  const dates = completedByHabit.get(habitId) ?? new Set<string>();

  // If today is done, start counting from today; otherwise start from yesterday
  const cursor = new Date(date + "T00:00:00Z");
  if (!dates.has(date)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (true) {
    const d = cursor.toISOString().slice(0, 10);
    if (dates.has(d)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Returns all active habits merged with today's completion status and streak count
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const date = getDate(req);

    const d60 = new Date(date + "T00:00:00Z");
    d60.setUTCDate(d60.getUTCDate() - 60);
    const sixtyDaysAgo = d60.toISOString().slice(0, 10);

    const [
      { data: habits, error: habitsError },
      { data: logs, error: logsError },
      { data: streakLogs },
    ] = await Promise.all([
      supabase.from("habits").select("*").eq("active", true).order("sort_order"),
      supabase.from("habit_logs").select("*").eq("date", date),
      supabase
        .from("habit_logs")
        .select("habit_id, date")
        .eq("completed", true)
        .gte("date", sixtyDaysAgo)
        .lte("date", date),
    ]);

    if (habitsError) throw habitsError;
    if (logsError) throw logsError;

    const logMap = new Map(
      ((logs ?? []) as HabitLog[]).map((l) => [l.habit_id, l])
    );

    const completedByHabit = new Map<number, Set<string>>();
    for (const log of (streakLogs ?? []) as { habit_id: number; date: string }[]) {
      if (!completedByHabit.has(log.habit_id)) {
        completedByHabit.set(log.habit_id, new Set());
      }
      completedByHabit.get(log.habit_id)!.add(log.date);
    }

    const result: HabitWithLog[] = ((habits ?? []) as Habit[]).map((h) => ({
      ...h,
      completed: logMap.get(h.id)?.completed ?? false,
      logged_at: logMap.get(h.id)?.logged_at ?? null,
      streak: calcStreak(h.id, date, completedByHabit),
    }));

    return ok(result);
  } catch {
    return err("Failed to fetch habits", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { name, icon, sort_order } = (await req.json()) as {
      name: string;
      icon?: string;
      sort_order?: number;
    };

    if (!name?.trim()) return err("name is required");

    const { data, error } = await supabase
      .from("habits")
      .insert({ name: name.trim(), icon: icon ?? null, sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) throw error;
    return ok(data);
  } catch {
    return err("Failed to create habit", 500);
  }
}
