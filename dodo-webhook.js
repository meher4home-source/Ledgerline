// POST /api/dodo-webhook : verifies the Standard Webhooks signature, then sets status/paid_plan.
// Env: DODO_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY,
//      PRODUCT_PLANS e.g. {"pdt_a":"Starter","pdt_b":"Growth","pdt_c":"Firm","pdt_d":"Growth"}  (product id -> plan)
import crypto from 'node:crypto';
export const config = { api: { bodyParser: false } };
const raw = req => new Promise((ok, no) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c).toString('utf8'))); req.on('error', no); });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function verify(body, h) {
  const id = h['webhook-id'], ts = h['webhook-timestamp'], sig = h['webhook-signature'];
  if (!id || !ts || !sig || Math.abs(Date.now() / 1000 - +ts) > 300) return false;
  const key = Buffer.from(String(process.env.DODO_WEBHOOK_SECRET || '').replace(/^whsec_/, ''), 'base64');
  const exp = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return String(sig).split(' ').some(p => { const a = Buffer.from(p.split(',')[1] || ''), b = Buffer.from(exp); return a.length === b.length && crypto.timingSafeEqual(a, b); });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = await raw(req);
  if (!verify(body, req.headers)) return res.status(401).json({ error: 'bad signature' });
  const ev = JSON.parse(body), d = ev.data || {};
  const ON = ['subscription.active', 'subscription.renewed'];
  const OFF = ['subscription.cancelled', 'subscription.expired', 'subscription.failed', 'subscription.on_hold'];
  if (!ON.includes(ev.type) && !OFF.includes(ev.type)) return res.status(200).json({ ok: true });

  let plans = {}; try { plans = JSON.parse(process.env.PRODUCT_PLANS || '{}'); } catch {}
  const uid = d.metadata && d.metadata.user_id, email = String((d.customer && d.customer.email) || '').toLowerCase();
  const filter = UUID.test(uid || '') ? `id=eq.${uid}` : email ? `email=eq.${encodeURIComponent(email)}` : null;
  if (!filter) return res.status(200).json({ ok: true, skipped: 'no user' });
  const patch = ON.includes(ev.type) ? { status: 'active', ...(plans[d.product_id] ? { paid_plan: plans[d.product_id] } : {}) } : { status: 'cancelled' };

  const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K } = process.env;
  const r = await fetch(`${U}/rest/v1/profiles?${filter}`, { method: 'PATCH',
    headers: { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok }); // non-200 makes Dodo retry
}
