import { Section, SectionHeading } from "./Section";
import { TEXT_MUTED } from "./theme";

// Placeholder — Group 5 replaces this with the pill grid of one-liners.
export function SnippetsSection() {
  return (
    <Section id="snippets">
      <SectionHeading eyebrow="Quick Snippets" heading="One-liners." />
      <p className="text-[14px]" style={{ color: TEXT_MUTED }}>
        Coming in Group 5.
      </p>
    </Section>
  );
}
