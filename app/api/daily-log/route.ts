import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";

function getDate(req: NextRequest): string {
  return req.nextUrl.searchParams.get("date") ?? getTodayIST();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const date = getDate(req);

    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("date", date)
      .single();

    // PGRST116 = no rows found — not an error for this route
    if (error && error.code !== "PGRST116") throw error;
    return ok(data ?? null);
  } catch {
    return err("Failed to fetch daily log", 500);
  }
}

// Accepts: sleep_hours, sleep_quality, mood, mood_note
// water_ml is never set here — it is always derived from water_entries
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const date = getDate(req);
    const body = (await req.json()) as Record<string, unknown>;

    const allowed = ["sleep_hours", "sleep_quality", "mood", "mood_note"] as const;
    const update: Record<string, unknown> = {
      date,
      updated_at: new Date().toISOString(),
    };
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .upsert(update, { onConflict: "date" })
      .select()
      .single();

    if (error) throw error;
    return ok(data);
  } catch {
    return err("Failed to update daily log", 500);
  }
}
