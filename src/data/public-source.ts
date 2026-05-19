/** Public Japan retail data only — no private MSP or distributor pricing */
export const PUBLIC_SOURCE = {
  region: "Japan",
  locale: "en-US",
  currency: "JPY",
  name: "Apple Store Japan (tax-included list price)",
  short: "Apple Japan list",
  url: "https://www.apple.com/jp/shop",
  lastVerified: "2026-05-01",
  references: [
    "Apple Store Japan (apple.com/jp)",
    "Apple Newsroom Japan (product launches & pricing)",
  ],
  note: "Prices shown are published Apple Japan tax-included list prices only.",
} as const;
