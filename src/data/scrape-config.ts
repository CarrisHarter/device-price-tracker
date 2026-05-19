/** How often the open app refetches /prices.json (milliseconds). */
export const PRICE_POLL_MS = 1000;

/** How often the cloud job re-scrapes Apple Store Japan. */
export const SCRAPE_TTL_MS = 60 * 60 * 1000;

export const SCRAPE_TTL_HOURS = SCRAPE_TTL_MS / (60 * 60 * 1000);
