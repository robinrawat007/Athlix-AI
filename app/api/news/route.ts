import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";

// Read-only. News is written exclusively by n8n.
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const date = req.nextUrl.searchParams.get("date") ?? getTodayIST();

    const { data, error } = await supabase
      .from("news_cache")
      .select("*")
      .eq("fetch_date", date)
      .order("category");

    if (error) throw error;

    if (data && data.length > 0) {
      return ok(data);
    }

    // No news for today yet — return the most recent available date
    const { data: latest, error: latestError } = await supabase
      .from("news_cache")
      .select("*")
      .order("fetch_date", { ascending: false })
      .order("category")
      .limit(4);

    if (latestError) throw latestError;
    return ok(latest ?? []);
  } catch {
    return err("Failed to fetch news", 500);
  }
}
