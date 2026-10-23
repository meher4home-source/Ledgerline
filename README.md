# Ledgerline: final setup

## 1. GitHub (repo root = contents of `ledgerline-deploy`)
Delete from the repo: old `app_*.html`, `schema*.sql`, `checkout.js`, `cron.js`, `webhook.js`, `dodo-webhook.js` at the root, `demo.html`, `README.md`, `TEST_PLAN.md`, `api/webhook.js`.
Upload everything inside `ledgerline-deploy` (keep the `api` folder). `config.js`: fill `SB_KEY` once, never re-upload.

## 2. Supabase
1. SQL Editor: paste ALL of `schema.sql`, Run. It is safe to re-run and also sets up the private `docs` storage bucket.
2. Authentication > Attack Protection: turn on CAPTCHA, provider Cloudflare Turnstile. Paste the Turnstile secret. Put the Turnstile SITE key in `config.js` as `TS: "0x..."`.
3. Before real launch: Authentication > Providers > Email: Confirm email ON, and add free SMTP (Resend).
4. URL Configuration: Site URL = your domain, Redirect URL = `https://YOURDOMAIN/app`.

## 3. Dodo Payments
Create 3 subscription products (Starter, Growth, Firm), each with a monthly price and optionally a yearly price. Developer > API: create an API key. Webhook URL `https://YOURDOMAIN/api/dodo-webhook`; events: payment.succeeded, subscription.active, subscription.renewed, subscription.cancelled, subscription.expired, subscription.on_hold.

## 4. Vercel environment variables
SUPABASE_URL, SUPABASE_ANON_KEY (the publishable key), SUPABASE_SERVICE_KEY, DODO_API_KEY, DODO_WEBHOOK_SECRET,
DODO_PRODUCTS = {"Starter":{"m":"pdt_..","y":"pdt_.."},"Growth":{"m":"pdt_..","y":"pdt_.."},"Firm":{"m":"pdt_..","y":"pdt_.."}}
Optional: APP_URL, DODO_API_BASE (use https://test.dodopayments.com while testing).

## 5. Check, then remove
Open `/check`, fix every red line. After launch, delete `check.html` from the repo.

## Referrals
A friend who signs up through `?ref=CODE` is stored in `profiles.problems`. To reward a referrer, run in SQL Editor:
`select p.email as friend, p.status, p.problems from profiles p where p.problems::text like '%ref:%';`
The code is the first 8 characters of the referrer's user id. Give the referrer a free month by hand.

## Not covered yet
Email reminders, team logins, bank feeds, GST/TDS filing, payroll legal rules.
