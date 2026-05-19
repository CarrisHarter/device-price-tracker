/** How to pull the base tax-included price from Apple Store Japan buy-flow JSON */
import { APPLE_SKUS } from "./apple-skus";

export interface ScrapeTarget {
  skuId: string;
  shopPath: string;
  pickBasePrice: (selection: AppleSelectionData) => number | null;
  pickFromAmounts?: (amounts: number[]) => number | null;
}

export interface AppleSelectionData {
  mainDisplayValues?: {
    prices?: Record<string, { amount?: number }>;
  };
}

function listPriceFor(skuId: string): number {
  return APPLE_SKUS.find((s) => s.id === skuId)?.listPrice ?? 0;
}

/** Pick the price nearest the catalog base (avoids wrong size/chip on shared buy pages). */
function pickClosestTo(target: number) {
  return (amounts: number[]): number | null => {
    if (!amounts.length || target <= 0) return null;
    return amounts.reduce((best, n) =>
      Math.abs(n - target) < Math.abs(best - target) ? n : best
    );
  };
}

export const SCRAPE_TARGETS: ScrapeTarget[] = [
  {
    skuId: "mba-13-m4",
    shopPath: "/jp/shop/buy-mac/macbook-air",
    pickBasePrice: (d) => minPriceKeys(d, /^13inch-.*-10-8$/),
    pickFromAmounts: pickClosestTo(listPriceFor("mba-13-m4")),
  },
  {
    skuId: "mba-15-m4",
    shopPath: "/jp/shop/buy-mac/macbook-air",
    pickBasePrice: (d) => minPriceKeys(d, /^15inch-.*-10-10$/),
    pickFromAmounts: pickClosestTo(listPriceFor("mba-15-m4")),
  },
  {
    skuId: "mbp-14-m4",
    shopPath: "/jp/shop/buy-mac/macbook-pro",
    pickBasePrice: (d) => minPriceKeys(d, /^14inch-/),
    pickFromAmounts: pickClosestTo(listPriceFor("mbp-14-m4")),
  },
  {
    skuId: "mbp-16-m4",
    shopPath: "/jp/shop/buy-mac/macbook-pro",
    pickBasePrice: (d) => minPriceKeys(d, /^16inch-/),
    pickFromAmounts: pickClosestTo(listPriceFor("mbp-16-m4")),
  },
  {
    skuId: "mac-mini-m4",
    shopPath: "/jp/shop/buy-mac/mac-mini",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("mac-mini-m4")),
  },
  {
    skuId: "mac-mini-m4-pro",
    shopPath: "/jp/shop/buy-mac/mac-mini",
    pickBasePrice: (d) => maxAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("mac-mini-m4-pro")),
  },
  {
    skuId: "imac-24-m4",
    shopPath: "/jp/shop/buy-mac/imac",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("imac-24-m4")),
  },
  {
    skuId: "mac-studio-m4",
    shopPath: "/jp/shop/buy-mac/mac-studio",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("mac-studio-m4")),
  },
  {
    skuId: "ipad-pro-11",
    shopPath: "/jp/shop/buy-ipad/ipad-pro",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("ipad-pro-11")),
  },
  {
    skuId: "ipad-pro-13",
    shopPath: "/jp/shop/buy-ipad/ipad-pro",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("ipad-pro-13")),
  },
  {
    skuId: "ipad-air-13",
    shopPath: "/jp/shop/buy-ipad/ipad-air",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("ipad-air-13")),
  },
  {
    skuId: "studio-display",
    shopPath: "/jp/shop/buy-mac/studio-display",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: pickClosestTo(listPriceFor("studio-display")),
  },
];

function minPriceKeys(
  data: AppleSelectionData,
  pattern: RegExp
): number | null {
  const prices = data.mainDisplayValues?.prices;
  if (!prices) return null;
  const amounts = Object.entries(prices)
    .filter(([k]) => pattern.test(k))
    .map(([, v]) => v.amount)
    .filter((n): n is number => typeof n === "number");
  return amounts.length ? Math.min(...amounts) : null;
}

function minAllPrices(data: AppleSelectionData): number | null {
  return allAmounts(data, Math.min);
}

function maxAllPrices(data: AppleSelectionData): number | null {
  return allAmounts(data, Math.max);
}

function allAmounts(
  data: AppleSelectionData,
  fn: (...values: number[]) => number
): number | null {
  const prices = data.mainDisplayValues?.prices;
  if (!prices) return null;
  const amounts = Object.values(prices)
    .map((v) => v.amount)
    .filter((n): n is number => typeof n === "number");
  return amounts.length ? fn(...amounts) : null;
}
