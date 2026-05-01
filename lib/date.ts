// All date logic goes through this file — always returns dates in IST (UTC+5:30)

export function getTodayIST(): string {
  const now = new Date();
  // Shift to IST by adding the offset to UTC
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function getDateIST(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
