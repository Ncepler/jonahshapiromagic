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

- `site-config.ts` — phone, email, and social handles. Several are still
  `TODO_` placeholders; see below.
- `app/page.tsx` — the whole one-page site (hero, where I've worked,
  experience, trick of the day, pricing, branded decks, FAQ, about, booking
  form, Instagram, footer)
- `app/api/book/route.ts` — receives the booking form and emails it
- `app/MagicianCursor.tsx` — scoped custom cursor used only on this page
- `app/layout.tsx` — root layout, loads the Playfair Display + Inter Tight
  fonts referenced by the page
- `lib/hooks.ts` — small shared hooks (`useCanHover`)

## Before launch

The contact details on the page are placeholders. Every one of them lives in
`site-config.ts` — replace the `TODO_` values there and the whole site picks
them up:

- `phone` / `phoneHref` — currently shows the fake 555 number
- `email` — currently shows `hello@jonahshapiro.com`
- `instagramHandle` / `instagramUrl` — currently shows `@jonahshapiro.magic`
- `bookingEmail` — where booking-form submissions get sent

Until a value is replaced the page keeps rendering the placeholder string it
shows today, so nothing looks broken in the meantime.

## Booking form email

`app/api/book/route.ts` sends submissions through [Resend](https://resend.com)
over plain HTTP — no SDK to install. It needs two environment variables plus
`bookingEmail` above:

```bash
RESEND_API_KEY=re_...
BOOKING_FROM_EMAIL=bookings@yourverifieddomain.com
```

`BOOKING_FROM_EMAIL` has to be on a domain verified with the provider, which
is why it's an env var rather than site copy.

If any of the three is missing, the route refuses to claim a delivery it
didn't make: in development it logs the submission and returns success so the
form's states can be exercised locally, and in production it returns 503 so
the form shows its error state and tells the visitor to text instead.
