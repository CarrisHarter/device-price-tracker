# Apple Japan Price Tracker

Public **Apple Store Japan** tax-included list prices (JPY). Open the deployed site — no install, no CLI, nothing runs on the visitor's device.

## Live site

After you push to GitHub and enable **Pages → Build and deployment → GitHub Actions**, the workflow deploys automatically:

`https://<your-username>.github.io/<repo-name>/`

## How prices update

A cloud job (`.github/workflows/scrape-and-deploy.yml`) runs every 6 hours:

1. Scrapes Apple Store Japan
2. Updates `prices.json` on the site
3. Redeploys GitHub Pages

Visitors only load the website; their browser reads `/prices.json`.

See **How it works** in the app for details.

## Developing (optional)

Only needed if you change the app itself:

```bash
npm install
npm run dev
```

`public/prices.json` is served in dev (copy of last cloud scrape). The `fetch-prices` script is for the CI job, not for end users.
