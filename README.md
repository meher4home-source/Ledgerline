# Ledgerline: final setup

## Every update (4 steps)
1. GitHub: replace the files from `ledgerline-deploy` (keep the `api` folder). `config.js`: fill `SB_KEY` once and never re-upload it.
2. Supabase > SQL Editor: paste ALL of `schema.sql` and Run (safe to run again).
3. Open `https://YOURDOMAIN/check` and fix every red line. After launch delete `check.html`.
4. Test: sign up, add an invoice, open Share with client.

## First-time only
- Supabase Authentication: turn on CAPTCHA (Cloudflare Turnstile) and put the site key in `config.js` as `TS: "..."`. Before real launch turn Confirm email ON and add free SMTP (Resend). URL Configuration: Site URL = your domain, Redirect URL = `https://YOURDOMAIN/app`.
- Vercel variables: SUPABASE_URL, SUPABASE_ANON_KEY (publishable key), SUPABASE_SERVICE_KEY, DODO_API_KEY, DODO_WEBHOOK_SECRET, DODO_PRODUCTS.
  DODO_PRODUCTS is region-aware: one Dodo product per plan, billing period and region, so the price charged equals the price shown in the app (the `PR` table in app.html).
  {"Firm":{"m":{"in":"pdt_..","us":"pdt_..","default":"pdt_.."},"y":{"in":"pdt_..","us":"pdt_..","default":"pdt_.."}},
   "Growth":{"m":{"in":"pdt_..","us":"pdt_..","default":"pdt_.."}},"Starter":{"m":{"in":"pdt_..","us":"pdt_..","default":"pdt_.."}}}
  The Firm product price is for ONE pack of 50 clients. Buyers choose how many packs.
  Currencies: Dodo supports EUR and GBP natively, and SGD, AED and INR too. Pick ONE of two setups:
  (A) Easiest: one product per plan and billing period, with Localized Pricing in Dodo (Settings, then Localized Pricing) so each country pays the exact price below. Use the same product id for everyone: {"Firm":{"m":{"all":"pdt_.."},"y":{"all":"pdt_.."}},"Growth":{"m":{"all":"pdt_.."}},"Starter":{"m":{"all":"pdt_.."}}}
  (B) One product per currency: keys `in`, `uk`, `eu`, `sg`, `ae` and `default` (USD, used for the US, Canada, Australia and every other country). If a local region (in, uk, eu, sg, ae) has no product and no `all`, checkout stops with an error instead of charging a different currency.
  Price table (must match what Dodo charges): USD 12 / 59 / 199 · GBP 9 / 45 / 149 · EUR 11 / 55 / 185 · SGD 15 / 79 / 269 · AED 45 / 219 / 729 · INR 299 / 1,499 / 4,999 (Personal / Business / Accountant for up to 50 clients). Test one purchase per currency before announcing.
  India accounts whose request does not come from India are charged the `default` (USD) product, or the `all` product.
  The old flat format ({"Firm":{"m":"pdt_.."}}) still works but charges everyone the same.
- Dodo webhook: `https://YOURDOMAIN/api/dodo-webhook`, events payment.succeeded, subscription.active, subscription.renewed, subscription.cancelled, subscription.expired, subscription.on_hold.
- Optional automatic reminder emails: free Resend account, verify your sending domain, then add RESEND_API_KEY, REMIND_FROM ("Ledgerline <reminders@yourdomain.com>") and CRON_SECRET in Vercel. A daily job runs by itself (`vercel.json`). Without these the switch in the app does nothing.
- Use the patched `api/reminders.js` (daily cap, one query per account, opt-out line). Vercel Hobby is for non-commercial use. Move to Pro (or Cloudflare Pages) before you charge customers.

## Referrals
`select email, problems from profiles where problems::text like '%ref:%';` The code is the first 8 characters of the referrer's user id. Give the referrer a free month by hand.

## Not covered yet
Team logins, bank feeds, GST/TDS filing, payroll legal rules, legally binding e-signatures (the portal sign-off is a simple confirmation: name and time).
