// GET /api/reminders  (Vercel Cron, once a day). Sends polite overdue-invoice emails for users who switched reminders on.
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, REMIND_FROM ("Ledgerline <reminders@yourdomain.com>"), CRON_SECRET (required)
// Optional: REMIND_DAILY_CAP (default 90 -> fits Resend free plan's 100/day; raise after upgrading), REMIND_BUDGET_MS (default 8000)
// Without the required env vars it does nothing.
const SYM = { in: '₹', us: '$', uk: '£', ca: 'C$', au: 'A$', ae: 'AED ', sg: 'S$', gl: '$' };
const esc = s => String(s ?? '').replace(/[\r\n]+/g, ' ').slice(0, 200);
const PER_USER = 20, BATCH = 5;

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K, RESEND_API_KEY: R, REMIND_FROM: F } = process.env;
  if (!U || !K || !R || !F) return res.status(200).json({ ok: true, skipped: 'not configured' });
  const CAP = Number(process.env.REMIND_DAILY_CAP) || 90, BUDGET = Number(process.env.REMIND_BUDGET_MS) || 8000, t0 = Date.now();
  const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
  const iso = d => d.toISOString().slice(0, 10), now = new Date(), cut = iso(new Date(now - 7 * 864e5)), today = iso(now);

  const pr = await fetch(`${U}/rest/v1/profiles?auto_remind=eq.true&select=id,email,business,country,status,trial_ends_at`, { headers: H });
  const plist = await pr.json();
  const owners = {}; for (const p of Array.isArray(plist) ? plist : []) if (p.status === 'active' || new Date(p.trial_ends_at) > now) owners[p.id] = p;
  // shuffle so the daily cap never favours the same accounts every day
  const ids = Object.keys(owners).sort(() => Math.random() - 0.5);
  if (!ids.length) return res.status(200).json({ ok: true, sent: 0 });

  let sent = 0;
  const send = async (x, o) => {
    const to = String(x.contact).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return false;
    const amount = (SYM[o.country] || '$') + Number(x.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const biz = esc(o.business || 'your supplier');
    const text = `Hello ${esc(x.client)},\n\nThis is a friendly reminder from ${biz} that invoice ${esc(x.number)} dated ${x.issue_date} for ${amount} is still unpaid.\nIf you have already paid, please ignore this message.\n\nTo reply, write to ${esc(o.email)}.\nTo stop these reminders, reply and ask ${biz} to switch them off.\n\nSent on behalf of ${biz} via Ledgerline. If this was sent to you by mistake, reply and let them know.`;
    const mr = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${R}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: F, to: [to], reply_to: o.email, subject: `Payment reminder: invoice ${esc(x.number)}`, text,
        headers: { 'List-Unsubscribe': `<mailto:${esc(o.email)}?subject=Stop%20reminders>` } }) });
    if (!mr.ok) return false;
    // email is out: record it. If this write fails we still count the send (so the cap stays honest).
    await fetch(`${U}/rest/v1/invoices?id=eq.${x.id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ reminders_sent: x.reminders_sent + 1, last_reminder: today }) });
    return true;
  };

  for (const id of ids) {
    if (sent >= CAP || Date.now() - t0 > BUDGET) break;
    // per-owner query: one account with hundreds of old invoices can no longer block everyone else
    const ir = await fetch(`${U}/rest/v1/invoices?user_id=eq.${id}&status=eq.unpaid&issue_date=lte.${cut}&reminders_sent=lt.3&contact=like.*@*&or=(last_reminder.is.null,last_reminder.lte.${cut})&select=id,number,client,contact,total,issue_date,reminders_sent&order=issue_date.asc&limit=${PER_USER}`, { headers: H });
    const rows = await ir.json();
    if (!Array.isArray(rows)) continue;
    for (let i = 0; i < rows.length; i += BATCH) {
      if (sent >= CAP || Date.now() - t0 > BUDGET) break;
      const chunk = rows.slice(i, i + BATCH).slice(0, CAP - sent);
      const results = await Promise.all(chunk.map(x => send(x, owners[id]).catch(() => false)));
      sent += results.filter(Boolean).length;
    }
  }
  return res.status(200).json({ ok: true, sent, capped: sent >= CAP });
}
