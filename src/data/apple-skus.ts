export type AppleCategory =
  | "macbook"
  | "mac-desktop"
  | "ipad"
  | "display";

export interface AppleSku {
  id: string;
  name: string;
  partNumber: string;
  category: AppleCategory;
  /** Japan on-sale date (Apple Store Japan). */
  releaseDate: string;
  listPrice: number;
  appleStoreUrl: string;
}

export const CATEGORY_LABELS: Record<AppleCategory | "all", string> = {
  all: "All products",
  macbook: "MacBook",
  "mac-desktop": "Mac desktop",
  ipad: "iPad",
  display: "Displays",
};

export const APPLE_SKUS: AppleSku[] = [
  {
    id: "mba-13-m4",
    name: 'MacBook Air 13" M4',
    partNumber: "Standard (10-core CPU)",
    category: "macbook",
    releaseDate: "2025-03-12",
    listPrice: 164800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/macbook-air",
  },
  {
    id: "mba-15-m4",
    name: 'MacBook Air 15" M4',
    partNumber: "Standard (10-core CPU)",
    category: "macbook",
    releaseDate: "2025-03-12",
    listPrice: 198800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/macbook-air",
  },
  {
    id: "mbp-14-m4",
    name: 'MacBook Pro 14" M4',
    partNumber: "M4 · 16GB · 512GB",
    category: "macbook",
    releaseDate: "2024-11-08",
    listPrice: 248800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/macbook-pro",
  },
  {
    id: "mbp-16-m4",
    name: 'MacBook Pro 16" M4 Pro',
    partNumber: "M4 Pro · 24GB · 512GB",
    category: "macbook",
    releaseDate: "2024-11-08",
    listPrice: 398800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/macbook-pro",
  },
  {
    id: "mac-mini-m4",
    name: "Mac mini M4",
    partNumber: "M4 · 16GB · 256GB",
    category: "mac-desktop",
    releaseDate: "2024-11-08",
    listPrice: 94800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/mac-mini",
  },
  {
    id: "mac-mini-m4-pro",
    name: "Mac mini M4 Pro",
    partNumber: "M4 Pro · 24GB · 512GB",
    category: "mac-desktop",
    releaseDate: "2024-11-08",
    listPrice: 218800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/mac-mini",
  },
  {
    id: "imac-24-m4",
    name: 'iMac 24" M4',
    partNumber: "M4 · 16GB · 256GB",
    category: "mac-desktop",
    releaseDate: "2024-11-08",
    listPrice: 198800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/imac",
  },
  {
    id: "mac-studio-m4",
    name: "Mac Studio M4 Max",
    partNumber: "M4 Max · 36GB · 1TB",
    category: "mac-desktop",
    releaseDate: "2025-03-12",
    listPrice: 328800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/mac-studio",
  },
  {
    id: "ipad-pro-11",
    name: 'iPad Pro 11" M4',
    partNumber: "Wi-Fi 256GB",
    category: "ipad",
    releaseDate: "2024-05-15",
    listPrice: 168800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-ipad/ipad-pro",
  },
  {
    id: "ipad-pro-13",
    name: 'iPad Pro 13" M4',
    partNumber: "Wi-Fi 256GB",
    category: "ipad",
    releaseDate: "2024-05-15",
    listPrice: 218800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-ipad/ipad-pro",
  },
  {
    id: "ipad-air-13",
    name: 'iPad Air 13" M3',
    partNumber: "Wi-Fi 128GB",
    category: "ipad",
    releaseDate: "2025-03-12",
    listPrice: 128800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-ipad/ipad-air",
  },
  {
    id: "studio-display",
    name: "Studio Display",
    partNumber: "Standard glass",
    category: "display",
    releaseDate: "2026-03-11",
    listPrice: 269800,
    appleStoreUrl: "https://www.apple.com/jp/shop/buy-mac/studio-display",
  },
];

const RELEASE_MS = new Map(
  APPLE_SKUS.map((s) => [s.id, Date.parse(s.releaseDate)])
);

export function releaseMsForSku(skuId: string): number {
  return RELEASE_MS.get(skuId) ?? 0;
}
