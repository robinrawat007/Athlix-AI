"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DailyLog } from "@/lib/types";

const MOOD_META: Record<number, { label: string; active: string }> = {
  1: { label: "Rough", active: "bg-red-500" },
  2: { label: "Low",   active: "bg-orange-500" },
  3: { label: "Okay",  active: "bg-yellow-500" },
  4: { label: "Good",  active: "bg-lime-500" },
  5: { label: "Great", active: "bg-emerald-500" },
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 widget-card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Mood
        </p>
        {saving && <span className="text-xs text-gray-600">saving…</span>}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1–5 selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              {mood > 0 ? MOOD_META[mood].label : "How are you?"}
            </label>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => handleMoodClick(v)}
                  aria-label={`Mood ${v} — ${MOOD_META[v].label}`}
                  className={`w-10 h-10 rounded-full text-sm font-semibold transition-colors ${
                    mood === v
                      ? `${MOOD_META[v].active} text-white`
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => patch({ mood_note: note })}
              placeholder="Optional note…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
