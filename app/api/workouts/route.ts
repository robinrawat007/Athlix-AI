import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";

const VALID_TYPES = ["push", "pull", "legs", "cardio", "rest", "other"] as const;

function getDate(req: NextRequest): string {
  return req.nextUrl.searchParams.get("date") ?? getTodayIST();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("date", getDate(req))
      .order("created_at");

    if (error) throw error;
    return ok(data ?? []);
  } catch {
    return err("Failed to fetch workouts", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      type,
      duration,
      intensity,
      notes,
      date: bodyDate,
    } = (await req.json()) as {
      type: string;
      duration?: number;
      intensity?: number;
      notes?: string;
      date?: string;
    };

    if (!type || !(VALID_TYPES as readonly string[]).includes(type)) {
      return err(`type must be one of: ${VALID_TYPES.join(", ")}`);
    }

    const { data, error } = await supabase
      .from("workout_logs")
      .insert({
        date: bodyDate ?? getTodayIST(),
        type,
        duration: duration ?? null,
        intensity: intensity ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return ok(data);
  } catch {
    return err("Failed to log workout", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return err("id is required");

    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return ok({ deleted: true });
  } catch {
    return err("Failed to delete workout", 500);
  }
}
