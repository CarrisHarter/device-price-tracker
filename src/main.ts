import "./styles.css";
import { CATEGORY_LABELS, type AppleCategory } from "./data/apple-skus";
import { PUBLIC_SOURCE } from "./data/public-source";
import { getLastFetchRun } from "./data/public-price-history";
import {
  projectFuturePrice,
  formatJpy,
  formatPct,
  type PricePoint,
} from "./lib/forecast";
import { analyzeHistory } from "./lib/history";
import {
  getLastClientCheckAt,
  getLastScrapeAt,
  getPriceFeedStatus,
  onPriceFeedStatus,
  onPricesUpdated,
  startAutoPriceRefresh,
} from "./lib/price-feed";
import { getMarket, type LiveSku } from "./lib/market";
import { renderHowItWorks } from "./views/how-it-works";

type CategoryFilter = AppleCategory | "all";

const HORIZONS = [7, 14, 30] as const;

type AppView = "tracker" | "docs";

let categoryFilter: CategoryFilter = "all";
let appView: AppView = "tracker";
let searchQuery = "";
let horizonDays: (typeof HORIZONS)[number] = 7;

function formatHorizon(days: number): string {
  if (days === 7) return "1 week";
  if (days === 14) return "2 weeks";
  return `${days} days`;
}

function formatRelease(iso: string): string {
  return new Date(iso).toLocaleDateString(PUBLIC_SOURCE.locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString(PUBLIC_SOURCE.locale, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelativeAgo(atMs: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - atMs) / 1000));
  if (sec < 2) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function formatChartDate(d: Date): string {
  return d.toLocaleDateString(PUBLIC_SOURCE.locale, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

interface SparklineTick {
  xPct: number;
  label: string;
}

function chartTicks(history: PricePoint[], count = 5): SparklineTick[] {
  if (history.length === 0) return [];
  const n = history.length;
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(Math.round((i / Math.max(1, count - 1)) * (n - 1)));
  }
  const seen = new Set<number>();
  return indices
    .filter((idx) => {
      if (seen.has(idx)) return false;
      seen.add(idx);
      return true;
    })
    .map((idx) => ({
      xPct: n <= 1 ? 0 : (idx / (n - 1)) * 100,
      label: formatChartDate(new Date(history[idx]!.t)),
    }));
}

function renderSparkline(history: PricePoint[]): string {
  const width = 400;
  const height = 48;
  const path = sparklinePath(history, width, height);
  const ticks = chartTicks(history);
  const axis = ticks
    .map(
      (t) =>
        `<span class="sparkline__tick" style="left:${t.xPct.toFixed(1)}%">${t.label}</span>`
    )
    .join("");

  return `
    <div class="sparkline-wrap">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Apple Japan tax-included price history">
        <path d="${path}" />
      </svg>
      <div class="sparkline__axis" aria-hidden="true">${axis}</div>
    </div>
  `;
}

const app = document.getElementById("app")!;

function sparklinePath(
  history: { price: number }[],
  width: number,
  height: number
): string {
  if (history.length < 2) return "";
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = width / (prices.length - 1);
  return prices
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function bandPosition(value: number, low: number, high: number): number {
  const span = high - low || 1;
  return Math.min(100, Math.max(0, ((value - low) / span) * 100));
}

function formatHistorySpan(history: PricePoint[]): string {
  if (history.length === 0) return "—";
  const first = new Date(history[0]!.t);
  const last = new Date(history.at(-1)!.t);
  const fmt = (d: Date) =>
    d.toLocaleDateString(PUBLIC_SOURCE.locale, {
      month: "short",
      year: "numeric",
    });
  return `${fmt(first)} – ${fmt(last)}`;
}

function renderSkuCard(live: LiveSku): string {
  const { sku, listPrice, history, lastChange } = live;
  const hist = analyzeHistory(history);
  const forecast = projectFuturePrice(history, horizonDays);
  const changeClass =
    lastChange > 0.01 ? "up" : lastChange < -0.01 ? "down" : "flat";
  const projectedDelta =
    listPrice > 0 ? ((forecast.projected - listPrice) / listPrice) * 100 : 0;
  const markerPct = bandPosition(
    forecast.projected,
    forecast.low,
    forecast.high
  );
  const sparkBlock = renderSparkline(history);
  const bandPct = (forecast.variancePct * 100).toFixed(0);

  return `
    <article class="device-card" data-id="${sku.id}">
      <div class="device-card__main">
        <h2>${sku.name}</h2>
        <div class="device-meta">
          <span class="tag">${CATEGORY_LABELS[sku.category]}</span>
          <span class="tag mono">${sku.partNumber}</span>
          <span>Japan release ${formatRelease(sku.releaseDate)} · ${forecast.confidence} confidence</span>
        </div>
        <a class="store-link" href="${sku.appleStoreUrl}" target="_blank" rel="noopener noreferrer">View on Apple Store Japan</a>
      </div>
      <div class="price-block">
        <div class="price-label">Current ${PUBLIC_SOURCE.short}</div>
        <div class="current-price">${formatJpy(listPrice)}</div>
        <div class="price-delta ${changeClass}">
          ${lastChange === 0 ? "Unchanged since last public update" : "Last list change " + formatPct(lastChange)}
        </div>
      </div>
      <div class="history-strip">
        <div class="history-cell">
          <label>History span</label>
          <div class="value small">${formatHistorySpan(history)}</div>
        </div>
        <div class="history-cell">
          <label>30-day average</label>
          <div class="value">${formatJpy(hist.avg30d)}</div>
        </div>
        <div class="history-cell">
          <label>90-day average</label>
          <div class="value">${formatJpy(hist.avg90d)}</div>
        </div>
        <div class="history-cell">
          <label>90-day low / high</label>
          <div class="value">${formatJpy(hist.low90d)} – ${formatJpy(hist.high90d)}</div>
        </div>
      </div>
      <div class="forecast-row">
        <div class="forecast-cell">
          <label>Projected in ${formatHorizon(horizonDays)} (tax incl.)</label>
          <div class="value">${formatJpy(forecast.projected)}</div>
          <div class="range">${formatPct(projectedDelta)} vs today</div>
        </div>
        <div class="forecast-cell">
          <label>Range low</label>
          <div class="value">${formatJpy(forecast.low)}</div>
        </div>
        <div class="forecast-cell">
          <label>Range high</label>
          <div class="value">${formatJpy(forecast.high)}</div>
        </div>
        <div class="forecast-cell">
          <label>Daily trend</label>
          <div class="value">${formatJpy(forecast.trendPerDay)}/day</div>
        </div>
        <div class="forecast-cell">
          <label>Band from history</label>
          <div class="value">±${bandPct}%</div>
        </div>
      </div>
      <div class="variance-band" title="Forecast range from public price history">
        <div class="variance-band__fill" style="left:0;width:100%"></div>
        <div class="variance-band__marker" style="left:${markerPct}%"></div>
      </div>
      <div class="variance-band__labels">
        <span>${formatJpy(forecast.low)}</span>
        <span>±${bandPct}% from history</span>
        <span>${formatJpy(forecast.high)}</span>
      </div>
      ${sparkBlock}
    </article>
  `;
}

function filteredSkus(): LiveSku[] {
  return [...getMarket().values()].filter((live) => {
    if (categoryFilter !== "all" && live.sku.category !== categoryFilter)
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        live.sku.name.toLowerCase().includes(q) ||
        live.sku.partNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

function aggregateStats(skus: LiveSku[]) {
  if (skus.length === 0) {
    return { count: 0, avgNow: 0, avg30: 0, avgFuture: 0, avgDelta: 0 };
  }
  let sumNow = 0;
  let sum30 = 0;
  let sumFuture = 0;
  for (const live of skus) {
    const hist = analyzeHistory(live.history);
    const f = projectFuturePrice(live.history, horizonDays);
    sumNow += live.listPrice;
    sum30 += hist.avg30d;
    sumFuture += f.projected;
  }
  const n = skus.length;
  const avgNow = sumNow / n;
  const avgFuture = sumFuture / n;
  return {
    count: n,
    avgNow,
    avg30: sum30 / n,
    avgFuture,
    avgDelta: avgNow > 0 ? ((avgFuture - avgNow) / avgNow) * 100 : 0,
  };
}

function scrapeStatusLabel(): string {
  const feed = getPriceFeedStatus();
  if (feed === "loading") return "Checking prices…";

  const checked = getLastClientCheckAt();
  const scrapeIso = getLastScrapeAt() ?? getLastFetchRun();

  const parts: string[] = [];
  if (checked != null) {
    parts.push(`Live check ${formatRelativeAgo(checked)} (${formatDateTime(new Date(checked))})`);
  }
  if (scrapeIso) {
    parts.push(`Apple scrape ${formatDateTime(new Date(scrapeIso))}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Apple Japan prices · seed data";
}

function bindControls(): void {
  document.getElementById("nav-tracker")?.addEventListener("click", (e) => {
    e.preventDefault();
    appView = "tracker";
    render();
  });
  document.getElementById("nav-docs")?.addEventListener("click", (e) => {
    e.preventDefault();
    appView = "docs";
    render();
  });
  document.getElementById("category-filter")?.addEventListener("change", (e) => {
    categoryFilter = (e.target as HTMLSelectElement).value as CategoryFilter;
    render();
  });
  document.getElementById("horizon")?.addEventListener("change", (e) => {
    horizonDays = Number(
      (e.target as HTMLSelectElement).value
    ) as typeof horizonDays;
    render();
  });
  document.getElementById("search")?.addEventListener("input", (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    render();
    const input = document.getElementById("search") as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
}

function render(): void {
  if (appView === "docs") {
    app.innerHTML = `
      <header class="layout-header">
        <div>
          <h1>Apple Japan price tracker</h1>
        </div>
        <nav class="app-nav" aria-label="Site">
          <a href="#" id="nav-tracker">Tracker</a>
          <a href="#" id="nav-docs" class="active" aria-current="page">How it works</a>
        </nav>
      </header>
      ${renderHowItWorks()}
    `;
    bindControls();
    return;
  }

  const skus = filteredSkus();
  const stats = aggregateStats(skus);
  const fetchLabel = scrapeStatusLabel();

  app.innerHTML = `
    <header class="layout-header">
      <div>
        <h1>Apple Japan price tracker</h1>
      </div>
      <div class="header-end">
        <nav class="app-nav" aria-label="Site">
          <a href="#" id="nav-tracker" class="active" aria-current="page">Tracker</a>
          <a href="#" id="nav-docs">How it works</a>
        </nav>
        <div class="status-row">
          <span class="source-badge">Public data</span>
          <span class="scrape-status">${fetchLabel}</span>
        </div>
      </div>
    </header>

    <div class="toolbar">
      <label>
        Category
        <select id="category-filter" aria-label="Filter by category">
          ${(["all", "macbook", "mac-desktop", "ipad", "display"] as const)
            .map(
              (c) =>
                `<option value="${c}" ${categoryFilter === c ? "selected" : ""}>${CATEGORY_LABELS[c]}</option>`
            )
            .join("")}
        </select>
      </label>
      <label>
        Forecast
        <select id="horizon" aria-label="Forecast horizon">
          ${HORIZONS.map(
            (d) =>
              `<option value="${d}" ${horizonDays === d ? "selected" : ""}>${formatHorizon(d)}</option>`
          ).join("")}
        </select>
      </label>
      <label>
        Search
        <input type="search" id="search" placeholder="Model name…" value="${searchQuery.replace(/"/g, "&quot;")}" />
      </label>
    </div>

    <section class="summary-strip" aria-label="Summary">
      <div class="summary-card">
        <span>Models</span>
        <strong>${stats.count}</strong>
      </div>
      <div class="summary-card">
        <span>Avg list price (tax incl.)</span>
        <strong>${formatJpy(stats.avgNow)}</strong>
      </div>
      <div class="summary-card">
        <span>30-day average</span>
        <strong>${formatJpy(stats.avg30)}</strong>
      </div>
      <div class="summary-card">
        <span>Projected (${formatHorizon(horizonDays)})</span>
        <strong>${formatJpy(stats.avgFuture)}</strong>
      </div>
      <div class="summary-card">
        <span>Projected change</span>
        <strong>${formatPct(stats.avgDelta)}</strong>
      </div>
    </section>

    <section class="device-grid" aria-live="polite">
      ${
        skus.length === 0
          ? `<p class="empty-state">No models match your filters.</p>`
          : skus.map(renderSkuCard).join("")
      }
    </section>

    <p class="disclaimer">
      ${PUBLIC_SOURCE.note}
      Sources: ${PUBLIC_SOURCE.references.join("; ")}.
      Forecast method: <a href="#" id="nav-docs">How it works</a>.
    </p>
  `;

  bindControls();
}

function init(): void {
  render();
  onPriceFeedStatus(() => {
    if (appView === "tracker") {
      const el = document.querySelector(".scrape-status");
      if (el) el.textContent = scrapeStatusLabel();
    }
  });
  onPricesUpdated(() => {
    if (appView === "tracker") render();
  });
  startAutoPriceRefresh();
}

init();
