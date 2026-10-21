// Kingsley FM · Inbox. A tiny Cloudflare Worker that receives messages from the site (contact, shop requests, feedback)
// and keeps them in Workers KV until the CMS reads them. The site can only send; reading, marking and deleting need the
// secret key, which only the CMS on your Mac knows.
//
//   POST /submit           from the site: { type, name, email, subject, message, fields, page }   (no key)
//   GET  /list             the CMS: every message, newest first                                     (key)
//   POST /update           the CMS: { key, status: 'new' | 'read' | 'done' | 'archived' }          (key)
//   POST /delete           the CMS: { key }                                                         (key)
//
// Settings (wrangler.toml / the Cloudflare dashboard): a KV binding called INBOX, a secret called KEY, and ORIGINS: the
// site addresses allowed to send, comma separated (e.g. https://iamkingsleey.com,https://iamkingsleey.github.io).

const MAX = { type: 40, name: 120, email: 200, subject: 200, message: 5000, page: 300, field: 600 };
const clip = (v, n) => String(v ?? '').replace(/\u0000/g, '').slice(0, n).trim();

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const allowed = String(env.ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
    const cors = { 'Access-Control-Allow-Origin': allowed.length ? (allowed.includes(origin) ? origin : allowed[0]) : '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Vary': 'Origin' };
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/submit' && req.method === 'POST') {
      if (allowed.length && !allowed.includes(origin)) return J({ error: 'This site may not send here.' }, 403);
      let b; try { b = await req.json(); } catch { return J({ error: 'Not valid JSON.' }, 400); }
      if (b.website) return J({ ok: true });                                   // the hidden field only bots fill in
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown', rk = 'rate:' + ip, n = +(await env.INBOX.get(rk) || 0);
      if (n >= 12) return J({ error: 'Too many messages. Try again in an hour.' }, 429);
      await env.INBOX.put(rk, String(n + 1), { expirationTtl: 3600 });
      const fields = {};
      if (b.fields && typeof b.fields === 'object') Object.entries(b.fields).slice(0, 20).forEach(([k, v]) => { const kk = clip(k, 60); if (kk) fields[kk] = clip(v, MAX.field); });
      const msg = { id: Date.now().toString(36) + '-' + crypto.randomUUID().slice(0, 8), at: new Date().toISOString(), status: 'new',
        type: clip(b.type, MAX.type) || 'Message', name: clip(b.name, MAX.name), email: clip(b.email, MAX.email), subject: clip(b.subject, MAX.subject),
        message: clip(b.message, MAX.message), fields, page: clip(b.page, MAX.page), country: req.cf && req.cf.country || '' };
      if (!msg.message && !Object.keys(fields).length) return J({ error: 'Empty message.' }, 400);
      const key = 'msg:' + String(9e15 - Date.now()).padStart(16, '0') + ':' + msg.id;   // newest first when listed
      await env.INBOX.put(key, JSON.stringify(msg));
      return J({ ok: true, id: msg.id });
    }

    // everything else is the CMS's, behind the key
    if (!env.KEY || req.headers.get('Authorization') !== 'Bearer ' + env.KEY) return J({ error: 'Wrong or missing key.' }, 401);
    if (url.pathname === '/list' && req.method === 'GET') {
      const keys = []; let cursor;
      do { const r = await env.INBOX.list({ prefix: 'msg:', cursor, limit: 1000 }); keys.push(...r.keys.map(k => k.name)); cursor = r.list_complete ? null : r.cursor; } while (cursor && keys.length < 5000);
      const items = (await Promise.all(keys.map(async k => { const v = await env.INBOX.get(k); try { return v && { key: k, ...JSON.parse(v) }; } catch { return null; } }))).filter(Boolean);
      return J({ ok: true, items });
    }
    if (url.pathname === '/update' && req.method === 'POST') {
      const { key, status } = await req.json().catch(() => ({}));
      if (!/^msg:/.test(key || '') || !['new', 'read', 'done', 'archived'].includes(status)) return J({ error: 'Bad request.' }, 400);
      const v = await env.INBOX.get(key); if (!v) return J({ error: 'Not found.' }, 404);
      const m = JSON.parse(v); m.status = status; await env.INBOX.put(key, JSON.stringify(m)); return J({ ok: true });
    }
    if (url.pathname === '/delete' && req.method === 'POST') {
      const { key } = await req.json().catch(() => ({}));
      if (!/^msg:/.test(key || '')) return J({ error: 'Bad request.' }, 400);
      await env.INBOX.delete(key); return J({ ok: true });
    }
    return J({ error: 'Not found.' }, 404);
  }
};
