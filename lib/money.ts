// Turning what someone typed into an amount. Shared by both earnings routes
// (app/api/earnings/*) — it can't live in either of them, because a Next.js
// route module is only allowed to export handlers and a short list of config
// fields, and exporting anything else fails the build.

/**
 * "$1,250.50" / "1250.5" / 1250.5 → 1250.5, and anything that isn't a usable
 * amount → null.
 *
 * The dashboard's amount field is plain text rather than type="number": a
 * number input is a spinner nobody wants on a phone, it swallows a typed "$"
 * without saying so, and it treats "1,250" as invalid. So the field takes
 * whatever Jonah types and this sorts it out.
 */
export function parseAmount(raw: unknown): number | null {
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : "";
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  // Rejects NaN and Infinity, and rules out negatives — this tracks what came
  // in, and an expense entered here would quietly drag every average down.
  if (!Number.isFinite(value) || value < 0) return null;
  // The column is numeric(12, 2): round to cents here, so what gets stored is
  // exactly what gets displayed back.
  return Math.round(value * 100) / 100;
}
