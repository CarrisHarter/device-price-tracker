import { analyzeHistory } from "./history";

export const VARIANCE_FLOOR_PCT = 0.05;
export const VARIANCE_CAP_PCT = 0.12;
export const VARIANCE_DEFAULT_PCT = 0.1;

export interface PricePoint {
  t: number;
  price: number;
}

export interface Forecast {
  horizonDays: number;
  projected: number;
  low: number;
  high: number;
  trendPerDay: number;
  variancePct: number;
  confidence: "low" | "medium" | "high";
}

function trendSlope(history: PricePoint[]): number {
  if (history.length < 2) return 0;
  const n = history.length;
  let sumT = 0;
  let sumP = 0;
  let sumTP = 0;
  let sumTT = 0;
  for (const pt of history) {
    sumT += pt.t;
    sumP += pt.price;
    sumTP += pt.t * pt.price;
    sumTT += pt.t * pt.t;
  }
  const denom = n * sumTT - sumT * sumT;
  if (denom === 0) return 0;
  return (n * sumTP - sumT * sumP) / denom;
}

/** Variance band from historical daily volatility, clamped 5–12%, default 10% */
export function varianceFromHistory(history: PricePoint[]): number {
  const { dailyVolatilityPct, dataPoints } = analyzeHistory(history);
  if (dataPoints < 15) return VARIANCE_DEFAULT_PCT;
  const scaled = (dailyVolatilityPct / 100) * Math.sqrt(7);
  return Math.min(
    VARIANCE_CAP_PCT,
    Math.max(VARIANCE_FLOOR_PCT, scaled || VARIANCE_DEFAULT_PCT)
  );
}

export function projectFuturePrice(
  history: PricePoint[],
  horizonDays: number
): Forecast {
  const current = history.at(-1)?.price ?? 0;
  const slope = trendSlope(history);
  const msPerDay = 86_400_000;
  const trendPerDay = slope * msPerDay;
  const projected = current + trendPerDay * horizonDays;
  const variancePct = varianceFromHistory(history);

  const low = projected * (1 - variancePct);
  const high = projected * (1 + variancePct);

  const points = history.length;
  const spanDays =
    points >= 2
      ? (history.at(-1)!.t - history[0]!.t) / 86_400_000
      : 0;
  // Tuned for monthly public list-price history (see expandToMonthlyHistory)
  const confidence: Forecast["confidence"] =
    points >= 12 && spanDays >= 365
      ? "high"
      : points >= 6 && spanDays >= 90
        ? "medium"
        : "low";

  return {
    horizonDays,
    projected: Math.max(0, projected),
    low: Math.max(0, low),
    high: Math.max(0, high),
    trendPerDay,
    variancePct,
    confidence,
  };
}

export function formatJpy(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
