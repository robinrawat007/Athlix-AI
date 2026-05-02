import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";
import type { WorkTask } from "@/lib/types";

function getDate(req: NextRequest): string {
  return req.nextUrl.searchParams.get("date") ?? getTodayIST();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("work_tasks")
      .select("*")
      .eq("date", getDate(req))
      .order("sort_order");

    if (error) throw error;
    return ok(data ?? []);
  } catch {
    return err("Failed to fetch tasks", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { title, date: bodyDate } = (await req.json()) as {
      title: string;
      date?: string;
    };

    if (!title?.trim()) return err("title is required");

    const date = bodyDate ?? getTodayIST();

    // Place new task after the last existing one
    const { data: existing } = await supabase
      .from("work_tasks")
      .select("sort_order")
      .eq("date", date)
      .order("sort_order", { ascending: false })
      .limit(1);

    const maxOrder = (existing as Pick<WorkTask, "sort_order">[] | null)?.[0]?.sort_order ?? -1;

    const { data, error } = await supabase
      .from("work_tasks")
      .insert({ date, title: title.trim(), sort_order: maxOrder + 1 })
      .select()
      .single();

    if (error) throw error;
    return ok(data);
  } catch {
    return err("Failed to create task", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { id, done, sort_order, title } = (await req.json()) as {
      id: number;
      done?: boolean;
      sort_order?: number;
      title?: string;
    };

    if (!id) return err("id is required");

    const update: Record<string, unknown> = {};
    if (typeof done === "boolean") update.done = done;
    if (typeof sort_order === "number") update.sort_order = sort_order;
    if (typeof title === "string" && title.trim()) update.title = title.trim();

    if (Object.keys(update).length === 0) return err("nothing to update");

    const { data, error } = await supabase
      .from("work_tasks")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return ok(data);
  } catch {
    return err("Failed to update task", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return err("id is required");

    const { error } = await supabase.from("work_tasks").delete().eq("id", id);
    if (error) throw error;
    return ok({ deleted: true });
  } catch {
    return err("Failed to delete task", 500);
  }
}
