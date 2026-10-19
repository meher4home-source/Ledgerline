// POST /api/checkout  (logged-in user) -> returns {url} of a Dodo hosted checkout tied to their user id.
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, DODO_API_KEY, DODO_ENV ("test"|"live"), APP_URL (https://yourdomain.com),
//      PRODUCT_IDS  e.g. {"Starter":"pdt_..","Growth":"pdt_..","Firm":"pdt_..","Growth_year":"pdt_.."}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { SUPABASE_URL: U, SUPABASE_ANON_KEY: A, DODO_API_KEY: K, DODO_ENV, APP_URL, PRODUCT_IDS } = process.env;
  const jwt = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!jwt) return res.status(401).json({ error: 'login required' });
  const ur = await fetch(`${U}/auth/v1/user`, { headers: { apikey: A, Authorization: `Bearer ${jwt}` } });
  if (!ur.ok) return res.status(401).json({ error: 'login required' });
  const user = await ur.json();
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const plan = ['Starter', 'Growth', 'Firm'].includes(b.plan) ? b.plan : 'Growth';
  let ids = {}; try { ids = JSON.parse(PRODUCT_IDS || '{}'); } catch {}
  const pid = (b.yearly && ids[plan + '_year']) || ids[plan];
  if (!pid) return res.status(400).json({ error: 'plan not configured' });
  const base = DODO_ENV === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';
  const r = await fetch(`${base}/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_cart: [{ product_id: pid, quantity: 1 }], customer: { email: user.email },
      return_url: `${APP_URL}/app.html`, metadata: { user_id: user.id, plan } }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.checkout_url) return res.status(502).json({ error: 'checkout failed' });
  return res.status(200).json({ url: d.checkout_url });
}
