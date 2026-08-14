import type { Metadata } from "next";
import { Playfair_Display, Inter_Tight } from "next/font/google";
import "./globals.css";

// Playbill serif for display type, quiet sans for body/UI — see app/page.tsx
// (§16b) for how these are used: var(--font-playfair) / var(--font-tight).
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shap Shufflz — Jonah Shapiro, Magician & Mentalist",
  description:
    "Jonah Shapiro, performing as Shap Shufflz — New York City close-up magic and mentalism for corporate events, holiday parties, weddings, and private parties.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${interTight.variable}`}>
      <body>{children}</body>
    </html>
  );
}
