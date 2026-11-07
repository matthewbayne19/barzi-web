# barzi-web

The barzi website. Plain static HTML, no build step.

- `index.html` is the landing page. Styles are inline.
- `img/` has the screenshots (from the 1.0.1 App Store raw shots), icon, mark and share image (`og.png`).
- `fonts/` has DM Serif Display and DM Sans, self-hosted.
- `vercel.json` sets clean URLs, long caching for images/fonts, and short links: `/download`, `/app`, `/privacy`, `/terms`, `/support`.

## Preview locally

    npx serve .

## Deploy

Hosted on Vercel. Import this repo as a new project (Framework preset: Other, no build command, output directory `.`), then add the domain under Settings > Domains. Every push to `main` deploys.
