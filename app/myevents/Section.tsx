import type { ReactNode } from "react";
import { ACCENT, BORDER, DISPLAY, eyebrowClass, TEXT, wrap } from "./theme";

/** Shared vertical rhythm + horizontal wrap for every dashboard section
 * (Templates, Snippets, Calendar, Bookings) — a hairline top border marks
 * where one section ends and the next begins, echoing the public site's
 * restrained use of BORDER as "a whisper, not a shout." */
export function Section({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} className="py-10 md:py-14" style={{ borderTop: `1px solid ${BORDER}` }}>
      <div className={wrap}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  heading,
  right,
}: {
  eyebrow: string;
  heading: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className={eyebrowClass} style={{ color: ACCENT }}>
          {eyebrow}
        </span>
        <h2 className="mt-2 text-[26px] leading-[1.1] md:text-[32px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
          {heading}
        </h2>
      </div>
      {right}
    </div>
  );
}
