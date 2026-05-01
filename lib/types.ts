export interface DailyLog {
  id: number;
  date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  mood: number | null;
  mood_note: string | null;
  water_ml: number;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  date: string;
  completed: boolean;
  logged_at: string | null;
}

export interface HabitWithLog extends Habit {
  completed: boolean;
  logged_at: string | null;
}

export interface WorkoutLog {
  id: number;
  date: string;
  type: "push" | "pull" | "legs" | "cardio" | "rest" | "other";
  duration: number | null;
  intensity: number | null;
  notes: string | null;
  created_at: string;
}

export interface NutritionLog {
  id: number;
  date: string;
  meal_slot: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  calories: number | null;
  created_at: string;
}

export interface WaterEntry {
  id: number;
  date: string;
  amount_ml: number;
  logged_at: string;
}

export interface NewsHeadline {
  title: string;
  summary: string;
  url: string;
  source: string;
}

export interface NewsCache {
  id: number;
  fetch_date: string;
  category: "ai" | "world" | "india" | "soccer";
  headlines: NewsHeadline[];
  created_at: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
