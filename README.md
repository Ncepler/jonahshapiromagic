# Jonah Shapiro — magician site

Next.js (App Router) + TypeScript + Tailwind CSS + [motion](https://motion.dev).

A one-page site for Jonah Shapiro, a close-up magician & mentalist.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — lint

## Structure

- `app/page.tsx` — the whole one-page site (hero, experience, trick of the
  day, testimonials, about, venues, booking form, footer)
- `app/MagicianCursor.tsx` — scoped custom cursor used only on this page
- `app/layout.tsx` — root layout, loads the Playfair Display + Inter Tight
  fonts referenced by the page
- `lib/hooks.ts` — small shared hooks (`useCanHover`)
