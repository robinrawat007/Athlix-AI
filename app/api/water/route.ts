import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";
import type { WaterEntry } from "@/lib/types";

function getDate(req: NextRequest): string {
  return req.nextUrl.searchParams.get("date") ?? getTodayIST();
}

async function recalculateAndPersist(
  supabase: ReturnType<typeof createServerClient>,
  date: string
): Promise<number> {
  const { data, error } = await supabase
    .from("water_entries")
    .select("amount_ml")
    .eq("date", date);

  if (error) throw error;

  const total = ((data ?? []) as Pick<WaterEntry, "amount_ml">[]).reduce(
    (sum, e) => sum + e.amount_ml,
    0
  );

  // Upsert only water_ml so sleep/mood fields are never clobbered
  const { error: upsertError } = await supabase
    .from("daily_logs")
    .upsert(
      { date, water_ml: total, updated_at: new Date().toISOString() },
      { onConflict: "date" }
    );

  if (upsertError) throw upsertError;
  return total;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const date = getDate(req);

    const { data, error } = await supabase
      .from("water_entries")
      .select("*")
      .eq("date", date)
      .order("logged_at");

    if (error) throw error;

    const entries = (data ?? []) as WaterEntry[];
    const total_ml = entries.reduce((sum, e) => sum + e.amount_ml, 0);

    return ok({ entries, total_ml });
  } catch {
    return err("Failed to fetch water entries", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { amount_ml, date: bodyDate } = (await req.json()) as {
      amount_ml: number;
      date?: string;
    };

    if (!amount_ml || amount_ml <= 0) {
      return err("amount_ml must be a positive integer");
    }

    const date = bodyDate ?? getTodayIST();

    const { data, error } = await supabase
      .from("water_entries")
      .insert({ date, amount_ml: Math.round(amount_ml), logged_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    const total_ml = await recalculateAndPersist(supabase, date);

    return ok({ entry: data as WaterEntry, total_ml });
  } catch {
    return err("Failed to log water", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return err("id is required");

    // Fetch the entry's date before deleting so we can recalculate
    const { data: entry, error: fetchError } = await supabase
      .from("water_entries")
      .select("date")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("water_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;

    const date = (entry as Pick<WaterEntry, "date">).date;
    const total_ml = await recalculateAndPersist(supabase, date);

    return ok({ deleted: true, total_ml });
  } catch {
    return err("Failed to delete water entry", 500);
  }
}
