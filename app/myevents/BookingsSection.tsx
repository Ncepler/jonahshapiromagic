import { Section, SectionHeading } from "./Section";
import { TEXT_MUTED } from "./theme";

// Placeholder — Group 7 replaces this with the Pending/Accepted/Archived
// tabbed list.
export function BookingsSection() {
  return (
    <Section id="bookings">
      <SectionHeading eyebrow="Bookings" heading="Every request." />
      <p className="text-[14px]" style={{ color: TEXT_MUTED }}>
        Coming in Group 7.
      </p>
    </Section>
  );
}
