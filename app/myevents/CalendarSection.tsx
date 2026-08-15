import { Section, SectionHeading } from "./Section";
import { TEXT_MUTED } from "./theme";

// Placeholder — Group 6 replaces this with the month/week calendar grid.
export function CalendarSection() {
  return (
    <Section id="calendar">
      <SectionHeading eyebrow="Calendar" heading="The schedule." />
      <p className="text-[14px]" style={{ color: TEXT_MUTED }}>
        Coming in Group 6.
      </p>
    </Section>
  );
}
