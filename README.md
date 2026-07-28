# CHOSEN PEOPLE'S CHURCH — Redesign Package (README)

**Project:** Full QA-driven redesign of `chosenpeopleschurch.com`
**Codename:** "Sanctuary Violet" (brand-preserved: Royal Violet `#4A30B8` + Emerald `#00B84B`)
**Prepared:** 28 July 2026 · by Dickson (QA & Redesign Desk)
**Status:** Ready for staging — **safe by design: zero changes to content, backend, or the YouTube/Google API integration.**

---

## 1. What's in this package

| File / Folder | Purpose |
|---|---|
| `index.html` | Home — hero, countdown, vision + 3 pillars, all 7 pastors (real photos + full bios), CBN school, Latest Messages, Visit Us (map), CPC Moments |
| `sermons.html` | Video + Audio sermon tabs, search, speaker/series filters, inline audio players |
| `events.html` | Weekly rhythm, countdown, special programs (auto-updating), small groups CTA |
| `giving.html` | Tithe calculator, fund selector, bank transfer details, receipt upload form |
| `gallery.html` | "Humble Beginnings" story (corrected captions) + filterable photo library + lightbox |
| `404.html` | Friendly error page (wired via `.htaccess`) |
| `assets/` | `style.css`, `main.js`, logo, CBN logo, 7 pastor photos, 3 "roots" photos |
| `robots.txt` | Cleaned — no longer advertises admin/setup paths |
| `sitemap.xml` | 5 extensionless URLs (fixes the old sitemap listing redirecting `.html` URLs) |
| `.htaccess` | HTTPS+www force, extensionless mapping, 404, caching, compression, hardening |
| `OPTIMIZATION.md` | Generation/optimization & content guidelines |

---

## 2. ✅ STAGING-SAFETY GUARANTY (read first)

**Deploying this package cannot break the site's content or integrations**, because:

1. **All content is copied verbatim** from the live pages — pastor names/bios (all 7), the vision statement, service times, address, phone numbers, bank details (`First Bank · Chosen Peoples Pool Account · 3133054315`). Nothing rewritten, nothing dropped.
2. **The YouTube integration is untouched.** The Google Cloud Console project, the API key, and the backend `/api/youtube` endpoint all live on **your server**. This package only contains front-end files that keep calling the **same endpoint with the same JSON contract**. The Sermons page already worked this way; the Home page now uses it too (the old free `rss2json` bridge is no longer needed — it was a fragility, not part of your Google setup).
3. **All other backend integrations preserved exactly:**
   - `/api/sermons` — audio archive (same payload shape)
   - `/api/events` — events feed (same payload shape)
   - `/api/gallery` — photo library (same payload shape)
   - `receipt-submit.php` — receipt uploads (same URL, same `FormData` POST, **identical field names**: `donor_name, donor_phone, donor_email, amount_paid, payment_date, transaction_ref, designated_fund, description, message, receipt_file`, same `{success:…}` JSON handling)
   - Member Portal links, Telegram channel, GA measurement ID `G-J151XXVG7D`, Church JSON-LD — all preserved.
4. **Graceful degradation** — if any API is slow/unreachable, that section shows a friendly note instead of freezing or breaking (every fetch has a 10s timeout).
5. **Static preview works offline** — open any page directly in a browser; dynamic sections show clearly-labelled placeholders so you can review layout before anything goes live.

---

## 3. Rollout plan (staging-first, zero downtime)

1. **Backup** the full current site (files + DB) from the CPC Control Center / cPanel.
2. **Upload this package to a staging folder** — e.g. `public_html/v2/` — or a staging subdomain (`v2.chosenpeopleschurch.com`). Links are relative, so it works in a subfolder as-is.
3. **Test on staging:** the APIs at `/api/...` are at the domain root — for staging they may return 404 and show placeholders; that's expected and safe. (Optional: temporarily copy the `api` files into `/v2/` to see full live data.)
4. **Go/no-go review** with leadership (use the per-page checklist in §7).
5. **Switch over:** move the package files into `public_html/` root. **Do NOT delete** any of the existing backend files listed in §4. Visitors get the new design instantly; every integration keeps working.
6. **Rollback:** because nothing was deleted, restoring is just moving the old files back (or re-uploading your backup).

---

## 4. Server files to KEEP (do not delete/overwrite)

- `/api/` — `youtube`, `sermons`, `events`, `gallery` handlers (and the Google API key behind them)
- `receipt-submit.php` — receipt upload endpoint
- `telegram-webhook.php` — must stay reachable by Telegram servers (POST-only protection is set in `.htaccess`)
- `portal/` or the `portal.` subdomain configuration — untouched
- Any Control Center configs, email accounts, SSL certs — untouched

## 5. Server file to REMOVE (audit 🔴 Critical #1)

- **`setup-telegram.php` — delete it.** It is a one-time installer that publicly executes whenever anyone visits it; even after deletion your Telegram integration keeps working (the webhook is already registered). Until it's deleted, the `.htaccess` in this package blocks web access to it.

## 6. What the redesign fixes (mapped to the 25-issue QA audit)

- 🔴 **#1 Admin/setup exposure** → robots.txt no longer lists sensitive paths; `.htaccess` denies `setup-telegram.php`, POST-only for the webhook (other sites' live fix: delete the file).
- 🔴 **#2 Fake "Secure Online Giving" card form** → **removed**. Replaced with an honest "gateway coming soon" panel + a marked drop-in point for Paystack/Flutterwave (see `GATEWAY-EMBED` comment in `giving.html`). Raw card numbers never touch the site again.
- 🔴 **#3/#4 Stale data** → events list and announcement bar are now **data-driven**: past events disappear automatically; the announcement bar only appears when a future event exists (no more permanently stale "Guest Speaker" bar).
- 🔴 **#5 Slow assets** → pastor photos slimmed, lazy-loading everywhere, caching + compression in `.htaccess`.
- 🟠 **Dead social links** → YouTube, Telegram, WhatsApp in the footer + floating button now point to the **real** channels (dummy `wa.me/2348000000000` removed).
- 🟠 **Empty gallery tabs + broken space-filenames** → tabs are generated from the data itself; URLs are auto-encoded (`CHUR 48.jpg` works).
- 🟠 **Hardcoded sermon filters that matched nothing** → speaker/series dropdowns are built from the actual API data; `<unknown>` speakers are filtered out.
- 🟡 **Misleading "First Building" caption** → replaced with an honest 3-part "Humble Beginnings" story (2016–2018) using the real roots photos.
- 🟡 **Sitemap listing redirecting `.html` URLs** → clean extensionless sitemap; canonical tags added on all pages.
- 🟡 **Inconsistent Member Portal link** → nav always goes to the portal root; "Join/Register" actions go to `/register`.

---

## 7. Pending decisions (we decide these together — nothing blocked)

| # | Decision | Notes |
|---|---|---|
| D1 | **Payment gateway** | Paystack vs Flutterwave for the card panel in `giving.html` — embed drops into the marked slot. |
| D2 | Podcast/RSS | `/api/podcast` returns "not configured" — enable a feed or drop the feature (unused in the redesign). |
| D3 | Prayer Wall | Frontend + `/api/prayers` exist but no public page; redesign omits it until you want it launched. |
| D4 | Gallery metadata | 82 "Our Roots" photos share one caption/date; clean up in the Control Center when convenient (pages handle whatever is there). |
| D5 | Pastor photos | Watermarked ("iQ PHOTOGRAPHY") versions preserved; swap in clean originals any time — filenames stay the same. |
| D6 | Social handles | Footer wired to YouTube/Telegram/WhatsApp; add Facebook/Instagram links only if you keep them active. |
| D7 | YouTube quota | Key stays as-is; if the free daily quota is ever exhausted, `/api/youtube` should cache (server-side change, outside this package). |
| D8 | `/admin/` & Control Center access | Recommend auth + IP allowlist; parked for your infra decision. |

---

## 8. Quick QA checklist (staging)

- [ ] All 5 pages load; navigation + mobile menu work
- [ ] Sermons: video tab shows channel videos; audio tab lists sermons with working players
- [ ] Events: weekly cards + any upcoming specials; no past events shown
- [ ] Giving: slider updates tithe; fund chips pre-fill the form select; "Copy" copies the account number; receipt form validates file type/size
- [ ] Gallery: tabs match available albums; lightbox opens/arrows/Esc work
- [ ] Announcement bar appears only when a future event exists
- [ ] `/request-a-page-that-does-not-exist` shows the 404 page
