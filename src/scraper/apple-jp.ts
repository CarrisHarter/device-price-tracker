/**
 * Apple Store Japan price scraper (Node only).
 * Used by CLI, Vite dev middleware, and prebuild.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCRAPE_TTL_MS } from "../data/scrape-config";
import {
  SCRAPE_TARGETS,
  type AppleSelectionData,
} from "../data/scrape-targets";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const FETCHED_HISTORY_PATH = join(ROOT, "src/data/fetched-history.json");
/** Served at /prices.json — updated by cloud scraper, fetched by the live site. */
export const PUBLIC_PRICES_PATH = join(ROOT, "public/prices.json");
export { SCRAPE_TTL_MS };

const BASE = "https://www.apple.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export interface FetchedRecord {
  skuId: string;
  date: string;
  price: number;
  source: string;
}

export interface FetchedFile {
  lastRun: string;
  records: FetchedRecord[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractBuyFlowUrl(html: string): string | null {
  const m = html.match(/buyFlowPricesUrl:\s*['"]([^'"]+)['"]/);
  return m?.[1] ?? null;
}

async function fetchBuyFlowAmounts(flowPath: string): Promise<number[]> {
  const base = flowPath.startsWith("http") ? flowPath : `${BASE}${flowPath}`;
  const url = base.includes("?") ? `${base}&fae=true` : `${base}?fae=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`buy-flow ${url} → HTTP ${res.status}`);
  const json = (await res.json()) as {
    body?: {
      content?: {
        prices?: Record<string, { currentPrice?: { raw_amount?: string } }>;
      };
    };
  };
  const prices = json.body?.content?.prices ?? {};
  return Object.values(prices)
    .map((p) => parseFloat(p.currentPrice?.raw_amount ?? ""))
    .filter((n) => Number.isFinite(n));
}

function parseProductSelectionData(html: string): AppleSelectionData | null {
  const marker = "productSelectionData:";
  const start = html.indexOf(marker);
  if (start < 0) return null;
  let i = start + marker.length;
  while (html[i] === " ") i++;
  if (html[i] !== "{") return null;
  let depth = 0;
  const begin = i;
  for (; i < html.length; i++) {
    const c = html[i]!;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  try {
    return JSON.parse(html.slice(begin, i)) as AppleSelectionData;
  } catch {
    return null;
  }
}

async function fetchPage(path: string): Promise<string> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ja-JP,ja;q=0.9" },
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

export function readFetchedFile(): FetchedFile {
  try {
    return JSON.parse(readFileSync(FETCHED_HISTORY_PATH, "utf8")) as FetchedFile;
  } catch {
    return { lastRun: "", records: [] };
  }
}

export function writeFetchedFile(file: FetchedFile): void {
  const json = JSON.stringify(file, null, 2) + "\n";
  mkdirSync(dirname(FETCHED_HISTORY_PATH), { recursive: true });
  writeFileSync(FETCHED_HISTORY_PATH, json);
  mkdirSync(dirname(PUBLIC_PRICES_PATH), { recursive: true });
  writeFileSync(PUBLIC_PRICES_PATH, json);
}

export function dedupeRecords(records: FetchedRecord[]): FetchedRecord[] {
  const map = new Map<string, FetchedRecord>();
  for (const r of records) {
    map.set(`${r.skuId}|${r.date}`, r);
  }
  return [...map.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.skuId.localeCompare(b.skuId)
  );
}

export function isFetchedStale(file: FetchedFile): boolean {
  if (!file.lastRun) return true;
  const at = Date.parse(file.lastRun);
  if (Number.isNaN(at)) return true;
  return Date.now() - at > SCRAPE_TTL_MS;
}

export interface ScrapeLog {
  skuId: string;
  ok: boolean;
  price?: number;
  error?: string;
}

export interface ScrapeResult {
  file: FetchedFile;
  logs: ScrapeLog[];
}

/** Fetch today's prices for all SKUs and append to history file. */
export async function runAppleJpScrape(
  existing: FetchedFile = readFetchedFile()
): Promise<ScrapeResult> {
  const date = todayIso();
  const byPath = new Map<string, string>();
  const buyFlowCache = new Map<string, number[]>();
  const logs: ScrapeLog[] = [];

  for (const target of SCRAPE_TARGETS) {
    try {
      if (!byPath.has(target.shopPath)) {
        byPath.set(target.shopPath, await fetchPage(target.shopPath));
      }
      const html = byPath.get(target.shopPath)!;
      const data = parseProductSelectionData(html);
      let price = data ? target.pickBasePrice(data) : null;

      if (price == null) {
        const flowPath = extractBuyFlowUrl(html);
        if (flowPath) {
          if (!buyFlowCache.has(flowPath)) {
            buyFlowCache.set(flowPath, await fetchBuyFlowAmounts(flowPath));
          }
          const amounts = buyFlowCache.get(flowPath)!;
          price =
            target.pickFromAmounts?.(amounts) ??
            (amounts.length ? Math.min(...amounts) : null);
        }
      }

      if (price == null) {
        logs.push({ skuId: target.skuId, ok: false, error: "no price" });
        continue;
      }

      const rounded = Math.round(price);
      existing.records.push({
        skuId: target.skuId,
        date,
        price: rounded,
        source: `apple.com${target.shopPath}`,
      });
      logs.push({ skuId: target.skuId, ok: true, price: rounded });
    } catch (e) {
      logs.push({
        skuId: target.skuId,
        ok: false,
        error: (e as Error).message,
      });
    }
  }

  existing.lastRun = new Date().toISOString();
  existing.records = dedupeRecords(existing.records);
  writeFetchedFile(existing);
  return { file: existing, logs };
}
