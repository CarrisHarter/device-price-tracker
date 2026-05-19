/** How to pull the base tax-included price from Apple Store Japan buy-flow JSON */
export interface ScrapeTarget {
  skuId: string;
  /** Path under apple.com, e.g. /jp/shop/buy-mac/macbook-air */
  shopPath: string;
  /** Return lowest matching config price from productSelectionData */
  pickBasePrice: (selection: AppleSelectionData) => number | null;
  /** Fallback when buy-flow-prices JSON is used (iPad, Studio Display, etc.) */
  pickFromAmounts?: (amounts: number[]) => number | null;
}

export interface AppleSelectionData {
  mainDisplayValues?: {
    prices?: Record<string, { amount?: number }>;
  };
}

export const SCRAPE_TARGETS: ScrapeTarget[] = [
  {
    skuId: "mba-13-m4",
    shopPath: "/jp/shop/buy-mac/macbook-air",
    pickBasePrice: (d) => minPriceKeys(d, /^13inch-.*-10-8$/),
  },
  {
    skuId: "mba-15-m4",
    shopPath: "/jp/shop/buy-mac/macbook-air",
    pickBasePrice: (d) => minPriceKeys(d, /^15inch-.*-10-10$/),
  },
  {
    skuId: "mbp-14-m4",
    shopPath: "/jp/shop/buy-mac/macbook-pro",
    pickBasePrice: (d) => minPriceKeys(d, /^14inch-/),
  },
  {
    skuId: "mbp-16-m4",
    shopPath: "/jp/shop/buy-mac/macbook-pro",
    pickBasePrice: (d) => minPriceKeys(d, /^16inch-/),
  },
  {
    skuId: "mac-mini-m4",
    shopPath: "/jp/shop/buy-mac/mac-mini",
    pickBasePrice: (d) => minAllPrices(d),
  },
  {
    skuId: "mac-mini-m4-pro",
    shopPath: "/jp/shop/buy-mac/mac-mini",
    pickBasePrice: (d) => maxAllPrices(d),
  },
  {
    skuId: "imac-24-m4",
    shopPath: "/jp/shop/buy-mac/imac",
    pickBasePrice: (d) => minAllPrices(d),
  },
  {
    skuId: "mac-studio-m4",
    shopPath: "/jp/shop/buy-mac/mac-studio",
    pickBasePrice: (d) => minAllPrices(d),
  },
  {
    skuId: "ipad-pro-11",
    shopPath: "/jp/shop/buy-ipad/ipad-pro",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: (a) => (a.length ? Math.min(...a) : null),
  },
  {
    skuId: "ipad-pro-13",
    shopPath: "/jp/shop/buy-ipad/ipad-pro",
    pickBasePrice: (d) => maxAllPrices(d),
    pickFromAmounts: (a) => (a.length ? Math.max(...a) : null),
  },
  {
    skuId: "ipad-air-13",
    shopPath: "/jp/shop/buy-ipad/ipad-air",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: (a) => (a.length ? Math.min(...a) : null),
  },
  {
    skuId: "studio-display",
    shopPath: "/jp/shop/buy-mac/studio-display",
    pickBasePrice: (d) => minAllPrices(d),
    pickFromAmounts: (a) => (a.length ? Math.min(...a) : null),
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
