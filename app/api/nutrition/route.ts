import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";

const VALID_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

function getDate(req: NextRequest): string {
  return req.nextUrl.searchParams.get("date") ?? getTodayIST();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("date", getDate(req))
      .order("created_at");

    if (error) throw error;
    return ok(data ?? []);
  } catch {
    return err("Failed to fetch nutrition logs", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      meal_slot,
      description,
      calories,
      date: bodyDate,
    } = (await req.json()) as {
      meal_slot: string;
      description: string;
      calories?: number;
      date?: string;
    };

    if (!meal_slot || !(VALID_SLOTS as readonly string[]).includes(meal_slot)) {
      return err(`meal_slot must be one of: ${VALID_SLOTS.join(", ")}`);
    }
    if (!description?.trim()) return err("description is required");

    const { data, error } = await supabase
      .from("nutrition_logs")
      .insert({
        date: bodyDate ?? getTodayIST(),
        meal_slot,
        description: description.trim(),
        calories: calories ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return ok(data);
  } catch {
    return err("Failed to log meal", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return err("id is required");

    const { error } = await supabase
      .from("nutrition_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return ok({ deleted: true });
  } catch {
    return err("Failed to delete meal", 500);
  }
}
