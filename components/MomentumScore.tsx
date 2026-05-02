"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { MomentumBreakdown } from "@/lib/momentum";

type FullBreakdown = MomentumBreakdown & { date: string };

const RADIUS = 30;
const CIRC = 2 * Math.PI * RADIUS;
const STROKE = 6;

function textColorClass(n: number): string {
  if (n >= 80) return "text-emerald-400";
  if (n >= 60) return "text-lime-400";
  if (n >= 40) return "text-yellow-400";
  if (n >= 20) return "text-orange-400";
  return "text-gray-200";
}

const BREAKDOWN_ITEMS = [
  { key: "sleep",   label: "Sleep",   max: 20 },
  { key: "habits",  label: "Habits",  max: 30 },
  { key: "workout", label: "Workout", max: 20 },
  { key: "water",   label: "Water",   max: 15 },
  { key: "mood",    label: "Mood",    max: 15 },
] as const;

export default function MomentumScore() {
  const [breakdown, setBreakdown] = useState<FullBreakdown | null>(null);
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  async function fetchScore() {
    try {
      const res = await fetch("/api/momentum");
      const json = await res.json();
      if (json.success) setBreakdown(json.data as FullBreakdown);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchScore();
    function onRefresh() { fetchScore(); }
    window.addEventListener("momentum:refresh", onRefresh);
    return () => window.removeEventListener("momentum:refresh", onRefresh);
  }, []);

  useEffect(() => {
    if (breakdown === null) return;
    const target = breakdown.total;
    tweenRef.current?.kill();
    const obj = { val: displayedRef.current };
    tweenRef.current = gsap.to(obj, {
      val: target,
      duration: 0.5,
      ease: "power2.out",
      onUpdate() {
        const next = Math.round(obj.val);
        displayedRef.current = next;
        setDisplayed(next);
      },
    });
    return () => { tweenRef.current?.kill(); };
  }, [breakdown]);

  const offset = breakdown !== null ? CIRC * (1 - breakdown.total / 100) : CIRC;

  if (breakdown === null) {
    return (
      <div className="w-[76px] h-[76px] flex items-center justify-center">
        <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
          <circle cx="38" cy="38" r={RADIUS} fill="none" stroke="#1f2937" strokeWidth={STROKE} />
        </svg>
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className="relative w-[76px] h-[76px] cursor-default select-none"
            aria-label={`Momentum score: ${displayed}`}
          >
            <svg
              width="76"
              height="76"
              viewBox="0 0 76 76"
              className="absolute inset-0"
              style={{ transform: "rotate(-90deg)" }}
              aria-hidden
            >
              <defs>
                {/* indigo-400 → violet-400 → emerald-400 */}
                <linearGradient
                  id="ring-grad"
                  x1="38" y1="8" x2="38" y2="68"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%"   stopColor="#818cf8" />
                  <stop offset="50%"  stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle
                cx="38" cy="38" r={RADIUS}
                fill="none"
                stroke="#1f2937"
                strokeWidth={STROKE}
              />
              {/* Progress */}
              <circle
                cx="38" cy="38" r={RADIUS}
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth={STROKE}
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-2xl font-bold tabular-nums leading-none transition-colors duration-500 ${textColorClass(displayed)}`}
              >
                {displayed}
              </span>
            </div>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            align="end"
            sideOffset={10}
            className="z-50 rounded-xl bg-gray-900 border border-gray-700/60 px-3 py-3 shadow-2xl"
          >
            <p className="text-[10px] text-indigo-400/70 uppercase tracking-widest font-semibold mb-2.5">
              Score Breakdown
            </p>
            <div className="space-y-2">
              {BREAKDOWN_ITEMS.map(({ key, label, max }) => {
                const val = breakdown[key];
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <span className="text-xs text-gray-400 w-14 shrink-0">{label}</span>
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden w-24">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(val / max) * 100}%`,
                          background: "linear-gradient(to right, #818cf8, #a78bfa)",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-300 tabular-nums w-8 text-right shrink-0">
                      {val}/{max}
                    </span>
                  </div>
                );
              })}
            </div>
            <Tooltip.Arrow className="fill-gray-700" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
