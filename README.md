# Apple Japan Price Tracker

Public **Apple Store Japan** tax-included list prices (JPY). Open the deployed site — no install, no CLI, nothing runs on the visitor's device.



## How prices update

A cloud job (`.github/workflows/scrape-and-deploy.yml`) runs every hour:

1. Scrapes Apple Store Japan
2. Updates `prices.json` on the site
3. Redeploys GitHub Pages

Visitors only load the website; their browser reads `/prices.json`.

See **How it works** in the app for details.

