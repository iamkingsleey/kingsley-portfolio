# Inbox · one-time setup (about 10 minutes)

Messages from the site (contact, shop requests, feedback) are kept by a small Cloudflare Worker until the CMS reads them.
It runs on Cloudflare's free plan. You only do this once.

## In the Cloudflare dashboard (no terminal needed)

1. **Workers & Pages → Create → Create Worker.** Name it `kingsley-inbox`, press Deploy, then **Edit code**.
   Replace everything with the contents of `worker.js` from this folder and press **Deploy**.
2. **Storage & Databases → KV → Create a namespace** called `kingsley-inbox`.
3. Back in your Worker: **Settings → Bindings → Add → KV namespace.** Variable name `INBOX`, namespace `kingsley-inbox`.
4. **Settings → Variables and Secrets → Add:**
   - `KEY` as a **Secret**: a long random password (make one with a password manager). Keep it: the CMS needs it.
   - `ORIGINS` as **Text**: `https://iamkingsleey.com,https://www.iamkingsleey.com,https://iamkingsleey.github.io`
5. Copy the Worker's address from its overview page (it looks like `https://kingsley-inbox.<you>.workers.dev`).

## In the CMS

**Settings → Inbox:** paste the Worker address, press Save & rebuild, then paste the same `KEY` into
"Inbox key" and press Save key. Publish, and the site starts sending to the inbox.

## Or with the terminal

```
cd cms/inbox
npx wrangler login
npx wrangler kv namespace create INBOX        # paste the id it prints into wrangler.toml
npx wrangler secret put KEY                   # type your long random key
npx wrangler deploy                           # prints the Worker address
```

Nothing is lost if the Worker is down or not set up yet: the site falls back to opening an email, as it does today.
