// POST /api/dodo-webhook (Dodo Payments, Standard Webhooks signing)
// Env: DODO_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY
// The account and plan come from the metadata that api/checkout.js attached, so any payer email works.
import crypto from 'node:crypto';
export const config = { api: { bodyParser: false } };
const raw = req => new Promise((ok, no) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', no); });
const MAP = { 'payment.succeeded': 'active', 'subscription.active': 'active', 'subscription.renewed': 'active', 'subscription.cancelled': 'cancelled', 'subscription.expired': 'cancelled', 'subscription.on_hold': 'past_due', 'subscription.failed': 'past_due' };
const PLANS = ['Starter', 'Growth', 'Firm'], UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = await raw(req), h = req.headers;
  const id = String(h['webhook-id'] || ''), ts = String(h['webhook-timestamp'] || ''), sigs = String(h['webhook-signature'] || '');
  if (!(Math.abs(Date.now() / 1000 - Number(ts)) < 300)) return res.status(401).json({ error: 'stale or missing timestamp' });
  const key = Buffer.from((process.env.DODO_WEBHOOK_SECRET || '').replace(/^whsec_/, ''), 'base64');
  const mac = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body.toString('utf8')}`).digest('base64');
  const ok = sigs.split(' ').some(s => { const a = Buffer.from(s.split(',')[1] || ''), b = Buffer.from(mac); return a.length === b.length && crypto.timingSafeEqual(a, b); });
  if (!ok) return res.status(401).json({ error: 'bad signature' });

  const ev = JSON.parse(body.toString('utf8')), status = MAP[ev.type];
  if (!status) return res.status(200).json({ ok: true, skipped: true });
  const md = (ev.data && ev.data.metadata) || {}, uid = UUID.test(md.user_id || '') ? md.user_id : null;
  const email = String(ev.data?.customer?.email || '').toLowerCase();
  const filter = uid ? `id=eq.${uid}` : email ? `email=eq.${encodeURIComponent(email)}` : null;
  if (!filter) return res.status(200).json({ ok: true, skipped: 'no account' });
  const patch = { status }; if (status === 'active' && PLANS.includes(md.plan)) patch.plan = md.plan;
  const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K } = process.env;
  const r = await fetch(`${U}/rest/v1/profiles?${filter}`, {
    method: 'PATCH',
    headers: { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}
