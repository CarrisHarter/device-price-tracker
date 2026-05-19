import type { PricePoint } from "../lib/forecast";
import { releaseMsForSku } from "./apple-skus";
import fetchedFile from "./fetched-history.json";

/**
 * Published Apple Store Japan tax-included list prices at launch (and documented changes).
 * Sources: Apple Newsroom Japan, Apple Store Japan.
 */
interface PublicRecord {
  skuId: string;
  date: string;
  price: number;
}

/** One row per SKU: Japan on-sale date + launch list price for the tracked configuration. */
const RECORDS: PublicRecord[] = [
  { skuId: "mba-13-m4", date: "2025-03-12", price: 164800 },
  { skuId: "mba-15-m4", date: "2025-03-12", price: 198800 },
  { skuId: "mbp-14-m4", date: "2024-11-08", price: 248800 },
  { skuId: "mbp-16-m4", date: "2024-11-08", price: 398800 },
  { skuId: "mac-mini-m4", date: "2024-11-08", price: 94800 },
  { skuId: "mac-mini-m4-pro", date: "2024-11-08", price: 218800 },
  { skuId: "imac-24-m4", date: "2024-11-08", price: 198800 },
  { skuId: "mac-studio-m4", date: "2025-03-12", price: 328800 },
  { skuId: "ipad-pro-11", date: "2024-05-15", price: 168800 },
  { skuId: "ipad-pro-13", date: "2024-05-15", price: 218800 },
  { skuId: "ipad-air-13", date: "2025-03-12", price: 128800 },
  { skuId: "studio-display", date: "2026-03-11", price: 269800 },
];

function toPoint(r: PublicRecord): PricePoint {
  return { t: Date.parse(r.date), price: r.price };
}

function isOnOrAfterRelease(r: PublicRecord): boolean {
  const release = releaseMsForSku(r.skuId);
  return release === 0 || Date.parse(r.date) >= release;
}

/** Fill monthly samples between list-price changes; last segment runs through today. */
export function expandToMonthlyHistory(sparse: PricePoint[]): PricePoint[] {
  if (sparse.length === 0) return [];
  const sorted = [...sparse].sort((a, b) => a.t - b.t);
  const msPerMonth = 30 * 86_400_000;
  const now = Date.now();
  const out: PricePoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const segment = sorted[i]!;
    const segmentEnd = i < sorted.length - 1 ? sorted[i + 1]!.t : now;
    let t = segment.t;
    while (t < segmentEnd) {
      out.push({ t, price: segment.price });
      t += msPerMonth;
    }
  }

  const last = sorted.at(-1)!;
  const lastPrice = last.price;
  if (!out.length || out.at(-1)!.t < now) {
    out.push({ t: now, price: lastPrice });
  }
  return out;
}

let runtimeLastRun: string | null = null;
let runtimeRecords: PublicRecord[] | null = null;

/** Apply live prices from hosted JSON (in-memory). */
export function applyRuntimeFetch(data: {
  lastRun: string;
  records: PublicRecord[];
}): void {
  runtimeLastRun = data.lastRun;
  runtimeRecords = data.records;
}

function mergedRecords(): PublicRecord[] {
  const key = (r: PublicRecord) => `${r.skuId}|${r.date}`;
  const map = new Map<string, PublicRecord>();
  for (const r of RECORDS) map.set(key(r), r);
  for (const r of fetchedFile.records ?? []) {
    map.set(key(r), { skuId: r.skuId, date: r.date, price: r.price });
  }
  if (runtimeRecords) {
    for (const r of runtimeRecords) map.set(key(r), r);
  }
  return [...map.values()].filter(isOnOrAfterRelease);
}

export function getLastFetchRun(): string | null {
  const run = runtimeLastRun ?? fetchedFile.lastRun;
  return run && run.length > 0 ? run : null;
}

export function publicHistoryBySku(): Map<string, PricePoint[]> {
  const map = new Map<string, PricePoint[]>();
  for (const r of mergedRecords()) {
    const list = map.get(r.skuId) ?? [];
    list.push(toPoint(r));
    map.set(r.skuId, list);
  }
  for (const [id, points] of map) {
    const sorted = points.sort((a, b) => a.t - b.t);
    map.set(id, expandToMonthlyHistory(sorted));
  }
  return map;
}
