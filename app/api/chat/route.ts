import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";
import { getTodayIST } from "@/lib/date";
import { ok, err } from "@/lib/api";
import type {
  DailyLog,
  Habit,
  HabitLog,
  WorkoutLog,
  NutritionLog,
  WaterEntry,
  ChatMessage,
} from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Returns paginated chat history
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);

    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return ok((data ?? []) as ChatMessage[]);
  } catch {
    return err("Failed to fetch chat history", 500);
  }
}

async function buildDayContext(date: string): Promise<string> {
  const supabase = createServerClient();

  const [
    { data: dailyLog },
    { data: habits },
    { data: habitLogs },
    { data: workouts },
    { data: meals },
    { data: water },
  ] = await Promise.all([
    supabase.from("daily_logs").select("*").eq("date", date).single(),
    supabase.from("habits").select("*").eq("active", true).order("sort_order"),
    supabase.from("habit_logs").select("*").eq("date", date),
    supabase.from("workout_logs").select("*").eq("date", date).order("created_at"),
    supabase.from("nutrition_logs").select("*").eq("date", date).order("created_at"),
    supabase.from("water_entries").select("amount_ml").eq("date", date),
  ]);

  const log = dailyLog as DailyLog | null;
  const allHabits = (habits ?? []) as Habit[];
  const allHabitLogs = (habitLogs ?? []) as HabitLog[];
  const allWorkouts = (workouts ?? []) as WorkoutLog[];
  const allMeals = (meals ?? []) as NutritionLog[];
  const totalWater = ((water ?? []) as Pick<WaterEntry, "amount_ml">[]).reduce(
    (sum, e) => sum + e.amount_ml,
    0
  );

  const habitLines = allHabits
    .map((h) => {
      const log = allHabitLogs.find((l) => l.habit_id === h.id);
      const done = log?.completed ? "✓" : "✗";
      return `  ${done} ${h.icon ?? ""} ${h.name}`.trim();
    })
    .join("\n");

  const workoutLines =
    allWorkouts.length > 0
      ? allWorkouts
          .map(
            (w) =>
              `  ${w.type}${w.duration ? ` — ${w.duration}min` : ""}${w.intensity ? `, intensity ${w.intensity}/5` : ""}${w.notes ? ` (${w.notes})` : ""}`
          )
          .join("\n")
      : "  none logged";

  const mealLines =
    allMeals.length > 0
      ? allMeals
          .map(
            (m) =>
              `  [${m.meal_slot}] ${m.description}${m.calories ? ` (~${m.calories} kcal)` : ""}`
          )
          .join("\n")
      : "  none logged";

  return `
TODAY'S DATA (${date}, IST):

Sleep: ${log?.sleep_hours != null ? `${log.sleep_hours}h` : "not logged"}${log?.sleep_quality != null ? `, quality ${log.sleep_quality}/5` : ""}
Mood: ${log?.mood != null ? `${log.mood}/5` : "not logged"}${log?.mood_note ? ` — "${log.mood_note}"` : ""}
Water: ${totalWater}ml / 2500ml target (${Math.round((totalWater / 2500) * 100)}%)

Habits:
${habitLines || "  (none set up)"}

Workouts:
${workoutLines}

Meals:
${mealLines}
`.trim();
}

// Streams Claude's response as SSE. Saves both turns to chat_history.
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { message } = (await req.json()) as { message: string };

    if (!message?.trim()) return err("message is required");

    const date = getTodayIST();

    // Save user message
    await supabase
      .from("chat_history")
      .insert({ role: "user", content: message.trim() });

    // Build day context and fetch recent history for continuity
    const [dayContext, { data: recentHistory }] = await Promise.all([
      buildDayContext(date),
      supabase
        .from("chat_history")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(40),
    ]);

    const systemPrompt = `You are a personal AI coach with full context of the user's day. Be direct, honest, and specific — reference their actual numbers. Never give generic health advice. Be concise unless asked for detail. Don't be cheerful or use filler phrases.

${dayContext}`;

    // Build message history for the API (exclude the message we just saved)
    const history = ((recentHistory ?? []) as Pick<ChatMessage, "role" | "content">[]).slice(0, -1);
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message.trim() },
    ];

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: systemPrompt,
            messages,
            stream: true,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
                )
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Persist the full assistant response after stream completes
          await supabase
            .from("chat_history")
            .insert({ role: "assistant", content: fullResponse });
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return err("Failed to process chat message", 500);
  }
}
