export interface MomentumInput {
  sleepHours: number | null;
  habitsTotal: number;
  habitsCompleted: number;
  workoutLogged: boolean;
  waterMl: number;
  mood: number | null;
}

export interface MomentumBreakdown {
  sleep: number;
  habits: number;
  workout: number;
  water: number;
  mood: number;
  total: number;
}

// Target: 7.5h sleep, 2500ml water, mood out of 5
export function computeMomentum(input: MomentumInput): MomentumBreakdown {
  const sleep =
    input.sleepHours !== null
      ? Math.round(Math.min(input.sleepHours / 7.5, 1) * 20)
      : 0;

  const habits =
    input.habitsTotal > 0
      ? Math.round((input.habitsCompleted / input.habitsTotal) * 30)
      : 0;

  const workout = input.workoutLogged ? 20 : 0;

  const water = Math.round(Math.min(input.waterMl / 2500, 1) * 15);

  const mood =
    input.mood !== null ? Math.round((input.mood / 5) * 15) : 0;

  return {
    sleep,
    habits,
    workout,
    water,
    mood,
    total: sleep + habits + workout + water + mood,
  };
}
