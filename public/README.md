# public/

Anything you put in this folder is served directly at the site root.

Drop a photo in here, e.g. `public/portrait.jpg`, and it's reachable at
`/portrait.jpg` — no import, no build step. In code, reference it as
`/portrait.jpg` (leading slash, no `public` in the path).

Good spots to use a real photo once you have one:

- **Portrait** (About section) — replace the `PORTRAIT — the magician,
  low key (4:5)` placeholder box in `app/page.tsx` (`About` component)
  with an `<img src="/your-photo.jpg" ... />` or Next's `<Image>`.
- **Reel** (The Reel section) — same idea for the
  `REEL — live performance (16:9)` placeholder, or swap in a real video
  by setting `HERO_VIDEO_SRC` near the top of `app/page.tsx` for the
  hero, and doing the same for the Reel section's placeholder.

Keep filenames lowercase, no spaces (use `-` instead) — e.g.
`headshot-2026.jpg`, not `Headshot 2026.jpg`.
