import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, EB_Garamond } from "next/font/google";
import "./globals.css";
// TEMPORARY (see app/UnderConstructionOverlay.tsx for rollback instructions):
import UnderConstructionOverlay from "./UnderConstructionOverlay";

// ── Type system ─────────────────────────────────────────────────────────────
// Three faces, one job each, and nothing on the site sets a font outside them.
// See app/page.tsx (HERO / DISPLAY / BODY) and app/myevents/theme.ts, which
// are the only two places that name these variables.
//
//   --font-hero     Cinzel Decorative — the marquee name in the hero, and only
//                   there. It has flourishes on the caps that are lovely once
//                   at 6rem and noise anywhere smaller.
//   --font-display  Cinzel — every other heading and section title. Roman
//                   inscriptional caps: theatrical, but it holds a line of
//                   type at 19px without turning into decoration.
//   --font-body     EB Garamond — body copy, labels, buttons, form fields, the
//                   dashboard. Chosen over Cormorant Garamond because the site
//                   runs a lot of 13–15px text on near-black, and Cormorant's
//                   hairline strokes disappear at that size against this
//                   background. EB Garamond keeps its weight.
//
// Cinzel and Cinzel Decorative are caps-only faces — lowercase renders as
// small caps — which is why headings can carry sentence-case copy and still
// read as a playbill. Neither has a true italic, so the two italic lines on
// the page (the hero tagline, the footer's closing line) are set in EB
// Garamond italic rather than a synthesized oblique.
const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hero",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jonah Shapiro (Shap Shufflz) — Magician & Mentalist",
  description:
    "Jonah Shapiro, also known as Shap Shufflz — close-up magic and mentalism across New York, New Jersey, and Connecticut. Corporate events, holiday parties, weddings, and private parties, from $150.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzelDecorative.variable} ${cinzel.variable} ${ebGaramond.variable}`}
    >
      <body>
        {/* TEMPORARY: overlay covers the real page below, which is still
            here untouched. Remove this line + the import above to go live. */}
        <UnderConstructionOverlay />
        {children}
      </body>
    </html>
  );
}
