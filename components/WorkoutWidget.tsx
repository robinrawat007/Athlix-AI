"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WorkoutLog } from "@/lib/types";

const WORKOUT_TYPES = [
  "push",
  "pull",
  "legs",
  "cardio",
  "rest",
  "other",
] as const;
type WorkoutType = (typeof WORKOUT_TYPES)[number];

const TYPE_LABELS: Record<WorkoutType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  cardio: "Cardio",
  rest: "Rest",
  other: "Other",
};

function IntensityDots({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v === value ? 0 : v)}
          aria-label={`Intensity ${v}`}
          className={`w-7 h-7 rounded-full transition-colors ${
            v <= value
              ? "bg-orange-500 hover:bg-orange-400"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export default function WorkoutWidget() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<WorkoutType>("push");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/workouts")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setLogs(json.data as WorkoutLog[]);
      })
      .catch(() => toast.error("Failed to load workout data"))
      .finally(() => setLoading(false));
  }, []);

  async function handleLog() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { type };
      const dur = parseInt(duration, 10);
      if (!isNaN(dur) && dur > 0) body.duration = dur;
      if (intensity > 0) body.intensity = intensity;
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setLogs((prev) => [...prev, json.data as WorkoutLog]);
      setType("push");
      setDuration("");
      setIntensity(0);
      setNotes("");
      window.dispatchEvent(new CustomEvent("momentum:refresh"));
    } catch {
      toast.error("Failed to log workout");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-48 widget-card">
      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Workout
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Type + Duration */}
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WorkoutType)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
            >
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="300"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="—"
                className="w-14 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 tabular-nums text-center"
              />
              <span className="text-xs text-gray-600">min</span>
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              Intensity{intensity > 0 ? ` — ${intensity} / 5` : ""}
            </label>
            <IntensityDots value={intensity} onChange={setIntensity} />
          </div>

          {/* Notes */}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLog()}
            placeholder="Notes (optional)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500"
          />

          {/* Log button */}
          <div className="flex justify-end">
            <button
              onClick={handleLog}
              disabled={submitting}
              className="px-4 py-2 min-h-[44px] text-sm bg-orange-800 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Logging…" : "Log Workout"}
            </button>
          </div>

          {/* Logged workouts list */}
          {logs.length > 0 && (
            <div className="border-t border-gray-800 pt-3 space-y-2">
              {logs.map((log) => (
                <div key={log.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 font-medium">
                      {TYPE_LABELS[log.type]}
                    </span>
                    {log.duration != null && (
                      <span className="text-xs text-gray-500 tabular-nums">
                        {log.duration} min
                      </span>
                    )}
                    {log.intensity != null && (
                      <div className="flex gap-0.5 ml-auto">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <span
                            key={v}
                            className={`w-2 h-2 rounded-full ${
                              v <= log.intensity! ? "bg-orange-500" : "bg-gray-700"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {log.notes && (
                    <p className="text-xs text-gray-600 mt-0.5">{log.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
