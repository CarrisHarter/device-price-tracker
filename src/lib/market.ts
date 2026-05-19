import type { AppleSku } from "../data/apple-skus";
import { APPLE_SKUS } from "../data/apple-skus";
import { publicHistoryBySku } from "../data/public-price-history";
import type { PricePoint } from "./forecast";

export interface LiveSku {
  sku: AppleSku;
  listPrice: number;
  history: PricePoint[];
  lastChange: number;
}

let market = buildMarket();

function syncFromHistory(live: LiveSku): void {
  const last = live.history.at(-1);
  const prev = live.history.at(-2);
  live.listPrice = last?.price ?? live.sku.listPrice;
  if (last && prev && prev.price > 0) {
    live.lastChange = ((last.price - prev.price) / prev.price) * 100;
  } else {
    live.lastChange = 0;
  }
}

function buildMarket(): Map<string, LiveSku> {
  const publicBySku = publicHistoryBySku();
  const map = new Map<string, LiveSku>();
  for (const sku of APPLE_SKUS) {
    const history = publicBySku.get(sku.id) ?? [
      { t: Date.now(), price: sku.listPrice },
    ];
    const live: LiveSku = {
      sku,
      listPrice: sku.listPrice,
      history,
      lastChange: 0,
    };
    syncFromHistory(live);
    map.set(sku.id, live);
  }
  return map;
}

export function getMarket(): Map<string, LiveSku> {
  return market;
}

export function reloadMarket(): void {
  market = buildMarket();
}

/** @deprecated use getMarket() */
export function createMarket(): Map<string, LiveSku> {
  return buildMarket();
}
