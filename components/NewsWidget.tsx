"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { gsap } from "gsap";
import { getTodayIST } from "@/lib/date";
import { Skeleton } from "@/components/ui/Skeleton";
import type { NewsCache, NewsHeadline } from "@/lib/types";

const COLUMNS = [
  { key: "ai",     label: "AI & Tech" },
  { key: "world",  label: "World"     },
  { key: "india",  label: "India"     },
  { key: "soccer", label: "Soccer"    },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

const COL_ACCENT: Record<ColKey, { bar: string; text: string; glow: string; band: string }> = {
  ai:     { bar: "bg-indigo-500", text: "text-indigo-400/80",  glow: "card-glow-indigo",  band: "from-indigo-500/10"  },
  world:  { bar: "bg-blue-500",   text: "text-blue-400/80",    glow: "card-glow-blue",    band: "from-blue-500/10"    },
  india:  { bar: "bg-orange-500", text: "text-orange-400/80",  glow: "card-glow-orange",  band: "from-orange-500/10"  },
  soccer: { bar: "bg-emerald-500",text: "text-emerald-400/80", glow: "card-glow-emerald", band: "from-emerald-500/10" },
};

function formatFetchDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function HeadlineItem({ h }: { h: NewsHeadline }) {
  return (
    <a
      href={h.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <p className="text-sm text-gray-300 font-medium leading-snug group-hover:text-white transition-colors">
        {h.title}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed mt-1">{h.summary}</p>
      <p className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors mt-1">
        {h.source}&nbsp;↗
      </p>
    </a>
  );
}

function ColumnSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5 min-h-80 widget-card overflow-hidden">
      <Skeleton className="h-2.5 w-16 mb-5" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-2.5 w-1/3 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyColumn({ colKey, label }: { colKey: ColKey; label: string }) {
  const accent = COL_ACCENT[colKey];
  return (
    <div className={`bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden min-h-80 widget-card ${accent.glow}`}>
      <div className={`-mx-0 px-5 py-3 mb-4 bg-gradient-to-r ${accent.band} to-transparent`}>
        <div className="flex items-center gap-2">
          <span className={`w-0.5 h-3.5 ${accent.bar} rounded-full`} aria-hidden />
          <p className={`text-xs ${accent.text} uppercase tracking-widest font-semibold`}>{label}</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <p className="text-xs text-gray-600 leading-relaxed">
          No headlines yet.
          <br />
          The feed refreshes at 6 am IST.
        </p>
      </div>
    </div>
  );
}

export default function NewsWidget() {
  const [rows, setRows] = useState<NewsCache[] | null>(null);
  const [activeTab, setActiveTab] = useState<ColKey>("ai");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((json) => setRows(json.success ? (json.data as NewsCache[]) : []))
      .catch(() => {
        setRows([]);
        toast.error("Failed to load news");
      });
  }, []);

  useEffect(() => {
    if (rows && rows.length > 0 && gridRef.current) {
      gsap.from(gridRef.current.querySelectorAll("[data-col]"), {
        opacity: 0,
        y: 12,
        duration: 0.35,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "all",
      });
    }
  }, [rows]);

  if (rows === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => <ColumnSkeleton key={col.key} />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => <EmptyColumn key={col.key} colKey={col.key} label={col.label} />)}
      </div>
    );
  }

  const today = getTodayIST();
  const fetchDate = rows[0].fetch_date;
  const isStale = fetchDate !== today;

  const byCategory = new Map<string, NewsHeadline[]>(
    rows.map((r) => [r.category, r.headlines])
  );

  return (
    <div className="space-y-2">
      {isStale && (
        <p className="text-xs text-gray-600 text-right">
          Showing {formatFetchDate(fetchDate)} · refreshes at 6 am IST
        </p>
      )}

      {/* Mobile tab bar */}
      <div className="flex sm:hidden gap-1 bg-gray-900 border border-gray-700/50 rounded-xl p-1">
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => setActiveTab(col.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === col.key
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* Mobile single-column view */}
      <div className="sm:hidden">
        {COLUMNS.filter((col) => col.key === activeTab).map((col) => {
          const accent = COL_ACCENT[col.key];
          const headlines = (byCategory.get(col.key) ?? []).slice(0, 5);
          return (
            <div
              key={col.key}
              className={`bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden min-h-80 widget-card ${accent.glow}`}
            >
              <div className={`px-5 py-3 mb-1 bg-gradient-to-r ${accent.band} to-transparent`}>
                <div className="flex items-center gap-2">
                  <span className={`w-0.5 h-3.5 ${accent.bar} rounded-full`} aria-hidden />
                  <p className={`text-xs ${accent.text} uppercase tracking-widest font-semibold`}>
                    {col.label}
                  </p>
                </div>
              </div>
              <div className="px-5 pb-5">
                {headlines.length === 0 ? (
                  <p className="text-xs text-gray-600">No headlines available.</p>
                ) : (
                  <ul className="divide-y divide-gray-800">
                    {headlines.map((h, i) => (
                      <li key={i} className="py-3 first:pt-0 last:pb-0">
                        <HeadlineItem h={h} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop 4-column grid */}
      <div
        ref={gridRef}
        className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {COLUMNS.map((col) => {
          const accent = COL_ACCENT[col.key];
          const headlines = (byCategory.get(col.key) ?? []).slice(0, 5);
          return (
            <div
              key={col.key}
              data-col=""
              className={`bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden min-h-80 widget-card ${accent.glow}`}
            >
              <div className={`px-5 py-3 mb-1 bg-gradient-to-r ${accent.band} to-transparent`}>
                <div className="flex items-center gap-2">
                  <span className={`w-0.5 h-3.5 ${accent.bar} rounded-full`} aria-hidden />
                  <p className={`text-xs ${accent.text} uppercase tracking-widest font-semibold`}>
                    {col.label}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5">
                {headlines.length === 0 ? (
                  <p className="text-xs text-gray-600">No headlines available.</p>
                ) : (
                  <ul className="divide-y divide-gray-800">
                    {headlines.map((h, i) => (
                      <li key={i} className="py-3 first:pt-0 last:pb-0">
                        <HeadlineItem h={h} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
