import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";
import type { Habit, HabitLog, HabitWithLog } from "@/lib/types";

function getDate(req: NextRequest): string {
  return req.nextUrl.searchParams.get("date") ?? getTodayIST();
}

// Returns all active habits merged with today's completion status
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const date = getDate(req);

    const [{ data: habits, error: habitsError }, { data: logs, error: logsError }] =
      await Promise.all([
        supabase
          .from("habits")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
        supabase.from("habit_logs").select("*").eq("date", date),
      ]);

    if (habitsError) throw habitsError;
    if (logsError) throw logsError;

    const logMap = new Map(
      ((logs ?? []) as HabitLog[]).map((l) => [l.habit_id, l])
    );

    const result: HabitWithLog[] = ((habits ?? []) as Habit[]).map((h) => ({
      ...h,
      completed: logMap.get(h.id)?.completed ?? false,
      logged_at: logMap.get(h.id)?.logged_at ?? null,
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
