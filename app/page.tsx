import { getTodayIST } from "@/lib/date";
import HabitsWidget from "@/components/HabitsWidget";
import SleepWidget from "@/components/SleepWidget";
import MoodWidget from "@/components/MoodWidget";
import WaterWidget from "@/components/WaterWidget";
import WorkoutWidget from "@/components/WorkoutWidget";
import NutritionWidget from "@/components/NutritionWidget";
import WorkScheduleWidget from "@/components/WorkScheduleWidget";
import MomentumScore from "@/components/MomentumScore";
import NewsWidget from "@/components/NewsWidget";
import ChatWidget from "@/components/ChatWidget";
import DashboardAnimator from "@/components/DashboardAnimator";
import MobileBottomBar from "@/components/MobileBottomBar";

export const dynamic = "force-dynamic";

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getGreetingIST(): string {
  const istHour = new Date(
    new Date().getTime() + 5.5 * 60 * 60 * 1000
  ).getUTCHours();
  if (istHour < 12) return "Good morning";
  if (istHour < 17) return "Good afternoon";
  if (istHour < 21) return "Good evening";
  return "Good night";
}

export default function Home() {
  const today = getTodayIST();
  const displayDate = formatDisplayDate(today);
  const greeting = getGreetingIST();

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 pb-20 sm:pb-0">
      <DashboardAnimator />

      {/* Sticky frosted-glass header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">
              {displayDate}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              Momentum
            </p>
            <MomentumScore />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 2 — Quick Vitals: Sleep · Mood · Water */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div data-widget=""><SleepWidget /></div>
          <div data-widget=""><MoodWidget /></div>
          <div data-widget=""><WaterWidget /></div>
        </section>

        {/* 3 — Habits + Workout */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div data-widget=""><HabitsWidget /></div>
          <div data-widget=""><WorkoutWidget /></div>
        </section>

        {/* 4 — Nutrition + Work Schedule */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div data-widget=""><NutritionWidget /></div>
          <div data-widget=""><WorkScheduleWidget /></div>
        </section>

        {/* 5 — News Feed */}
        <section data-widget="">
          <NewsWidget />
        </section>

        {/* 6 — AI Chat */}
        <section data-widget="">
          <ChatWidget />
        </section>
      </div>

      <MobileBottomBar />
    </main>
  );
}
