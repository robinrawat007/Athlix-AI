"use client";

import { useState, useEffect } from "react";
import { getTodayIST } from "@/lib/date";

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function scoreColor(n: number): string {
  if (n >= 80) return "text-emerald-400";
  if (n >= 60) return "text-lime-400";
  if (n >= 40) return "text-yellow-400";
  if (n >= 20) return "text-orange-400";
  return "text-gray-300";
}

export default function MobileBottomBar() {
  const [score, setScore] = useState<number | null>(null);
  const today = getTodayIST();
  const displayDate = formatShortDate(today);

  async function fetchScore() {
    try {
      const res = await fetch("/api/momentum");
      const json = await res.json();
      if (json.success) setScore(json.data.total as number);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchScore();
    function onRefresh() {
      fetchScore();
    }
    window.addEventListener("momentum:refresh", onRefresh);
    return () => window.removeEventListener("momentum:refresh", onRefresh);
  }, []);

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm px-5 py-3 flex items-center justify-between">
      <span className="text-xs text-gray-500 uppercase tracking-widest">
        {displayDate}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 uppercase tracking-widest">
          Momentum
        </span>
        <span
          className={`text-lg font-bold tabular-nums leading-none ${scoreColor(score ?? 0)}`}
        >
          {score !== null ? score : "—"}
        </span>
      </div>
    </div>
  );
}
