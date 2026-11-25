# Ledgerline: audit, changes and launch plan

Based on the files I received: `app.html`, `demo.html`, `index.html`, `check.html`, `checkout.js`, `README.md`.
**Not received, so NOT audited:** `schema.sql`, `api/dodo-webhook.js`, `config.js`, `vercel.json`, `terms`, `privacy`, the portal page. I could not open the live site or the database.

## 1. Existing application audit
**Working** (confirmed in code; I opened all 26 screens and all 30 tools in a test run: no JS errors, no NaN or undefined):
invoices, cash book, financial statements, recurring entries and invoices, tax summary, bank reconciliation (CSV), client report, share-with-client link, insights, deadlines calendar, inventory, purchases, fixed assets, projects, customers, marketing, employees, loans, investments, insurance, branding, saved documents (5 MB per file), 30 accounting tools, CSV and JSON export, client workspaces (50 per pack), referral link.

**Partly working / depends on setup:**
- Automatic overdue-invoice emails: only if Resend keys are set (README). The app now shows this as "not available yet" unless `REMINDERS:true` is in `config.js`.
- Payments: depends on Dodo products and webhook. Not testable by me.
- Yearly billing: depends on yearly Dodo products existing.

**Not built:** bank feeds, team logins, GST/TDS filing, legal e-signatures, central admin dashboard, role-based access, audit logs, bulk onboarding, SLA tooling, automatic free-tier usage warnings (Supabase does not expose usage to the browser; check Dashboard > Usage monthly).

## 2. Changes made
- Removed or corrected false or misleading text (reminders, "coming soon" contradictions, "sign-off", "Pay yearly and save", ROI calculator defaults, payroll wording).
- Pricing table now matches the app's own price list and plan contents.
- Positioning changed to "Online bookkeeping software for businesses, accountants and institutional partners".
- 3D skin on all pages; new logo.
- No existing feature or database structure was removed or changed.

## 3. New pages and features
Home, Accountants, Enterprise, Partners, Government, Pricing, Contact (with working enquiry form), and `templates.html` (operator-only: subscription proposal, bulk quotation, paid pilot proposal, subscription agreement, invoice, partnership proposal; print to PDF).
Business details and prices live in `site-config.js`. Enquiries go to one new table (`enquiries.sql`). If the form cannot save, it says so plainly and offers an email link. It never shows "sent" unless the database confirmed it.

## 4. Still not built
See section 1 "Not built". The Enterprise page lists these openly as "not built yet".

## 5. Actual operating cost
| Item | Today | When you charge customers |
|---|---|---|
| Vercel | Hobby: $0 | **Hobby is non-commercial only. Selling on it breaks Vercel's terms.** Pro is about $20/month (check vercel.com/pricing) |
| Supabase | Free: $0 | Free works but see section 6. Pro is $25/month |
| Dodo Payments | no monthly fee I know of | per-sale fee. Check current rate on their site |
| Domain | `.vercel.app` free | custom domain optional, yearly cost |
| Resend, Turnstile | free tiers | only if you switch reminders or CAPTCHA on |

**Zero-cost is not possible while taking payments on Vercel.** Two honest options: (a) take the first advance payment, then buy Vercel Pro; (b) move to Cloudflare Pages (free plan, check its commercial terms). Option (b) means rewriting `api/checkout.js` and `api/dodo-webhook.js`, and I have not done that.

## 6. Free-tier limits (checked online, July to September 2026 sources)
Supabase Free: 500 MB database, 1 GB file storage (all customers' documents share this), 5 GB egress, 50,000 monthly users, **auto-pause after 7 days of no activity, no daily backups**. Pro ($25/month) removes the pause and adds daily backups.
Until you upgrade: take a manual export of the database every week, and do not sign a contract that promises uptime or backups.

## 7. Security gaps
1. **Row-level security and the schema are unreviewed.** Before any paid customer, confirm each table has RLS so one customer can never read another's rows. This is the most important check.
2. Trial expiry and plan limits may only be enforced in the browser. I could not see the server side.
3. Enquiry form: honeypot, length limits and a 1-per-minute browser check only. A script can bypass them. Cloudflare Turnstile (free) is not wired in.
4. `check.html` is public and tells visitors what is misconfigured. Delete it after launch (README says so).
5. `terms` and `privacy` pages should be updated to mention enquiry data. I did not see them.
6. Referral credit is manual.
7. The Firm pack selector in the app goes up to 500 clients (10 packs); checkout allows 1,000.

## 8. Pricing: a mismatch you must resolve before publishing bulk prices
Your self-serve Accountant plan: ₹4,999/month per 50 clients = **₹59,988/year per 50 workspaces = about ₹1,200 per workspace per year.**
Your proposed bulk prices per business per year: 100 for ₹2 lakh = ₹2,000; 500 for ₹8 lakh = ₹1,600; 1,000 for ₹15 lakh = ₹1,500.
So a CA can buy 100 workspaces online for ₹1.2 lakh a year, cheaper than your ₹2 lakh "bulk" price. Bulk prices only make sense if each business gets **its own login** (Business plan is ₹17,988/year each, so ₹2,000 is a very large discount), or if the bulk price includes paid onboarding or support.
The ₹15,000 pilot equals 3 months of one 50-client pack (₹14,997), so a pilot that covers only 25 businesses is priced the same as the online pack.
**Decision for you:** define what a "business" is in a bulk licence (workspace under one login, or its own login) and what extra you provide. Until then, `showBulkPrices` stays `false` and the site says "priced by written quotation". Your proposed numbers are saved in `site-config.js`, unpublished.
Also: fulfilling bulk licences is manual today (you activate accounts after payment). That is fine for a 25-business pilot and will not scale to 1,000 without admin tooling. Verify column names against `schema.sql` before running any SQL on `profiles`.

## 9. Steps to start selling
1. Run `enquiries.sql` in Supabase > SQL Editor.
2. Upload all new files to the repo root (pages, `site.css`, `site.js`, `site-config.js`, `fx.css`, `fx.js`, `img/`, `logo.svg`, `app.html`). Keep `config.js` and `api/`.
3. Fill `site-config.js` (email, name, jurisdiction). Add registrations only when you hold them.
4. Open `/check`, then test: sign up, add an invoice, send a contact enquiry, read it in Supabase > Table Editor.
5. Verify RLS (section 7, item 1).
6. Decide hosting (section 5). Do not take customer payments on Hobby.
7. Settle the bulk price structure (section 8), then set `showBulkPrices`.
8. Approach your first buyers: CA and bookkeeping firms, with a paid pilot. Use `templates.html`, have a lawyer review the agreement, ask a CA about GST registration before invoicing.

## 10. Future enterprise requirements (do not advertise until built)
Multi-tenant organisation dashboard, roles, audit logs, bulk onboarding, licence and usage screens, backups and recovery, uptime and support targets, security review. Build only after a paying contract asks for it. Government: DPIIT recognition needs a registered company, LLP or partnership, not a proprietorship; GeM needs its own documents. Verify each on the official portals before you bid.

---
# Addendum: B2B contract plan, new prices, admin workflow

## A. The new intro prices against your own app
- Online Accountant plan: ₹4,999/month per 50 workspaces = ₹59,988/year = ₹1,200 per workspace per year.
- Intro annual pack (invoice): ₹29,999/year per 50 = ₹600 per workspace per year. **That is 50% below your online yearly price.** Both are shown on the pricing page so nobody is misled. A smart buyer will take the invoice offer, so treat ₹29,999 as an introductory acquisition price and write the renewal price into the contract.
- Intro paid pilot: ₹7,500 for 10 workspaces for 30 days = ₹750 per workspace. The online monthly plan gives 50 workspaces for ₹4,999. **The pilot is dearer and smaller than just subscribing monthly**, so it only sells if it carries something extra (set `walkthrough:true` in `site-config.js` only if you will really give one).
- Prices on the site are read from `site-config.js` (`offers`). Keep Dodo products and invoices equal to what the site shows.

## B. What 2 to 4 contracts are worth (annual cash, before tax and your time)
| Scenario | At ₹29,999 per 50 | Platform fee + per-business (see C) |
|---|---|---|
| 4 firms x 100 workspaces | ₹2.4 lakh | ₹7.6 lakh |
| 2 contracts x 500 | ₹6 lakh | ₹11 lakh |
| 1,000 + 500 + 100 | ₹10.6 lakh | ₹16.4 lakh |
| 4 contracts x 500 | ₹12 lakh | ₹22 lakh |
At the intro price you need about 1,700 workspaces for ₹10 lakh a year. 2 to 4 contracts only give "high cashflow" if each contract is 500+ workspaces **or** carries a platform fee. These are arithmetic, not forecasts. No contract is guaranteed.

## C. A contract structure to test (numbers are starting points, not facts)
- Platform fee ₹1,00,000/year: licence codes, onboarding session, usage report, email support.
- Per business per year: ₹900 up to 500 businesses, ₹700 above 500 (about 25% below the online list).
- 100 businesses ≈ ₹1.9 lakh, 500 ≈ ₹5.5 lakh, 1,000 ≈ ₹9 lakh.
- Your ₹8 lakh for 500 is ₹2.5 lakh above this. That gap is only defensible as paid services. At ₹1,500/hour it is about 165 hours (a month of full-time work). Do not sign it unless you can deliver them.
- Minimum commitment (billed even if fewer businesses sign up), quarterly true-up for extra businesses, price escalator at renewal, 50 to 100% advance, no refunds after activation.
- Pay by bank transfer: no gateway fee. Ask a CA about GST registration and the buyer's TDS before the first invoice; plan for the TDS gap in cashflow.

## D. Product to build, only after a signed pilot or advance (zero money, your time)
1. Licence codes: one code per institution with a seat limit and an end date; signup redeems it and activates the plan.
2. Operator page: create licences, see seats used, end dates, renewals. Needs RLS and an admin role. I need `schema.sql` to build it safely.
3. Institution report: counts only (activated, active in last 30 days). Never the members' books.
Until built, activate accounts by hand and say so in the contract.

## E. Admin workflow (built, no public page)
`enquiries.sql` now adds pipeline columns: status (new, contacted, demo, proposal, pilot, won, lost), follow_up_on, proposal_sent_on, pilot_start_on, annual_start_on, amount_inr, payment_status, onboarding_status, notes. You work in Supabase > Table Editor (behind your own login). Visitors can insert enquiries only; they cannot read or change anything. A custom admin page was not built: it needs an admin role and RLS I cannot verify without `schema.sql`.

## F. Spam protection actually in place
Hidden honeypot field, a minimum 3 seconds on the page, one enquiry per minute per browser, input checks, and database length limits. These stop simple bots. A determined script can still post to the table, so check the table sometimes. Cloudflare Turnstile is not wired; it needs a server function to verify.

## G. Text to add to `privacy.html` (I have not seen it)
"If you send an enquiry through our forms, we store your name, email, phone number (optional), company, number of clients, current accounting software, interest in a plan and your message. We use them only to reply to you and manage your enquiry. Ask us by email to delete them."
