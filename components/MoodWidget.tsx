"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DailyLog } from "@/lib/types";

const MOOD_META: Record<
  number,
  { label: string; bg: string; glow: string }
> = {
  1: { label: "Rough", bg: "bg-red-500",     glow: "shadow-[0_0_14px_rgba(239,68,68,0.55)]"   },
  2: { label: "Low",   bg: "bg-orange-400",  glow: "shadow-[0_0_14px_rgba(251,146,60,0.55)]"  },
  3: { label: "Okay",  bg: "bg-yellow-400",  glow: "shadow-[0_0_14px_rgba(250,204,21,0.55)]"  },
  4: { label: "Good",  bg: "bg-lime-400",    glow: "shadow-[0_0_14px_rgba(163,230,53,0.55)]"  },
  5: { label: "Great", bg: "bg-emerald-400", glow: "shadow-[0_0_14px_rgba(52,211,153,0.55)]"  },
};

export default function MoodWidget() {
  const [mood, setMood] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/daily-log")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const log = json.data as DailyLog;
          setMood(log.mood ?? 0);
          setNote(log.mood_note ?? "");
        }
      })
      .catch(() => toast.error("Failed to load mood data"))
      .finally(() => setLoading(false));
  }, []);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/daily-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch {
      toast.error("Failed to save mood data");
    } finally {
      setSaving(false);
    }
  }

  function handleMoodClick(val: number) {
    setMood(val);
    patch({ mood: val }).then(() =>
      window.dispatchEvent(new CustomEvent("momentum:refresh"))
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5 widget-card card-glow-pink">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-3.5 bg-pink-500 rounded-full" aria-hidden />
          <p className="text-xs text-pink-400/80 uppercase tracking-widest font-semibold">
            Mood
          </p>
        </div>
        {saving && <span className="text-xs text-gray-600">saving…</span>}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              {mood > 0 ? MOOD_META[mood].label : "How are you feeling?"}
            </label>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => handleMoodClick(v)}
                  aria-label={`Mood ${v} — ${MOOD_META[v].label}`}
                  className={`w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 ${
                    mood === v
                      ? `${MOOD_META[v].bg} ${MOOD_META[v].glow} text-white scale-110`
                      : "bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => patch({ mood_note: note })}
              placeholder="Optional note…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/25"
            />
          </div>
        </div>
      )}
    </div>
  );
}
