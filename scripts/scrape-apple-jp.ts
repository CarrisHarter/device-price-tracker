/**
 * CLI: fetch live tax-included prices from Apple Store Japan.
 * Run manually via npm run fetch-prices, or automatically via dev server / prebuild.
 */
import {
  readFetchedFile,
  runAppleJpScrape,
} from "../src/scraper/apple-jp";

async function main(): Promise<void> {
  const existing = readFetchedFile();
  console.log("Apple Store Japan price fetch\n");

  const { file, logs } = await runAppleJpScrape(existing);

  for (const log of logs) {
    if (log.ok) {
      console.log(
        `  ✓ ${log.skuId}: ¥${log.price!.toLocaleString()}`
      );
    } else {
      console.warn(`  ⚠ ${log.skuId}: ${log.error ?? "failed"}`);
    }
  }

  console.log(
    `\nWrote ${file.records.length} records → src/data/fetched-history.json`
  );
  console.log(`Last run: ${file.lastRun}`);
}

main();
