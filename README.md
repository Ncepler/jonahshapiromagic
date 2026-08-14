# Shap Shufflz — magician site

Next.js (App Router) + TypeScript + Tailwind CSS + [motion](https://motion.dev).

A one-page site for Jonah Shapiro, who performs as Shap Shufflz — a New York
City close-up magician & mentalist working across the tri-state area.

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

- `app/page.tsx` — the whole one-page site (hero, recently performed at,
  experience, trick of the day, pricing, FAQ, about, booking form,
  Instagram, footer)
- `app/MagicianCursor.tsx` — scoped custom cursor used only on this page
- `app/layout.tsx` — root layout, loads the Playfair Display + Inter Tight
  fonts referenced by the page
- `lib/hooks.ts` — small shared hooks (`useCanHover`)
