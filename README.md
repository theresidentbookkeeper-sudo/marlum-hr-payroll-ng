# Marlum HR & Payroll

Web app for Marlum Nigeria Ltd: employees, weekly casual payroll, payroll
cycles, attendance, loans, payslips. Supabase backend, Cloudflare hosting.

## Layout
- `public/`      the website (what Cloudflare serves)
  - `index.html` page shell and markup
  - `css/`       styles, loaded in cascade order
  - `js/`        scripts, loaded in the order listed in `index.html` (they share one global scope, so order matters)
  - `_headers`   security and cache headers
- `functions/`   server-side code (payments, secrets): planned
- `supabase/`    database migrations: planned
- `docs/`        architecture and roadmap

## Deploy on Cloudflare Pages
1. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git.
2. Pick this repo, branch `main`.
3. Build command: none. Build output directory: `public`.
4. Supabase dashboard > Authentication > URL Configuration: add the new
   `*.pages.dev` address (and custom domain) to Site URL and Redirect URLs.

## Local preview
`cd public && python3 -m http.server 8080`, then open http://localhost:8080

## Rules
- Never put service keys, bank credentials or tokens in `public/`.
- Test locally before pushing to `main`: pushing deploys.
