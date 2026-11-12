# barzi-web

The barzi website. Plain static HTML, no build step.

- `index.html` is the landing page, styled by `site.css` (gig poster style: Bricolage Grotesque + DM Sans, a color per kind of night). `legal.css` styles /privacy, /terms and /support.
- `img/screens/` has the app screens shown on the site. They're rendered from `design-src/screens/*.html` (copied from the gig poster mockup) with `node design-src/render-screens.js`. Swap in real screenshots once the 1.2.0 app is built.
- `img/og.png` is the share image, rendered from `design-src/og.html` with `node design-src/render-og.js` (needs `npx serve -l 4173 .` running).
- `design-src/` is not deployed (`.vercelignore`).
- `fonts/` has Bricolage Grotesque (variable) and DM Sans, self-hosted.
- `vercel.json` sets clean URLs, long caching for images/fonts, and short links: `/download`, `/app`, `/privacy`, `/terms`, `/support`.

## Preview locally

    npx serve .

## Deploy

Hosted on Vercel. Import this repo as a new project (Framework preset: Other, no build command, output directory `.`), then add the domain under Settings > Domains. Every push to `main` deploys.
