"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WaterEntry } from "@/lib/types";

const TARGET_ML = 2500;
const QUICK_AMOUNTS = [150, 250, 330, 500] as const;

function toISTTime(utcIso: string): string {
  const d = new Date(new Date(utcIso).getTime() + 5.5 * 60 * 60 * 1000);
  const h = d.getUTCHours().toString().padStart(2, "0");
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function totalColorClass(total: number, isHit: boolean): string {
  if (isHit) return "text-cyan-400 font-semibold";
  if (total >= 1000) return "text-cyan-300";
  return "text-gray-300";
}

export default function WaterWidget() {
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/water")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setEntries(json.data.entries);
          setTotal(json.data.total_ml);
        }
      })
      .catch(() => toast.error("Failed to load water data"))
      .finally(() => setLoading(false));
  }, []);

  async function addWater(amount_ml: number) {
    if (adding || amount_ml <= 0) return;
    setAdding(true);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ml }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEntries((prev) => [...prev, json.data.entry as WaterEntry]);
      setTotal(json.data.total_ml as number);
      window.dispatchEvent(new CustomEvent("momentum:refresh"));
    } catch {
      toast.error("Failed to log water");
    } finally {
      setAdding(false);
    }
  }

  async function handleCustomAdd() {
    const ml = parseInt(customAmount, 10);
    if (isNaN(ml) || ml <= 0) return;
    await addWater(ml);
    setCustomAmount("");
    inputRef.current?.focus();
  }

  const pct = Math.min(100, Math.round((total / TARGET_ML) * 100));
  const isHit = total >= TARGET_ML;

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5 widget-card card-glow-cyan">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-3.5 bg-cyan-500 rounded-full" aria-hidden />
          <p className="text-xs text-cyan-400/80 uppercase tracking-widest font-semibold">
            Water
          </p>
        </div>
        {!loading && (
          <span className="text-xs tabular-nums">
            <span className={totalColorClass(total, isHit)}>{total}</span>
            <span className="text-gray-600"> / {TARGET_ML}ml</span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-2 rounded-full" />
          <Skeleton className="h-8" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Animated gradient progress bar */}
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isHit ? "water-bar-hit" : "water-bar"}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Quick-add buttons */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((ml) => (
              <button
                key={ml}
                onClick={() => addWater(ml)}
                disabled={adding}
                className="flex-1 min-w-[3rem] py-2 text-xs text-cyan-400 bg-cyan-900/40 border border-cyan-800/60 hover:bg-cyan-800/50 hover:text-cyan-300 hover:border-cyan-700 active:bg-cyan-700/50 rounded-lg transition-colors disabled:opacity-50 tabular-nums"
              >
                +{ml}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              min="1"
              max="2000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
              placeholder="Custom ml"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 tabular-nums"
            />
            <button
              onClick={handleCustomAdd}
              disabled={adding || !customAmount}
              className="px-4 py-2 min-h-[44px] text-sm bg-cyan-800/60 hover:bg-cyan-700/70 text-cyan-300 border border-cyan-700/50 rounded-lg transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {/* Entry history */}
          {entries.length > 0 && (
            <div className="border-t border-gray-800 pt-3 space-y-1.5 max-h-36 overflow-y-auto">
              {[...entries].reverse().map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 tabular-nums">
                    {entry.logged_at ? toISTTime(entry.logged_at) : "—"}
                  </span>
                  <span className="text-cyan-500/70 tabular-nums">{entry.amount_ml}ml</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
