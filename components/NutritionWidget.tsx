"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Separator } from "@/components/ui/Separator";
import type { NutritionLog } from "@/lib/types";

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const SLOT_DOT: Record<MealSlot, string> = {
  breakfast: "bg-yellow-400",
  lunch: "bg-green-400",
  dinner: "bg-blue-400",
  snack: "bg-pink-400",
};

type SlotForm = { desc: string; kcal: string; saving: boolean };

function emptyForm(): SlotForm {
  return { desc: "", kcal: "", saving: false };
}

type FormState = Record<MealSlot, SlotForm>;

export default function NutritionWidget() {
  const [entries, setEntries] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    breakfast: emptyForm(),
    lunch: emptyForm(),
    dinner: emptyForm(),
    snack: emptyForm(),
  });

  useEffect(() => {
    fetch("/api/nutrition")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setEntries(json.data as NutritionLog[]);
      })
      .catch(() => toast.error("Failed to load nutrition data"))
      .finally(() => setLoading(false));
  }, []);

  function update(slot: MealSlot, patch: Partial<SlotForm>) {
    setForm((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));
  }

  async function save(slot: MealSlot, currentForm: SlotForm) {
    if (!currentForm.desc.trim() || currentForm.saving) return;
    update(slot, { saving: true });
    try {
      const body: Record<string, unknown> = {
        meal_slot: slot,
        description: currentForm.desc.trim(),
      };
      const kcalNum = parseInt(currentForm.kcal, 10);
      if (!isNaN(kcalNum) && kcalNum > 0) body.calories = kcalNum;

      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setEntries((prev) => [...prev, json.data as NutritionLog]);
      update(slot, { desc: "", kcal: "" });
    } catch {
      toast.error(`Failed to save ${SLOT_LABELS[slot].toLowerCase()}`);
    } finally {
      update(slot, { saving: false });
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5 min-h-48 widget-card card-glow-yellow">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-0.5 h-3.5 bg-yellow-500 rounded-full" aria-hidden />
        <p className="text-xs text-yellow-400/80 uppercase tracking-widest font-semibold">
          Nutrition
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <div className="space-y-0">
          {SLOTS.map((slot, idx) => {
            const slotEntries = entries.filter((e) => e.meal_slot === slot);
            const slotForm = form[slot];

            return (
              <div key={slot}>
                {idx > 0 && <Separator className="my-4" />}

                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SLOT_DOT[slot]}`} aria-hidden />
                  <p className="text-xs text-gray-400 font-medium">
                    {SLOT_LABELS[slot]}
                  </p>
                </div>

                {slotEntries.length > 0 && (
                  <ul className="space-y-0.5 mb-2">
                    {slotEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="text-gray-200">{entry.description}</span>
                        {entry.calories != null && (
                          <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
                            {entry.calories} kcal
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div
                  className="flex gap-2"
                  onBlur={(e) => {
                    if (
                      slotForm.desc.trim() &&
                      !e.currentTarget.contains(e.relatedTarget as Node)
                    ) {
                      save(slot, slotForm);
                    }
                  }}
                >
                  <input
                    type="text"
                    value={slotForm.desc}
                    onChange={(e) => update(slot, { desc: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && save(slot, slotForm)}
                    placeholder={`Add ${SLOT_LABELS[slot].toLowerCase()}…`}
                    disabled={slotForm.saving}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/25 disabled:opacity-50 min-w-0"
                  />
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={slotForm.kcal}
                    onChange={(e) => update(slot, { kcal: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && save(slot, slotForm)}
                    placeholder="kcal"
                    disabled={slotForm.saving}
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/25 tabular-nums disabled:opacity-50"
                  />
                  <button
                    onClick={() => save(slot, slotForm)}
                    disabled={slotForm.saving || !slotForm.desc.trim()}
                    className="px-3 py-2 min-h-[44px] text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
