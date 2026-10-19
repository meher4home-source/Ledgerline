# Ledgerline: setup (no errors if you follow this order)

## 1. Supabase (free)
1. supabase.com > New project. Save the database password.
2. SQL Editor > New query > paste all of `schema.sql` > Run. (Safe to run again.)
3. Authentication > Providers > Email: ON. **Turn "Confirm email" OFF.** (This removes the email step, so signup is one click and no email errors.)
4. Authentication > URL Configuration: Site URL = `https://YOURDOMAIN.com`. Redirect URLs = `https://YOURDOMAIN.com/app`.
5. Project Settings > API: copy Project URL and anon public key.

## 2. Google login (optional but recommended)
Google Cloud > OAuth consent screen (publish to production) > Credentials > OAuth client (Web). Redirect URI = the callback URL shown in Supabase > Providers > Google. Paste Client ID and Secret into Supabase and enable.

## 3. Files
- `app.html`: replace `SB_URL`, `SB_KEY` (anon key only). Put Dodo checkout links in `PAY` (keys: Growth, Firm, Starter).
- `terms.html`, `privacy.html`: fill the [brackets].
- `robots.txt`, `sitemap.xml`: replace YOURDOMAIN.com.

## 4. Vercel
Push these files to the repo root. Framework preset: Other. Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DODO_WEBHOOK_SECRET`. Do not set a Node version.

## 5. Dodo Payments
Create Growth and Firm subscriptions, paste links in `PAY`. Webhook: `https://YOURDOMAIN.com/api/dodo-webhook`, events `payment.succeeded`, `subscription.active`, `subscription.cancelled`. Send a test event.

Notes: Vercel Hobby is non-commercial; move to Pro or Cloudflare Pages before charging. Customers must pay with the same email they signed up with.
