# barzi for bars (owner portal)

The site at **bars.gobarzi.com** where a bar's own people keep its barzi page
current: nights and events, specials, hours and closures, flyers, details, and
their page's stats. Vite + React, talking straight to Supabase (barzi-prod).
RLS and the functions in barzi-ios
`supabase/migrations/20261111000000_bar_owners.sql` decide what each person
can touch. There is no server.

Who can sign in: only emails Matt has added for a bar in the desk
(Owners page). They get a 6-digit code (and a link) by email.

## Run it locally

    cd portal
    cp .env.example .env.local   # paste the publishable key
    npm install
    npm run dev

## Deploy (its own Vercel project)

Vercel > Add New > Project > barzi-web, **Root Directory `portal`**,
framework Vite (vercel.json sets the rest). Environment variables:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Then Settings >
Domains > add `bars.gobarzi.com`.

The landing page (the repo root) is a separate Vercel project and doesn't
change.
