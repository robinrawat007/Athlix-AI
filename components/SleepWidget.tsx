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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 widget-card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Sleep
        </p>
        {saving && <span className="text-xs text-gray-600">saving…</span>}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hours */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Hours</label>
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
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 tabular-nums"
              />
              <span className="text-xs text-gray-600">hrs</span>
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Quality{quality > 0 ? ` — ${QUALITY_LABELS[quality]}` : ""}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => handleQualityClick(v)}
                  aria-label={`Quality ${v} — ${QUALITY_LABELS[v]}`}
                  className={`w-8 h-8 rounded-full transition-colors ${
                    v <= quality
                      ? "bg-indigo-500 hover:bg-indigo-400"
                      : "bg-gray-700 hover:bg-gray-600"
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
