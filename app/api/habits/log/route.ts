import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";

// Toggle a habit's completion for a given day
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      habit_id,
      completed,
      date: bodyDate,
    } = (await req.json()) as {
      habit_id: number;
      completed: boolean;
      date?: string;
    };

    if (!habit_id) return err("habit_id is required");
    if (typeof completed !== "boolean") return err("completed must be a boolean");

    const date = bodyDate ?? getTodayIST();
    const logged_at = completed ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("habit_logs")
      .upsert(
        { habit_id, date, completed, logged_at },
        { onConflict: "habit_id,date" }
      )
      .select()
      .single();

    if (error) throw error;
    return ok(data);
  } catch {
    return err("Failed to log habit", 500);
  }
}
