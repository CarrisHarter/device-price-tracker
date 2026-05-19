import { PRICE_POLL_MS } from "../data/scrape-config";
import { applyRuntimeFetch } from "../data/public-price-history";
import { reloadMarket } from "./market";

export interface FetchedPayload {
  lastRun: string;
  records: { skuId: string; date: string; price: number; source?: string }[];
}

export type PriceFeedStatus =
  | "idle"
  | "loading"
  | "live"
  | "cached"
  | "unavailable";

/** Hosted JSON updated by scheduled cloud scraper (see .github/workflows). */
const PRICES_URL = `${import.meta.env.BASE_URL}prices.json`;

let status: PriceFeedStatus = "idle";
let statusListeners: ((s: PriceFeedStatus) => void)[] = [];
let dataListeners: (() => void)[] = [];
let lastPayloadSig = "";
let pollTimer: number | null = null;
/** When the browser last successfully loaded prices.json */
let lastClientCheckAt: number | null = null;
/** lastRun from prices.json (cloud Apple scrape) */
let lastScrapeAt: string | null = null;

export function getPriceFeedStatus(): PriceFeedStatus {
  return status;
}

export function getLastClientCheckAt(): number | null {
  return lastClientCheckAt;
}

export function getLastScrapeAt(): string | null {
  return lastScrapeAt;
}

export function onPriceFeedStatus(cb: (s: PriceFeedStatus) => void): () => void {
  statusListeners.push(cb);
  return () => {
    statusListeners = statusListeners.filter((x) => x !== cb);
  };
}

/** Fires when fetched prices change and the market was reloaded. */
export function onPricesUpdated(cb: () => void): () => void {
  dataListeners.push(cb);
  return () => {
    dataListeners = dataListeners.filter((x) => x !== cb);
  };
}

function setStatus(next: PriceFeedStatus): void {
  status = next;
  notifyStatus();
}

function notifyStatus(): void {
  for (const cb of statusListeners) cb(status);
}

function notifyDataUpdated(): void {
  for (const cb of dataListeners) cb();
}

function payloadSignature(data: FetchedPayload): string {
  const tail = data.records
    .map((r) => `${r.skuId}:${r.date}:${r.price}`)
    .sort()
    .join("|");
  return `${data.lastRun}#${tail}`;
}

/** Load latest prices from the deployed site (no install or CLI required). */
export async function refreshPricesFromServer(): Promise<boolean> {
  const firstLoad = status === "idle";
  if (firstLoad) setStatus("loading");

  try {
    const res = await fetch(`${PRICES_URL}?_=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as FetchedPayload;
    if (!data.records?.length) throw new Error("empty payload");

    lastClientCheckAt = Date.now();
    lastScrapeAt = data.lastRun || null;

    const sig = payloadSignature(data);
    const changed = sig !== lastPayloadSig;
    lastPayloadSig = sig;

    applyRuntimeFetch(data);
    reloadMarket();
    setStatus("live");
    notifyStatus();

    if (changed) notifyDataUpdated();
    return true;
  } catch {
    if (firstLoad) setStatus("cached");
    notifyStatus();
    return false;
  }
}

export function startAutoPriceRefresh(): void {
  if (pollTimer != null) return;
  void refreshPricesFromServer();
  pollTimer = window.setInterval(() => {
    void refreshPricesFromServer();
  }, PRICE_POLL_MS);
}
