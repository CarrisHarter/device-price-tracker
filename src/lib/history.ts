import type { PricePoint } from "./forecast";

export interface HistoricalStats {
  current: number;
  avg30d: number;
  avg90d: number;
  low90d: number;
  high90d: number;
  /** Daily % change std dev from history */
  dailyVolatilityPct: number;
  dataPoints: number;
}

function sliceRecent(history: PricePoint[], maxPoints: number): number[] {
  return history.slice(-maxPoints).map((p) => p.price);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDevPct(values: number[]): number {
  if (values.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1]!;
    if (prev === 0) continue;
    returns.push(((values[i]! - prev) / prev) * 100);
  }
  if (returns.length === 0) return 0;
  const m = mean(returns);
  const variance =
    returns.reduce((s, r) => s + (r - m) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

/** Map calendar days to points assuming ~1 point per day in seeded history */
function pointsForDays(history: PricePoint[], days: number): number[] {
  const prices = history.map((p) => p.price);
  return prices.slice(-Math.min(days, prices.length));
}

export function analyzeHistory(history: PricePoint[]): HistoricalStats {
  const current = history.at(-1)?.price ?? 0;
  const p30 = pointsForDays(history, 30);
  const p90 = pointsForDays(history, 90);

  return {
    current,
    avg30d: mean(p30),
    avg90d: mean(p90),
    low90d: p90.length ? Math.min(...p90) : current,
    high90d: p90.length ? Math.max(...p90) : current,
    dailyVolatilityPct: stdDevPct(sliceRecent(history, 90)),
    dataPoints: history.length,
  };
}
