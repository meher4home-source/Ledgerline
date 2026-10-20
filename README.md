# Ledgerline: deploy guide (in this order)

## 1. GitHub: clean start
In your repo, DELETE everything in the root (checkout.js, cron.js, schema_v4.sql, webhook.js, dodo-webhook.js, demo.html, README.md, TEST_PLAN.md, schema.sql, old logos, old app.html, old index.html). Then upload ALL contents of `ledgerline-deploy` (drag the whole folder contents, including the `api` folder). Files in `api/` only work inside a folder named `api`.
Never upload `ledgerline-docs` to the repo. It is for you only.

## 2. Supabase
1. SQL Editor > New query > paste all of `schema.sql` > Run. Run it AGAIN whenever schema.sql is updated (it is safe to re-run). After it runs, Table Editor must show: profiles, invoices, entries, clients, budgets. Do NOT run schema_v4.sql.
2. Authentication > Providers > Email: ON, **Confirm email OFF**. Then Authentication > Users: delete old test users.
3. Authentication > URL Configuration: Site URL `https://YOURDOMAIN`, Redirect URL `https://YOURDOMAIN/app`.
4. Project Settings > API Keys: copy the **Publishable key** (starts with `sb_publishable_`). If you only see legacy keys, copy the **anon** key (starts with `eyJ`). NEVER copy the secret / service_role key into config.js.

## 3. config.js (fill once, never overwrite)
Open `config.js` on GitHub > edit: paste the Publishable key inside the quotes of `SB_KEY` (no spaces). Later also the two Dodo links in `PAY`, plus COMPANY, COUNTRY, SUPPORT_EMAIL. After this, updates to app.html or index.html never touch your keys.

## 4. Vercel
Framework preset: Other. Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DODO_WEBHOOK_SECRET`. Do not set a Node version. Hobby plan is non-commercial: move to Pro (or Cloudflare Pages) before charging.

## 5. Google login (optional, do after email works)
Google Cloud > OAuth consent screen: app name Ledgerline, publish to production. Credentials > OAuth client (Web), redirect URI = callback shown in Supabase > Providers > Google. Paste Client ID and Secret into Supabase.

## 6. Dodo Payments
Create two subscriptions (Growth, Firm), paste the links into config.js. Webhook URL `https://YOURDOMAIN/api/dodo-webhook`, events: payment.succeeded, subscription.active, subscription.renewed, subscription.cancelled. Send a test event.

## 7. Check
Open `https://YOURDOMAIN/check`. Fix every red line it shows. When all green, test signup yourself.
Customers must pay with the same email they signed up with.

## 8. If a user sees "We could not load your account"
The tables are missing (schema.sql not run) or the user was created before it ran. Run schema.sql, then ask the user to refresh; the app repairs the missing profile by itself.
