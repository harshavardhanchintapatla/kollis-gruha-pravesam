# Griha Pravesam · The Kolli Family

An immersive, mobile-first digital invitation for the Griha Pravesam (house-warming) on
**Wednesday, 14 October 2026, 7:57 AM**. Guests arrive at a decorated South Indian doorway,
open the doors with "Enter With Blessings", and walk through the invitation, muhurtham,
ceremony timeline, location, family blessing and a floral rangoli.

Plain HTML, CSS and vanilla JavaScript. No build step, no frameworks, no dependencies other
than the Google Fonts stylesheet. It runs as a static site on GitHub Pages.

```
index.html      page structure and all SVG artwork
styles.css      design tokens, scenes, animation
script.js       EVENT_CONFIG (edit this) + behaviour
.nojekyll       tells GitHub Pages to serve files as-is
assets/
  images/       favicon.svg, social-preview.jpg, (optional) location-qr.png
  audio/        mangala-vadyam.mp3  <- add your music here
  fonts/        reserved for self-hosted fonts (empty by default)
```

---

## 1 · Publish on GitHub Pages

- **Repository:** https://github.com/harshavardhanchintapatla/kollis-gruha-pravesam
- **Production Pages URL:** https://harshavardhanchintapatla.github.io/kollis-gruha-pravesam/

To get the code:

```bash
git clone https://github.com/harshavardhanchintapatla/kollis-gruha-pravesam.git
```

Publishing steps:

1. **Repository:** it lives at `harshavardhanchintapatla/kollis-gruha-pravesam` on github.com
   (Public, no template files).
2. **Push the project** from this folder (the `origin` remote already points at that repository):
   ```bash
   git add .
   git commit -m "Griha Pravesam invitation"
   git branch -M main
   git push -u origin main
   ```
3. **Enable Pages:** repository → *Settings* → *Pages* → *Build and deployment* →
   Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → *Save*.
4. **Find the URL:** after a minute the Pages screen shows
   `https://harshavardhanchintapatla.github.io/kollis-gruha-pravesam/`. Open it on your phone to check.

All paths in the site are relative, so it works under the project path `/kollis-gruha-pravesam/`
without changes.

### Make the WhatsApp preview work

WhatsApp only shows a preview image when `og:image` is an **absolute** URL. In `index.html`
the `og:url`, `og:image`, `twitter:image` and `canonical` tags point at
`https://harshavardhanchintapatla.github.io/kollis-gruha-pravesam/`. If the final address ever
changes, update all of them together. WhatsApp caches previews, so test with a fresh message or add
`?v=2` to the shared link after changes.

---

## 2 · Things you will want to change

Everything personal lives in **`EVENT_CONFIG` at the top of `script.js`**.

| What | Where |
| --- | --- |
| Family name, host names | `family`, `hosts` |
| Date / time (also drives the countdown) | `eventDate` (YYYY-MM-DD), `ceremonyTime` (24 h HH:MM), `timezone`, `utcOffset` |
| Lunch time | `lunchTime` |
| Address lines | `address` (array, one line each) |
| **Google Maps link** | `mapUrl` |
| Location QR code | `qrImage` |
| Music file and volume | `audioFile`, `audioVolume` |

The countdown target is the explicit timestamp `2026-10-14T07:57:00+05:30`, built from
`eventDate` + `ceremonyTime` + `utcOffset`. It is a single fixed moment, so every guest sees
the same countdown to the Hyderabad ceremony whatever their device timezone or daylight-saving
rules. The displayed time (7:57 AM), weekday and date are all derived from the same values.
If you ever change `timezone`, also update `utcOffset` (the console warns if they disagree).

### Replace the Google Maps URL
In Google Maps open the flat/building → **Share** → **Copy link** → paste it into
`EVENT_CONFIG.mapUrl`. It is currently set to the family's Share link,
`https://maps.app.goo.gl/yj4yHt6Xrotjq1dcA`. The URL is stored once and applied to every
"Get Directions" button.

### Optional location QR code
Off by default: nothing is requested and nothing is shown. To use one, save a square image
(~500 px) as `assets/images/location-qr.png` and set `qrImage: "assets/images/location-qr.png"`.
It then appears under the Get Directions button (and hides itself if the file can't be loaded).

### Replace the music
Put your file at **`assets/audio/mangala-vadyam.mp3`** (or change `audioFile`).
- Music starts only after the guest taps *Enter With Blessings* (browsers require this).
- It loops at 35 % volume (`audioVolume`), and a small brass button (bottom-right)
  pauses/plays it. The guest's choice is remembered in their browser. Switching tabs pauses
  the music and resumes it on return, only if it was playing.
- Recommended: MP3, 128 kbps, 60–120 s of seamless loop (about 1–2 MB) so it loads quickly
  on mobile data. Use music you have the right to share.
- The file is requested only after the guest taps *Enter With Blessings*. If it is missing the
  site still works and the music button simply doesn't appear, but the browser console will log
  one 404, so **make sure the file is committed before deploying**. Set `audioFile: null` to run
  without music.
- The opening temple-bell is synthesised in the browser; no file is needed.

### Social preview image
`assets/images/social-preview.jpg` is a generated placeholder. Replace it with your own
artwork: **1200 × 630 px (1.91 : 1)**, JPG, under ~300 KB, with important content kept
inside the central 1000 × 500 px.

### Artwork, colours, fonts
- Colours and fonts are CSS variables at the top of `styles.css` (`--maroon`, `--brass`, `--f-display` …).
- All illustrations (doors, thoranam, lamps, house, rangoli) are inline SVG in `index.html`,
  so there are no image files to swap. Fonts (Cormorant Garamond, Libre Baskerville,
  Noto Serif Telugu) load from Google Fonts with a safe system fallback.
- Telugu wording is plain text in `index.html`; edit it directly.

---

## 3 · Before you deploy: checklist

- [ ] `assets/audio/mangala-vadyam.mp3` added (otherwise there is no music and one console 404)
- [x] `EVENT_CONFIG.mapUrl` set to the exact Google Maps *Share* link
- [ ] `og:url`, `og:image`, `twitter:image` and `canonical` in `index.html` match the live Pages URL
- [ ] `assets/images/social-preview.jpg` replaced if you want custom artwork (1200 × 630 px)
- [ ] Open the live link on a phone, tap *Enter With Blessings*, and check the music and map button

## 4 · Test locally

```bash
python -m http.server 8000
# open http://localhost:8000
```
(Opening `index.html` directly with `file://` also works, except that audio and the optional
QR check may be blocked by the browser.)

## Design notes

- Mobile first (checked at 360, 390, 412 and 430 px wide; no horizontal scroll), enhanced on desktop.
- Native scrolling is never hijacked; reveal animations use `IntersectionObserver` and only
  animate `opacity` and `transform`. Looping animations pause when their scene is off screen.
- `prefers-reduced-motion`: no falling petals, no parallax, no door swing (a soft cross-fade instead)
  and no looping decorative animation.
- The invitation is `inert` until the doors open, so keyboard and screen-reader users are not
  dropped into hidden content.
