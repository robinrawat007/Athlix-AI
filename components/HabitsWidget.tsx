"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import type { HabitWithLog } from "@/lib/types";

export default function HabitsWidget() {
  const [habits, setHabits] = useState<HabitWithLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const [justDone, setJustDone] = useState<Set<number>>(new Set());
  const prevCompletedRef = useRef<Set<number>>(new Set());

  const fetchHabits = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/habits");
      const json = await res.json();
      if (json.success) setHabits(json.data);
    } catch {
      if (!silent) toast.error("Failed to load habits");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  async function toggle(habit: HabitWithLog) {
    if (toggling.has(habit.id)) return;
    const newCompleted = !habit.completed;

    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, completed: newCompleted, streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1) }
          : h
      )
    );

    if (newCompleted) {
      setJustDone((prev) => new Set(prev).add(habit.id));
      setTimeout(() => {
        setJustDone((prev) => { const s = new Set(prev); s.delete(habit.id); return s; });
      }, 400);
    }

    setToggling((prev) => new Set(prev).add(habit.id));

    try {
      const res = await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit_id: habit.id, completed: newCompleted }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      fetchHabits(true);
      window.dispatchEvent(new CustomEvent("momentum:refresh"));
    } catch {
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, ...habit } : h)));
      toast.error("Failed to save habit");
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(habit.id); return s; });
    }
  }

  useEffect(() => {
    prevCompletedRef.current = new Set(habits.filter((h) => h.completed).map((h) => h.id));
  }, [habits]);

  const done = habits.filter((h) => h.completed).length;
  const total = habits.length;
  const allDone = total > 0 && done === total;

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5 min-h-48 widget-card card-glow-emerald">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-3.5 bg-emerald-500 rounded-full" aria-hidden />
          <p className="text-xs text-emerald-400/80 uppercase tracking-widest font-semibold">
            Habits
          </p>
        </div>
        {!loading && total > 0 && (
          <span className="text-xs tabular-nums">
            <span className={allDone ? "text-emerald-400 font-semibold" : "text-gray-300"}>{done}</span>
            <span className="text-gray-600"> / {total}</span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
        </div>
      ) : habits.length === 0 ? (
        <p className="text-sm text-gray-600">No habits configured.</p>
      ) : (
        <ul className="space-y-0.5">
          {habits.map((habit) => (
            <li key={habit.id}>
              <button
                onClick={() => toggle(habit)}
                disabled={toggling.has(habit.id)}
                className={`w-full flex items-center gap-3 px-2 py-2.5 min-h-[44px] rounded-lg transition-colors text-left
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${habit.completed
                    ? "bg-emerald-950/30 hover:bg-emerald-900/35"
                    : "hover:bg-gray-800 active:bg-gray-700"
                  }`}
              >
                {/* Checkbox */}
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${justDone.has(habit.id) ? "animate-pop" : ""}
                    ${habit.completed
                      ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "border-gray-500 bg-transparent hover:border-emerald-500/50"
                    }`}
                >
                  {habit.completed && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                {habit.icon && (
                  <span className="text-base leading-none select-none">{habit.icon}</span>
                )}

                <span className={`flex-1 text-sm transition-colors truncate ${
                  habit.completed ? "line-through text-gray-500" : "text-gray-200"
                }`}>
                  {habit.name}
                </span>

                {habit.streak > 0 && (
                  <Badge className="bg-orange-950/60 text-orange-400 border border-orange-900/50 shrink-0">
                    {habit.streak}d
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
