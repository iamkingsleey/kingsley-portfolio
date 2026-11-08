// Kingsley FM · online CMS. The site's own Worker: every page is still a static file (Cloudflare serves those without
// running this script); only /admin and /site/ come here.
//
//   /admin            the CMS (the same editor as cms/admin), after signing in with a link sent to your email
//   /admin/api/...    what the editor talks to: it reads and saves content/*.json in the GitHub repo, on a branch
//                     called "cms" (your drafts). Publish runs .github/workflows/publish.yml, which brings the drafts
//                     into main, rebuilds the pages and pushes; Cloudflare then deploys as it does for any push.
//   /site/...         pictures for the editor: the live copy, else the draft uploaded to the "cms" branch
//
// Settings (wrangler.toml [vars]): REPO, ADMIN_EMAIL, FROM, GIT_NAME, GIT_EMAIL.
// Secrets (Cloudflare → kingsley-portfolio → Settings → Variables and Secrets): GITHUB_TOKEN (fine-grained, this repo
// only: Contents and Actions read & write), SESSION_SECRET (any long random text), RESEND_KEY, GOATCOUNTER_TOKEN,
// INBOX_KEY (the KEY you gave the inbox Worker). A service binding INBOXW reaches the inbox Worker.
// Free plan throughout: nothing here needs a paid Cloudflare, GitHub or Resend plan.

const EDITABLE = ['cases', 'designs', 'about', 'engineering', 'projects', 'text', 'media', 'site'];
const MEDIA_RE = /\.(jpe?g|png|webp|gif|svg|mp4|webm|mov)(\?|$)/i;
const MEDIA_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.webm', '.mov'];
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
let DRAFT = 'cms';   // the drafts branch (env.DRAFT can name another, for testing)
const SESSION_DAYS = 30, LINK_MINUTES = 15;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname;
    DRAFT = env.DRAFT || 'cms';
    try {
      if (p === '/site' || p.startsWith('/site/')) return await site(req, env, url);
      if (p === '/admin' || p.startsWith('/admin/')) return await admin(req, env, url, ctx);
    } catch (e) {
      return json({ error: 'Something went wrong: ' + (e && e.message || e) }, 500);
    }
    return env.ASSETS.fetch(req);
  }
};

// ---------------------------------------------------------------- small helpers
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h } });
const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function b64utf8(s) {   // UTF-8 text → base64, in chunks so long files don't overflow the call stack
  const b = enc.encode(s); let out = '';
  for (let i = 0; i < b.length; i += 0x8000) out += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(out);
}
async function hmac(env, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const cookie = (req, n) => { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + n + '=([^;]+)')); return m ? m[1] : ''; };

// ---------------------------------------------------------------- GitHub
function gh(env, path, opt = {}) {
  return fetch((env.GH_API || 'https://api.github.com') + '/repos/' + env.REPO + path, { ...opt, headers: {
    ...(env.GITHUB_TOKEN === 'none' ? {} : { 'Authorization': 'Bearer ' + env.GITHUB_TOKEN }), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'KingsleyFM-CMS', ...(opt.headers || {}) } });
}
async function ghJson(env, path, opt) {
  const r = await gh(env, path, opt);
  if (!r.ok) { const t = await r.text(); const e = new Error(`GitHub said ${r.status}: ${(t.match(/"message"\s*:\s*"([^"]+)/) || [])[1] || t.slice(0, 200)}`); e.status = r.status; throw e; }
  return r.status === 204 ? {} : r.json();
}
const raw = (env, path, ref = DRAFT) => gh(env, `/contents/${path}?ref=${ref}`, { headers: { Accept: 'application/vnd.github.raw' } });
async function rawText(env, path, ref = DRAFT) { const r = await raw(env, path, ref); return r.ok ? r.text() : null; }

// the drafts branch: made from main the first time it's needed
async function draft(env) {
  const r = await gh(env, `/git/ref/heads/${DRAFT}`);
  if (r.ok) return (await r.json()).object.sha;
  if (r.status !== 404) throw new Error('GitHub said ' + r.status + ' (check GITHUB_TOKEN)');
  const main = await ghJson(env, '/git/ref/heads/main');
  await ghJson(env, '/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${DRAFT}`, sha: main.object.sha }) });
  return main.object.sha;
}
// keep the drafts up to date with main (a publish, or a push from the Mac): fast-forward when there are no drafts,
// else let GitHub merge main in. Returns the comparison, so callers can see what's waiting to publish.
async function sync(env) {
  await draft(env);
  let c = await ghJson(env, `/compare/main...${DRAFT}`);
  if (c.behind_by > 0) {
    if (c.ahead_by === 0) {
      const main = await ghJson(env, '/git/ref/heads/main');
      await gh(env, `/git/refs/heads/${DRAFT}`, { method: 'PATCH', body: JSON.stringify({ sha: main.object.sha, force: false }) });
    } else {
      const r = await gh(env, '/merges', { method: 'POST', body: JSON.stringify({ base: DRAFT, head: 'main', commit_message: 'CMS: bring in the latest from main' }) });
      if (r.status === 409) { const e = new Error('Your saved changes and the live site changed the same file. Publish from the CMS on your Mac, or ask Claude to merge the "cms" branch.'); e.status = 409; throw e; }
    }
    c = await ghJson(env, `/compare/main...${DRAFT}`);
  }
  return c;
}
const who = env => ({ name: env.GIT_NAME || 'Kingsley', email: env.GIT_EMAIL || 'kingsleymkpandiok@gmail.com' });

// ---------------------------------------------------------------- /site/: pictures for the editor
async function site(req, env, url) {
  const p = decodeURIComponent(url.pathname.replace(/^\/site\/?/, ''));
  if (!p || p === 'index.html' || p === 'home') return Response.redirect(url.origin + '/', 302);
  if (!MEDIA_RE.test(p) || p.includes('..')) return Response.redirect(url.origin + '/' + p + url.search, 302);   // pages and scripts: the live ones
  const live = await env.ASSETS.fetch(new Request(url.origin + '/' + p, { headers: req.headers }));
  if (live.ok || live.status === 304) return live;
  // not live yet: an upload waiting on the drafts branch (the repo is public, so the raw file is too)
  const r = await fetch(`https://raw.githubusercontent.com/${env.REPO}/${DRAFT}/${p.split('/').map(encodeURIComponent).join('/')}`);
  if (!r.ok) return new Response('Not found', { status: 404 });
  const ext = p.split('.').pop().toLowerCase();
  return new Response(r.body, { headers: { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'private, max-age=300' } });
}

// ---------------------------------------------------------------- /admin: sign-in, the editor, its API
async function signedIn(req, env) {
  const v = cookie(req, 'km_admin'); if (!v || !env.SESSION_SECRET) return false;
  const [exp, sig] = v.split('.'); if (!exp || !sig || +exp < Date.now() / 1000) return false;
  return same(sig, await hmac(env, 'session.' + exp));
}

async function admin(req, env, url, ctx) {
  const p = url.pathname;
  const missing = ['GITHUB_TOKEN', 'SESSION_SECRET', 'RESEND_KEY', 'REPO', 'ADMIN_EMAIL'].filter(k => !env[k]);
  if (missing.length) return page('Almost there', `<p>The online CMS needs these settings on the <b>kingsley-portfolio</b> Worker first: <b>${missing.join(', ')}</b>.</p>`);

  // writing requests must come from this site (the cookie is SameSite=Lax too)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const o = req.headers.get('Origin'); if (o && o !== url.origin) return json({ error: 'Not from this site.' }, 403);
  }

  if (p === '/admin/login' && req.method === 'POST') return sendLink(req, env, url);
  if (p === '/admin/auth') {
    const t = url.searchParams.get('t') || '', [exp, sig] = t.split('.');
    if (!exp || !sig || +exp < Date.now() / 1000 || !same(sig, await hmac(env, 'login.' + exp)))
      return page('That link has expired', `<p>Sign-in links work for ${LINK_MINUTES} minutes. Ask for a new one.</p><p><a class="btn" href="/admin/">Back</a></p>`, 401);
    const sexp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400, val = sexp + '.' + await hmac(env, 'session.' + sexp);
    return new Response(null, { status: 302, headers: { Location: '/admin/', 'Set-Cookie': `km_admin=${val}; Path=/admin; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` } });
  }
  if (p === '/admin/logout') return new Response(null, { status: 302, headers: { Location: '/admin/', 'Set-Cookie': 'km_admin=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Lax' } });

  if (!(await signedIn(req, env))) {
    if (p.startsWith('/admin/api/')) return json({ error: 'You were signed out. Reload the page to sign in again.' }, 401);
    return loginPage(url.searchParams.has('sent'));
  }

  if (p.startsWith('/admin/api/')) return api(req, env, url, ctx);
  if (p === '/admin') return Response.redirect(url.origin + '/admin/', 302);

  // the editor's own files (cms/admin, published with the site so they can be served from here)
  const file = p === '/admin/' ? 'index.html' : p.slice('/admin/'.length);
  if (!/^[\w.-]+$/.test(file)) return new Response('Not found', { status: 404 });
  let r = await asset(env, url, '/cms/admin/' + file);
  if (!r.ok) return new Response('Not found', { status: 404 });
  if (file === 'index.html') {
    let h = await r.text();
    h = h.replace('<script src="app.js"></script>', SHIM + '<script src="app.js"></script>');
    return new Response(h, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  return new Response(r.body, { headers: { 'Content-Type': r.headers.get('Content-Type') || 'text/plain', 'Cache-Control': 'no-cache' } });
}
async function asset(env, url, path) {   // follows the clean-address redirects the static files make
  let r, u = url.origin + path;
  for (let i = 0; i < 3; i++) { r = await env.ASSETS.fetch(new Request(u)); if (r.status < 300 || r.status >= 400) break; u = new URL(r.headers.get('Location'), u).href; }
  return r;
}

// a sign-in link to your email; at most 5 an hour
async function sendLink(req, env, url) {
  const cache = caches.default, rk = new Request('https://km-cms.local/login-count');
  const hit = await cache.match(rk), n = hit ? +(await hit.text()) : 0;
  if (n >= 5) return page('Try again in a while', '<p>Too many sign-in links were asked for. Wait an hour, or use one already in your inbox.</p>', 429);
  await cache.put(rk, new Response(String(n + 1), { headers: { 'Cache-Control': 'max-age=3600' } }));
  const exp = Math.floor(Date.now() / 1000) + LINK_MINUTES * 60, link = `${url.origin}/admin/auth?t=${exp}.${await hmac(env, 'login.' + exp)}`;
  let r; try { r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.FROM || 'Kingsley FM CMS <cms@iamkingsleey.com>', to: String(env.ADMIN_EMAIL).split(',').map(s => s.trim()).filter(Boolean),
      subject: 'Sign in to your CMS', text: `Open this link to sign in to the Kingsley FM CMS:\n\n${link}\n\nIt works for ${LINK_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
      html: `<p>Open this link to sign in to the Kingsley FM CMS:</p><p><a href="${link}">Sign in to the CMS</a></p><p style="color:#777">It works for ${LINK_MINUTES} minutes. If you didn't ask for it, ignore this email.</p>` }) }); }
  catch (e) { return page('The email could not be sent', '<p>Resend could not be reached. Try again in a minute.</p>', 502); }
  if (!r.ok) return page('The email could not be sent', `<p>Resend answered ${r.status}. Check RESEND_KEY and FROM on the Worker.</p>`, 502);
  return Response.redirect(url.origin + '/admin/?sent=1', 303);
}

const STYLE = `<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0b;color:#fff;font:15px/1.5 Geist,-apple-system,BlinkMacSystemFont,sans-serif}
.c{width:min(400px,calc(100vw - 32px));background:#141414;border:1px solid #242424;border-radius:18px;padding:32px;box-sizing:border-box}
h1{font-size:22px;font-weight:500;margin:0 0 8px}p{color:#bdbdbd;margin:0 0 18px}b{color:#fff;font-weight:500}.m{font:500 11px "Geist Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8a;margin-bottom:18px}
.btn{display:inline-block;appearance:none;border:0;border-radius:999px;background:#fff;color:#000;font:500 14px inherit;font-family:inherit;padding:11px 18px;cursor:pointer;text-decoration:none}
.btn:active{transform:scale(.97)}</style><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">`;
function page(title, body, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · CMS</title>${STYLE}<div class="c"><div class="m">Kingsley FM · CMS</div><h1>${title}</h1>${body}</div>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
const loginPage = sent => sent
  ? page('Check your email', '<p>A sign-in link is on its way to your inbox. It works for 15 minutes, on this device or any other.</p><form method="post" action="/admin/login"><button class="btn">Send another link</button></form>')
  : page('Sign in', '<p>Get a one-time sign-in link by email.</p><form method="post" action="/admin/login"><button class="btn">Email me a sign-in link</button></form>');

// loaded before the editor: sends its requests here instead of to the Mac's server, and uploads as base64
const SHIM = `<script>
window.KM_ONLINE = true;
(function () {
  var of = window.fetch.bind(window);
  var b64 = function (blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); }); };
  window.fetch = function (u, o) {
    o = o || {};
    if (typeof u === 'string' && u.indexOf('/api/') === 0) {
      u = '/admin' + u;
      if (u.indexOf('/admin/api/upload') === 0 && o.body instanceof Blob) return b64(o.body).then(function (s) { return of(u, Object.assign({}, o, { body: s, headers: { 'X-Body': 'base64', 'Content-Type': 'text/plain' } })); });
    }
    return of(u, o);
  };
  document.addEventListener('DOMContentLoaded', function () {
    var f = document.getElementById('sidefoot'); if (f) f.innerHTML = 'Online · saved to GitHub · <a href="/admin/logout" style="color:inherit">Sign out</a>';
    var s = document.getElementById('save'); if (s) s.textContent = 'Save';
    var v = document.getElementById('view'); if (v) v.href = '/';
  });
})();
</script>
`;

// ---------------------------------------------------------------- the editor's API, online
async function api(req, env, url, ctx) {
  const p = url.pathname.slice('/admin'.length), m = req.method;
  try {
    if (m === 'GET' && p === '/api/content') return content(env);
    if (m === 'GET' && p === '/api/versions') return json(await versions(env));
    if (m === 'GET' && p === '/api/media') return json({ files: await media(env) });
    if (m === 'GET' && p === '/api/protos') return json({ files: await protos(env) });
    if (m === 'GET' && p === '/api/analytics') return json(await analytics(env, Math.max(1, Math.min(366, +(url.searchParams.get('days') || 30)))));
    if (m === 'GET' && p === '/api/inbox') return json(await inbox(env, '/list'));
    if (m === 'POST' && (p === '/api/inbox/update' || p === '/api/inbox/delete')) return json(await inbox(env, p.slice('/api/inbox'.length), await req.json().catch(() => ({}))));
    if (m === 'GET' && p === '/api/status') return json(await status(env));
    if (m === 'GET' && p === '/api/changes') return json(await changes(env));
    if (m === 'PUT' && p.startsWith('/api/content/')) return save(req, env, p.slice('/api/content/'.length));
    if (m === 'PUT' && p === '/api/secrets') return json({ error: 'Online, these keys are kept on Cloudflare: kingsley-portfolio → Settings → Variables and Secrets.' }, 400);
    if (m === 'POST' && p === '/api/build') return json({ ok: true, seconds: 0, log: 'Saved. Online, the pages are rebuilt when you publish.' });
    if (m === 'POST' && p === '/api/publish') return publish(req, env);
    if (m === 'POST' && p === '/api/upload') return upload(req, env, url);
  } catch (e) { return json({ error: e.message || String(e) }, e.status === 401 || e.status === 403 ? 502 : 500); }
  return json({ error: 'not found' }, 404);
}

async function listing(env, dir, ref = DRAFT) {
  const r = await gh(env, `/contents/${dir}?ref=${ref}`);
  if (r.status === 404) return [];
  if (!r.ok) throw new Error('GitHub said ' + r.status);
  return r.json();
}
async function versions(env) {
  await draft(env);
  const files = await listing(env, 'content'), v = {};
  EDITABLE.forEach(n => { const f = files.find(x => x.name === n + '.json'); v[n] = f ? f.sha : ''; });
  return v;
}
// every content file as it is on the drafts branch, joined as text (no parsing, so it stays quick)
async function content(env) {
  await sync(env);
  const v = await versions(env);
  const texts = await Promise.all(EDITABLE.map(n => v[n] ? rawText(env, `content/${n}.json`) : Promise.resolve('{}')));
  const index = await rawText(env, 'cms/build/.index.json');
  const body = '{"content":{' + EDITABLE.map((n, i) => JSON.stringify(n) + ':' + ((texts[i] || '').trim() || '{}')).join(',') + '},"versions":' + JSON.stringify(v)
    + ',"index":' + ((index || '').trim() || '{}') + ',"hasToken":' + !!env.GOATCOUNTER_TOKEN + ',"hasInboxKey":' + !!env.INBOX_KEY + ',"online":true}';
  return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function save(req, env, name) {
  if (!EDITABLE.includes(name)) return json({ error: 'not found' }, 404);
  const base = req.headers.get('X-Base-Version');
  if (base == null) return json({ error: 'This CMS tab is out of date. Reload the page (your saved work is safe), then make the change again.' }, 409);
  let data; try { data = JSON.parse(await req.text()); } catch (e) { return json({ error: 'not valid JSON: ' + e.message }, 400); }
  await draft(env);
  const v = await versions(env);
  if (!req.headers.get('X-Force') && base !== v[name]) return json({ error: 'changed', version: v[name] }, 409);
  const body = { message: `CMS: save ${name}`, content: b64utf8(JSON.stringify(data, null, 1) + '\n'), branch: DRAFT, committer: who(env), author: who(env) };
  if (v[name]) body.sha = v[name];
  const r = await gh(env, `/contents/content/${name}.json`, { method: 'PUT', body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return json({ error: 'changed', version: (await versions(env))[name] }, 409);
  if (!r.ok) return json({ error: 'GitHub said ' + r.status + ': ' + (await r.text()).slice(0, 200) }, 502);
  const j = await r.json();
  return json({ ok: true, version: j.content.sha });
}

async function media(env) {
  await draft(env);
  const t = await ghJson(env, `/git/trees/${DRAFT}:assets?recursive=1`);
  return t.tree.filter(x => x.type === 'blob' && MEDIA_RE.test(x.path) && !/(^|\/)thumbs\//.test(x.path))
    .map(x => ({ path: 'assets/' + x.path, size: x.size || 0, mtime: x.path.startsWith('uploads/') ? 1 : 0 }))
    .sort((a, b) => b.mtime - a.mtime);
}
async function protos(env) {
  return (await listing(env, 'Prototype')).filter(f => /\.html?$/i.test(f.name)).map(f => ({ src: 'Prototype/' + f.name, name: f.name.replace(/\.html?$/i, '').replace(/-/g, ' ') }));
}

async function upload(req, env, url) {
  const name = (url.searchParams.get('name') || 'file').split('/').pop();
  const dot = name.lastIndexOf('.'), ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  if (!MEDIA_EXT.includes(ext)) return json({ error: 'Only pictures and videos: ' + MEDIA_EXT.join(', ') }, 400);
  if (req.headers.get('X-Body') !== 'base64') return json({ error: 'Reload the CMS and upload again.' }, 400);
  const len = +(req.headers.get('Content-Length') || 0);
  if (len > 25 * 1024 * 1024 * 4 / 3 + 16) return json({ error: `This file is ${(len * 3 / 4 / 1048576).toFixed(0)} MB. The site can only publish files up to 25 MB: export a smaller copy (for a video, about 1080px wide) and upload that.` }, 413);
  const stem = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'file';
  const head = await draft(env);
  const taken = new Set((await listing(env, 'assets/uploads')).map(f => f.name));
  let fn = stem + ext, k = 1; while (taken.has(fn)) { k++; fn = `${stem}-${k}${ext}`; }
  // the file goes to GitHub as it streams in (base64 already, from the browser), so big files don't use the Worker's time
  const pre = enc.encode('{"encoding":"base64","content":"'), post = enc.encode('"}');
  let blobBody;
  if (len && req.body) {
    const { readable, writable } = new FixedLengthStream(pre.length + len + post.length);
    const w = writable.getWriter();
    (async () => { await w.write(pre); const rd = req.body.getReader(); for (;;) { const { done, value } = await rd.read(); if (done) break; await w.write(value); } await w.write(post); await w.close(); })();
    blobBody = readable;
  } else blobBody = '{"encoding":"base64","content":"' + (await req.text()) + '"}';
  const blob = await ghJson(env, '/git/blobs', { method: 'POST', body: blobBody, headers: { 'Content-Type': 'application/json' } });
  const path = 'assets/uploads/' + fn;
  for (let tries = 0; tries < 3; tries++) {   // add it to the drafts branch; if something else saved in between, try on top of that
    const tip = tries ? await draft(env) : head;
    const c = await ghJson(env, `/git/commits/${tip}`);
    const tree = await ghJson(env, '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: c.tree.sha, tree: [{ path, mode: '100644', type: 'blob', sha: blob.sha }] }) });
    const nc = await ghJson(env, '/git/commits', { method: 'POST', body: JSON.stringify({ message: 'CMS: upload ' + fn, tree: tree.sha, parents: [tip], author: who(env), committer: who(env) }) });
    const r = await gh(env, `/git/refs/heads/${DRAFT}`, { method: 'PATCH', body: JSON.stringify({ sha: nc.sha, force: false }) });
    if (r.ok) return json({ ok: true, path });
    if (r.status !== 422) return json({ error: 'GitHub said ' + r.status }, 502);
  }
  return json({ error: 'GitHub was busy. Try the upload again.' }, 503);
}

async function publish(req, env) {
  const msg = String((await req.json().catch(() => ({}))).message || '').trim().slice(0, 200) || 'Update content';
  const r = await gh(env, '/actions/workflows/publish.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { message: msg } }) });
  if (!r.ok) return json({ ok: false, log: `GitHub would not start the publish (${r.status}): ${(await r.text()).slice(0, 300)}` });
  return json({ ok: true, log: `Publishing started on GitHub: it brings in your saved changes, rebuilds the pages and puts them live.\nThe site updates in about 2 to 4 minutes.\n\nProgress: https://github.com/${env.REPO}/actions` });
}

async function status(env) {
  await draft(env);
  const c = await ghJson(env, `/compare/main...${DRAFT}`);
  return { ok: true, changes: (c.files || []).map(f => f.filename) };
}

// ---------------------------------------------------------------- inbox (through the inbox Worker)
async function inbox(env, path, body) {
  if (!env.INBOXW || !env.INBOX_KEY) return { configured: false, hasUrl: !!env.INBOXW, hasKey: !!env.INBOX_KEY };
  try {
    const r = await env.INBOXW.fetch(new Request('https://inbox' + path, { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
      headers: { 'Authorization': 'Bearer ' + env.INBOX_KEY, 'Content-Type': 'application/json' } }));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { configured: true, error: j.error || `The inbox answered ${r.status}.` };
    j.configured = true; return j;
  } catch (e) { return { configured: true, error: 'Could not reach the inbox.' }; }
}

// ---------------------------------------------------------------- analytics (GoatCounter)
const count = x => x.count ?? x.count_unique ?? 0;
const SIZES = { phone: 'Phones', largephone: 'Large phones', tablet: 'Tablets', desktop: 'Computers', desktophd: 'Computers (HD)', unknown: 'Unknown' };
async function analytics(env, days) {
  const code = String(await siteCode(env)).replace(/^https?:\/\/|\.goatcounter\.com.*$/g, '');
  const token = env.GOATCOUNTER_TOKEN || '';
  if (!code || !token) return { configured: false, code, hasToken: !!token };
  const day = 86400000, end = new Date(Date.now() + day), start = new Date(end - days * day), iso = d => d.toISOString().slice(0, 10);
  const q = { start: iso(start), end: iso(end) };
  const gc = async (path, extra = {}) => { const r = await fetch(`https://${code}.goatcounter.com/api/v0/${path}?` + new URLSearchParams({ ...q, ...extra }), { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
    if (!r.ok) { const e = new Error(`GoatCounter said ${r.status}: ${(await r.text()).slice(0, 300)}`); e.gc = true; throw e; } return r.json(); };
  const out = { configured: true, code, start: q.start, end: q.end };
  try {
    const [total, hits] = await Promise.all([gc('stats/total'), gc('stats/hits', { limit: 100 })]);
    out.total = total;
    const rows = [], daily = {};
    for (const h of hits.hits || []) {
      rows.push({ path: h.path || '', title: h.title || '', event: !!h.event, count: count(h) });
      for (const d of h.stats || []) if (!h.event) daily[d.day] = (daily[d.day] || 0) + (d.daily || 0);
    }
    out.pages = rows.filter(r => !r.event).sort((a, b) => b.count - a.count);
    out.events = rows.filter(r => r.event).sort((a, b) => b.count - a.count);
    out.daily = Array.from({ length: days }, (_, i) => { const d = iso(new Date(+start + i * day)); return { day: d, count: daily[d] || 0 }; });
    const keys = ['toprefs', 'locations', 'browsers', 'systems', 'sizes', 'campaigns'];
    const res = await Promise.all(keys.map(k => gc('stats/' + k, { limit: 20 }).catch(() => ({ stats: [] }))));
    keys.forEach((k, i) => { out[k] = (res[i].stats || []).filter(s => count(s) > 0)
      .map(s => ({ name: s.name || SIZES[String(s.id)] || (k === 'toprefs' ? '(direct)' : String(s.id || 'Unknown')), id: s.id, count: count(s) })); });
  } catch (e) { out.error = e.gc ? e.message : 'Could not reach GoatCounter: ' + e.message; }
  return out;
}
async function siteCode(env) {
  try { const s = JSON.parse(await rawText(env, 'content/site.json') || '{}'); return (s.analytics || {}).goatcounter || ''; } catch { return ''; }
}

// ---------------------------------------------------------------- what changed since the last publish (drafts vs main)
const LABELS = { title: 'Title', slug: 'Address', kind: 'Type', fq: 'Station', tag: 'Tag', role: 'Role', year: 'Year', client: 'Client', industry: 'Industry', did: 'What I did',
  headline: 'Headline', blurb: 'Summary', stat: 'Headline number', cover: 'Cover picture', story: 'Overview', run: 'Opening run', statement: 'Closing statement', shots: 'Screens',
  exp: 'Feature notes', impact: 'Impact', problem: 'Problem', goal: 'Goal', impactNote: 'How impact was measured', heroVideo: 'Opening video', heroPoster: 'Video poster',
  brandVer: 'Brand page sections', type: 'Typefaces', colors: 'Brand colours', hidden: 'Hidden', category: 'Category', images: 'Picture', bg: 'Background colour', dark: 'Dark picture',
  desc: 'Project info', case: 'Part of case study', credits: 'Credits', link: 'Opens', layout: 'Layout page', where: 'Where', what: 'Description', years: 'Years', statLabel: 'Number label',
  stat2: 'Second number', stat2Label: 'Second number label', name: 'Name', tech: 'Made with', sub: 'Under the heading', tools: 'Tools', chapters: 'Chapters' };
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isMedia = v => typeof v === 'string' ? MEDIA_RE.test(v) : isObj(v) && ('video' in v || 'color' in v);
function short(v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length)) return '';
  if (typeof v === 'string') return v.replace(/<br\s*\/?>/g, ' / ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v) && v.every(x => typeof x === 'string')) return v.map(short).join(' · ');
  return JSON.stringify(v).slice(0, 300);
}
function diff(a, b, path, out) {
  if (eq(a, b)) return;
  if (isMedia(a) || isMedia(b)) { out.push({ field: path, media: true, before: a, after: b }); return; }
  if (isObj(a) && isObj(b)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!k.startsWith('_')) diff(a[k], b[k], [...path, k], out); return; }
  if (Array.isArray(a) && Array.isArray(b) && [...a, ...b].some(x => Array.isArray(x) || isObj(x) || isMedia(x))) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff(a[i] ?? null, b[i] ?? null, [...path, i], out); return;
  }
  out.push({ field: path, media: false, before: short(a), after: short(b) });
}
function label(P) {
  if (P[0] === 'images') return { src: 'Picture', video: 'Video', ratio: 'Shape' }[P[P.length - 1]] || 'Picture';
  if (P[0] === 'shots' && P.length >= 2) return `Screen ${P[1] + 1}` + (P.length > 2 && typeof P[2] === 'number' && P[2] < 4 ? ' › ' + ['Picture', 'Label', 'Where', 'Note'][P[2]] : '');
  if (P[0] === 'run' && P.length >= 2) return `Opening run › picture ${P[1] + 1}`;
  if (P[0] === 'story' && P.length >= 2) return 'Overview › ' + (P[1] === 0 ? 'heading' : P.length > 2 ? `paragraph ${P[2] + 1}` : 'paragraphs');
  if (P[0] === 'exp' && P.length >= 2) return 'Feature notes › ' + (P[1] === 0 ? 'heading' : P.length > 2 ? `note ${P[2] + 1}` + (P.length > 3 ? ' › ' + ['title', 'text'][P[3]] : '') : 'notes');
  if (P[0] === 'impact' && P[1] === 'stats' && P.length >= 3) return `Impact › number ${P[2] + 1}`;
  if (['credits', 'type', 'colors'].includes(P[0]) && P.length >= 2) return `${LABELS[P[0]]} › ${P[1] + 1}`;
  return P.map(p => typeof p === 'number' ? `#${p + 1}` : (LABELS[p] || p)).join(' › ') || 'Value';
}
async function changes(env) {
  const cmp = await sync(env);
  const files = cmp.files || [];
  const out = { groups: [], uploads: [], pages: 0 };
  // uploads waiting to go live (still on the drafts branch in the latest version)
  out.uploads = files.filter(f => f.status === 'added' && f.filename.startsWith('assets/') && MEDIA_RE.test(f.filename)).map(f => f.filename);
  const touched = new Set(files.filter(f => /^content\/\w+\.json$/.test(f.filename)).map(f => f.filename.slice(8, -5)));
  const both = {};
  await Promise.all([...touched].map(async n => {
    const [o, c] = await Promise.all([rawText(env, `content/${n}.json`, 'main'), rawText(env, `content/${n}.json`, DRAFT)]);
    both[n] = [JSON.parse(o || '{}'), JSON.parse(c || '{}')];
  }));
  const groups = [];
  const thumb = x => { for (const k of ['cover', 'images']) { let v = x[k]; if (k === 'images' && v && v.length) v = v[0].video || v[0].src; if (v) return v; } return null; };
  const collection = (name, listkey, key, titleOf, lab, link) => {
    if (!both[name]) return;
    const old = both[name][0][listkey] || [], cur = both[name][1][listkey] || [];
    const om = new Map(old.map((x, i) => [key(x, i), x])), nm = new Map(cur.map((x, i) => [key(x, i), x]));
    const items = [];
    for (const [k, x] of nm) {
      if (!om.has(k)) items.push({ status: 'added', title: titleOf(x), thumb: thumb(x), link: link ? link(x) : null, fields: [] });
      else { const d = []; diff(om.get(k), x, [], d); if (d.length) items.push({ status: 'edited', title: titleOf(x), thumb: thumb(x), link: link ? link(x) : null, fields: d.map(f => ({ ...f, field: label(f.field) })) }); }
    }
    for (const [k, x] of om) if (!nm.has(k)) items.push({ status: 'removed', title: titleOf(x), thumb: thumb(x), fields: [] });
    const oo = old.map((x, i) => key(x, i)).filter(k => nm.has(k)), co = cur.map((x, i) => key(x, i)).filter(k => om.has(k));
    if (!eq(oo, co)) items.push({ status: 'reordered', title: 'New order', fields: [{ field: 'Order', media: false, before: old.filter((x, i) => nm.has(key(x, i))).map(titleOf).join(' · '), after: cur.filter((x, i) => om.has(key(x, i))).map(titleOf).join(' · ') }] });
    if (items.length) groups.push({ section: lab, items });
  };
  collection('cases', 'cases', (x, i) => x.slug || `#${i}`, x => x.title || '', 'Case studies', x => (x.kind === 'Brand' ? 'brand' : 'case') + '.html#' + (x.slug || ''));
  collection('designs', 'projects', (x, i) => x.title || `#${i}`, x => x.title || '', 'Designs', () => 'designs.html');
  collection('about', 'chapters', x => (x.where || '') + '|' + (x.role || ''), x => [x.where, x.role].filter(Boolean).join(' · '), 'About', () => 'about.html');
  collection('engineering', 'tools', (x, i) => x.name || `#${i}`, x => x.name || '', 'Engineering', () => 'engineering.html');
  for (const [name, lab, pg] of [['engineering', 'Engineering page', 'engineering.html'], ['projects', 'Projects page', 'projects.html'], ['site', 'Settings', null]]) {
    if (!both[name]) continue;
    const strip = o => { const c = { ...o }; delete c.tools; return c; };
    const d = []; diff(strip(both[name][0]), strip(both[name][1]), [], d);
    if (d.length) groups.push({ section: lab, items: [{ status: 'edited', title: lab, link: pg, fields: d.map(f => ({ ...f, field: label(f.field) })) }] });
  }
  for (const [name, lab, med] of [['text', 'Page text', false], ['media', 'Pictures & videos', true]]) {
    if (!both[name]) continue;
    const [old, cur] = both[name], items = [];
    for (const pg of [...new Set([...Object.keys(old), ...Object.keys(cur)])].sort()) {
      const o = old[pg] || {}, n = cur[pg] || {}, f = [];
      for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) if (o[k] !== n[k]) f.push({ field: med ? '' : k, media: med, before: o[k] || k, after: n[k] || k });
      if (f.length) { const t = pg.replace('.html', '').replace('index', 'home'); items.push({ status: 'edited', title: t.charAt(0).toUpperCase() + t.slice(1), link: pg, fields: f }); }
    }
    if (items.length) groups.push({ section: lab, items });
  }
  out.groups = groups;
  out.total = groups.reduce((s, g) => s + g.items.length, 0) + out.uploads.length;
  return out;
}
