// Daily job (Vercel Cron): trial-ending and trial-ended emails via Resend. Each email is sent once.
// Env: CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, MAIL_FROM ("Ledgerline <hello@yourdomain.com>"), APP_URL
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { SUPABASE_URL: U, SUPABASE_SERVICE_KEY: K } = process.env;
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
const get = p => fetch(`${U}/rest/v1/${p}`, { headers: H }).then(r => r.json());
const mark = (id, v) => fetch(`${U}/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ trial_mail: v }) });
const mail = (to, subject, html) => fetch('https://api.resend.com/emails', { method: 'POST',
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html }) });

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const now = new Date().toISOString(), soon = new Date(Date.now() + 3 * 864e5).toISOString(), link = `${process.env.APP_URL}/app.html`;
  let sent = 0;
  const a = await get(`profiles?status=eq.trial&trial_mail=is.null&trial_ends_at=gt.${now}&trial_ends_at=lte.${soon}&select=id,email,name`);
  for (const p of Array.isArray(a) ? a : []) {
    const r = await mail(p.email, 'Your Ledgerline trial ends in 3 days',
      `<p>Hi ${esc(p.name) || 'there'},</p><p>Your free trial ends soon. Your data stays safe and readable. To keep adding invoices and entries, activate a plan (yearly saves 2 months).</p><p><a href="${link}">Open Ledgerline</a></p>`);
    if (r.ok) { await mark(p.id, 'soon'); sent++; }
  }
  const b = await get(`profiles?status=eq.trial&trial_ends_at=lt.${now}&or=(trial_mail.is.null,trial_mail.eq.soon)&select=id,email,name`);
  for (const p of Array.isArray(b) ? b : []) {
    const r = await mail(p.email, 'Your Ledgerline trial has ended',
      `<p>Hi ${esc(p.name) || 'there'},</p><p>Your trial has ended. Your records are safe, and you can still view and export them. Activate a plan to continue.</p><p><a href="${link}">Activate</a></p>`);
    if (r.ok) { await mark(p.id, 'ended'); sent++; }
  }
  return res.status(200).json({ ok: true, sent });
}
