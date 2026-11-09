// POST /api/checkout  {plan, billing: "m"|"y", packs}  Authorization: Bearer <Supabase access token>
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, DODO_API_KEY, DODO_PRODUCTS, optional APP_URL, DODO_API_BASE
// Firm is priced per pack of 50 clients: the Firm product price is for ONE pack and the buyer picks how many packs.
//
// DODO_PRODUCTS is now REGION-AWARE so the price charged equals the price shown in the app (PR table in app.html).
//   {"Firm":{"m":{"in":"pdt_in_m","us":"pdt_us_m","uk":"pdt_uk_m","default":"pdt_us_m"},
//            "y":{"in":"pdt_in_y","us":"pdt_us_y","default":"pdt_us_y"}},
//    "Growth":{...same shape...}, "Starter":{...}}
// Region = the country saved on the account at onboarding (in, us, uk, ca, au, ae, sg, gl).
// Local-currency regions: in (INR), uk (GBP), eu (EUR), sg (SGD), ae (AED) each need their own product,
// OR use one product for everyone with {"all":"pdt_..."} when you set the per-country prices in Dodo's Localized Pricing.
// "default" (your USD product) is used for every other country, and for India accounts whose request does not
// come from India (self-declared country alone is not trusted for the cheaper India price).
// The old flat shape {"Firm":{"m":"pdt_1"}} still works (one price for everyone).
const PLANS = ['Starter', 'Growth', 'Firm'];

// Regions that are shown a LOCAL-currency price in the app. For these, never silently charge a different currency:
// if the product for that region is missing the checkout stops with an error instead.
const LOCAL = ['in', 'uk', 'eu', 'sg', 'ae'];
function pick(entry, region) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;           // old flat shape: one price for everyone
  if (entry[region]) return entry[region];
  if (entry.all) return entry.all;                       // one product whose prices are set per country in Dodo (Localized Pricing)
  if (LOCAL.includes(region)) return null;
  return entry.default || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const { SUPABASE_URL: U, SUPABASE_ANON_KEY: A, DODO_API_KEY: K, DODO_PRODUCTS } = process.env;
  const base = process.env.DODO_API_BASE || 'https://live.dodopayments.com';
  if (!U || !A || !K || !DODO_PRODUCTS) return res.status(500).json({ error: 'Payments are not set up yet' });

  const tok = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!tok) return res.status(401).json({ error: 'Please log in again' });
  const auth = { apikey: A, Authorization: `Bearer ${tok}` };
  const ur = await fetch(`${U}/auth/v1/user`, { headers: auth });
  if (!ur.ok) return res.status(401).json({ error: 'Please log in again' });
  const user = await ur.json();

  // The country comes from the database (RLS lets a user read only their own row), never from the request body.
  let country = 'gl';
  try {
    const pr = await fetch(`${U}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=country`, { headers: auth });
    const rows = pr.ok ? await pr.json() : [];
    if (Array.isArray(rows) && rows[0] && /^[a-z]{2}$/.test(rows[0].country || '')) country = rows[0].country;
  } catch { /* keep 'gl' */ }
  const ip = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();     // set by Vercel; empty in local dev
  const region = country === 'in' && ip && ip !== 'IN' ? 'default' : country;

  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const plan = PLANS.includes(b.plan) ? b.plan : null, bill = b.billing === 'y' ? 'y' : 'm';
  let prods = {}; try { prods = JSON.parse(DODO_PRODUCTS); } catch { /* ignore */ }
  const pid = plan && pick(prods[plan] && prods[plan][bill], region);
  if (!pid) return res.status(400).json({ error: bill === 'y' ? 'The yearly plan is not available yet' : 'This plan is not available yet' });

  const packs = plan === 'Firm' ? Math.min(20, Math.max(1, parseInt(b.packs, 10) || 1)) : 1;
  const origin = process.env.APP_URL || `https://${req.headers.host}`;
  const r = await fetch(`${base}/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_cart: [{ product_id: pid, quantity: packs }],
      customer: { email: user.email, name: String(user.email).split('@')[0] },
      metadata: { user_id: user.id, plan, billing: bill, packs: String(packs), region },
      return_url: `${origin}/app`,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.checkout_url) return res.status(502).json({ error: 'Could not start checkout. Please try again.' });
  return res.status(200).json({ url: j.checkout_url });
}
