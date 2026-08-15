import { Section, SectionHeading } from "./Section";
import { TEXT_MUTED } from "./theme";

// Placeholder — Group 4 replaces this with the full scrollable template-card
// row (arm/click-to-copy, add/edit/delete, drag reorder).
export function TemplatesSection() {
  return (
    <Section id="templates">
      <SectionHeading eyebrow="Email Templates" heading="Copy and send." />
      <p className="text-[14px]" style={{ color: TEXT_MUTED }}>
        Coming in Group 4.
      </p>
    </Section>
  );
}
