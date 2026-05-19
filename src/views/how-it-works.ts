export function renderHowItWorks(): string {
  return `
    <article class="docs-page">
      <header class="docs-header">
        <h1>How it works</h1>
        <p>How projected prices and ranges are calculated from historical list prices.</p>
      </header>

      <section class="docs-section">
        <h2>Overview</h2>
        <p>
          Each forecast has three parts: a <strong>projected price</strong> at the horizon you select,
          a <strong>low–high range</strong> around it, and a <strong>confidence</strong> label.
          All three come from the same public price history shown on each card.
        </p>
      </section>

      <section class="docs-section">
        <h2>1. Building the history series</h2>
        <p>
          Apple list prices usually stay fixed for months, then step at a launch or price change.
          Between those known dates we assume the price was <strong>unchanged</strong> and sample it
          <strong>once per month</strong>. That gives enough points for regression without pretending
          we had daily quotes when Apple did not publish them.
        </p>
      </section>

      <section class="docs-section">
        <h2>2. Projected price (trend)</h2>
        <p>
          We fit a <strong>least-squares linear regression</strong> through the monthly history
          (time on the x-axis, price on the y-axis). The slope is converted to yen per day.
        </p>
        <p class="docs-formula">projected = current price + (slope × horizon days)</p>
        <p>
          The default horizon is <strong>1 week</strong> (7 days). You can switch to 2 weeks or 30 days;
          the same slope is extrapolated over that window.
        </p>
      </section>

      <section class="docs-section">
        <h2>3. Range band (±%)</h2>
        <p>
          The band is <strong>not</strong> a fixed ±10%. We measure how much prices actually moved
          day-to-day in the history (standard deviation of daily % changes), scale that to the
          selected horizon, then clamp the result between <strong>5% and 12%</strong>.
          If history is too short, we use <strong>10%</strong> as a default.
        </p>
        <p class="docs-formula">low = projected × (1 − band%) · high = projected × (1 + band%)</p>
        <p>
          The marker on each card’s bar is where the projected price sits inside that low–high range.
        </p>
      </section>

      <section class="docs-section">
        <h2>4. Confidence</h2>
        <p>Rule-based on how much history exists:</p>
        <ul>
          <li><strong>High</strong> — at least 12 points and roughly a year or more of span.</li>
          <li><strong>Medium</strong> — at least 6 points and about 90 days of span.</li>
          <li><strong>Low</strong> — anything less (new model or few list-price changes so far).</li>
        </ul>
        <p>
          More stable, longer history makes the trend and volatility estimates more reliable.
        </p>
      </section>

      <section class="docs-section">
        <h2>What this is not</h2>
        <p>
          Projections follow <strong>past public list-price movement</strong>. They do not model
          Apple announcements, FX, or supply. A flat history yields a flat forecast; a recent drop
          slopes the line down. Use the range as a planning bracket, not a quote.
        </p>
      </section>
    </article>
  `;
}
