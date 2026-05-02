"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DailyLog } from "@/lib/types";

const QUALITY_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Okay",
  4: "Good",
  5: "Great",
};

export default function SleepWidget() {
  const [hours, setHours] = useState("");
  const [quality, setQuality] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/daily-log")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const log = json.data as DailyLog;
          setHours(log.sleep_hours != null ? String(log.sleep_hours) : "");
          setQuality(log.sleep_quality ?? 0);
        }
      })
      .catch(() => toast.error("Failed to load sleep data"))
      .finally(() => setLoading(false));
  }, []);

  async function patch(
    body: Partial<Pick<DailyLog, "sleep_hours" | "sleep_quality">>
  ) {
    setSaving(true);
    try {
      const res = await fetch("/api/daily-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      window.dispatchEvent(new CustomEvent("momentum:refresh"));
    } catch {
      toast.error("Failed to save sleep data");
    } finally {
      setSaving(false);
    }
  }

  function handleHoursBlur() {
    const num = parseFloat(hours);
    if (!isNaN(num) && num >= 0 && num <= 24) {
      const rounded = Math.round(num * 10) / 10;
      setHours(String(rounded));
      patch({ sleep_hours: rounded });
    }
  }

  function handleQualityClick(val: number) {
    setQuality(val);
    patch({ sleep_quality: val });
  }

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5 widget-card card-glow-violet">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-3.5 bg-violet-500 rounded-full" aria-hidden />
          <p className="text-xs text-violet-400/80 uppercase tracking-widest font-semibold">
            Sleep
          </p>
        </div>
        {saving && <span className="text-xs text-gray-600">saving…</span>}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Hours slept</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                onBlur={handleHoursBlur}
                placeholder="7.5"
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25 tabular-nums"
              />
              <span className="text-xs text-gray-500">hrs</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Quality{quality > 0 ? ` — ${QUALITY_LABELS[quality]}` : ""}
            </label>
            <div className="flex gap-2.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => handleQualityClick(v)}
                  aria-label={`Quality ${v} — ${QUALITY_LABELS[v]}`}
                  className={`w-7 h-7 rounded-full transition-all duration-200 ${
                    v <= quality
                      ? "scale-110 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                      : "bg-gray-700/50 hover:bg-gray-600/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
