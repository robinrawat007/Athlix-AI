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
      <p className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors mt-1">
        {h.source}&nbsp;↗
      </p>
    </a>
  );
}

function ColumnSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-80 widget-card">
      <Skeleton className="h-2.5 w-16 mb-4" />
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

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-80 widget-card">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-3">
        {label}
      </p>
      <p className="text-xs text-gray-600 leading-relaxed">
        No headlines yet.
        <br />
        The feed refreshes at 6 am IST.
      </p>
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

  // Stagger columns in once data arrives
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

  // Skeleton
  if (rows === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.key} />
        ))}
      </div>
    );
  }

  // No news in DB at all
  if (rows.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <EmptyColumn key={col.key} label={col.label} />
        ))}
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

      {/* Mobile tab bar — hidden on sm and up */}
      <div className="flex sm:hidden gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => setActiveTab(col.key)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === col.key
                ? "bg-gray-700 text-gray-100"
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
          const headlines = (byCategory.get(col.key) ?? []).slice(0, 5);
          return (
            <div
              key={col.key}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-80 widget-card"
            >
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
          );
        })}
      </div>

      {/* Desktop 4-column grid — hidden on mobile */}
      <div
        ref={gridRef}
        className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {COLUMNS.map((col) => {
          const headlines = (byCategory.get(col.key) ?? []).slice(0, 5);
          return (
            <div
              key={col.key}
              data-col=""
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-80 widget-card"
            >
              <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-4">
                {col.label}
              </p>

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
          );
        })}
      </div>
    </div>
  );
}
