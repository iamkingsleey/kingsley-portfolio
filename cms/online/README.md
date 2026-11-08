# Online CMS · iamkingsleey.com/admin

The same editor as the Mac CMS, from any browser. Free: Cloudflare Workers (free plan), GitHub Actions (free on a public repo), Resend (free plan).

- **Sign in:** /admin → "Email me a sign-in link" → the link goes to ADMIN_EMAIL (wrangler.toml) and works for 15 minutes. You stay signed in for 30 days on that browser. To sign everyone out, change SESSION_SECRET.
- **Save** writes content/*.json to the `cms` branch on GitHub (your drafts). Uploads go there too.
- **Publish** runs `.github/workflows/publish.yml`: it merges `cms` into `main`, runs `cms/build/build.py` and pushes. Cloudflare deploys `main` as usual (2 to 4 minutes in all).
- The Mac CMS keeps working. The online CMS picks up anything pushed from the Mac the next time it loads.

## Settings on Cloudflare (kingsley-portfolio → Settings → Variables and Secrets), all as Secret

| Name | What |
|---|---|
| GITHUB_TOKEN | GitHub fine-grained token: only this repository; Contents: Read and write; Actions: Read and write |
| SESSION_SECRET | any long random text |
| RESEND_KEY | a Resend API key (sending access) |
| GOATCOUNTER_TOKEN | GoatCounter API token with "Read statistics" (same as the Mac's, in cms/.secrets.json) |
| INBOX_KEY | the KEY secret of the kingsley-inbox Worker (same as the Mac's inbox_key, in cms/.secrets.json) |

The code is `cms/online/worker.js`; `wrangler.toml` runs it only for /admin and /site/ (every other address is a static file).
