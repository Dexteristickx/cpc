# CPC Redesign — Generation & Optimization Guidelines

House rules for anyone maintaining or extending this redesign. Goal: keep the site fast, safe, and consistent as content grows.

---

## 1. Performance budget

- **Page weight ≤ 1.2 MB** (excluding YouTube thumbnails, which Google serves).
- **Images:** WebP where supported; JPG acceptable for photo archives.
  - Pastor portraits ≤ 120 KB each (the old 315 KB photo is the ceiling we lowered).
  - Gallery/library photos ≤ 250 KB, max dimension 1600 px.
  - Compress with Squoosh/TinyPNG before upload.
- **Never hotlink big files** into the homepage; the `.m4a` sermon audio (was 800 KB+ at ~16 KB/s) streams only when a visitor presses play (`preload="none"` is already set — keep it).
- **Fonts:** exactly two families — Fraunces (headings) + Inter (body) — via Google Fonts with `display=swap`. Don't add more.
- All fetches in `main.js` carry a 10s timeout and a fallback — keep that pattern for any new API work (the heritage server can be slow; the page must never freeze).

## 2. Media generation rules (if AI tools are used)

- Style: warm, documentary, faith-and-family feel; colour grade toward violet/green brand tones; **no stock-looking white-model photos** — this is an Ibadan church; people in imagery must reflect the congregation.
- Never generate fake pastors/leaders — use real photography only for people; AI imagery only for abstract backgrounds/textures.
- Export WebP, strip metadata, follow §3 naming.

## 3. File & URL hygiene

- **No spaces in filenames** (32 of the old gallery images had spaces like `CHUR 48.jpg`). Use `kebab-case.jpg`. The new code encodes old space-named files automatically, but don't add new ones.
- One asset = one optimized copy in `assets/` (or the media library), referenced everywhere — no duplicate uploads.
- Clean, extensionless URLs (`/sermons`, not `/sermons.html`) — `.htaccess` handles the mapping; link pages the same way the nav does in this package on deploy (both styles resolve).

## 4. SEO & metadata

- Every page keeps: unique `<title>` ≤ 60 chars, meta description ≤ 160 chars, canonical URL, one `<h1>`.
- Keep the GA tag (`G-J151XXVG7D`) and Church JSON-LD on all pages (already wired).
- Update `sitemap.xml` `<lastmod>` when a page materially changes; resubmit in Google Search Console after deploy.
- OG image: use the logo or a real gathering photo (1200×630) when you have one.

## 5. Accessibility baseline

- Alt text on every image (descriptive, not "image1").
- Colour contrast: body text on white ≥ 4.5:1 — the palette already passes; keep white text off light-green backgrounds.
- Icon buttons need `aria-label` (already in place — don't remove).
- Keyboard: lightbox closes with `Esc`; menus are real links; keep focus borders visible.

## 6. Content rules

- **Events:** add via the Control Center — the site auto-hides past events and drives the announcement bar. Never hardcode guest-speaker/promo text into the bar again.
- **Sermons:** speakers + series filters build themselves from `/api/sermons` data — fill in `speaker` and `series` properly when uploading and everything works; `<unknown>` entries are hidden from filters by design.
- **Gallery:** give each album a real category/caption/date in the Control Center; tabs generate from the data (empty categories simply don't appear).
- **Giving:** bank details live in ONE place (`giving.html` .bank card). If they ever change, update there and in the receipt email template together. Keep the "no apostrophe" note while the account name stays that way.
- Phone/email/address appear in the shared footer — update consistently on all pages (or better: ask us about converting the footer to a shared include).

## 7. Security non-negotiables

- Card details must **never** be collected by this site directly — only inside Paystack/Flutterwave's hosted checkout. (Why the old card form was removed.)
- `setup-telegram.php` stays deleted; `telegram-webhook.php` accepts POST only (see `.htaccess`).
- `/admin/` + Control Center: authentication on, and ideally IP-allowlisted.
- Keep HTTPS forced; forms should always `POST` — never put phone numbers or bank data in URLs.

## 8. Deploy checklist

1. Backup first · 2. Upload to `/v2/` staging · 3. Run README §7 checklist · 4. Leadership sign-off · 5. Move to root (keep every file listed in README §4) · 6. Test live with real APIs · 7. Resubmit sitemap in Search Console.
