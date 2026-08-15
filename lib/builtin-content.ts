// Canonical built-in templates + snippets (Groups 4 & 5). These get seeded
// as real rows in `custom_templates` / `snippets` the first time each table
// is empty (see lib/myevents-data.ts) — the schema has no is_builtin flag,
// so instead each seed row gets a fixed, hardcoded id (below) rather than a
// database-generated one. That fixed id is what the UI checks against to
// decide whether a card gets a "•••" edit/delete menu — robust even if
// Jonah renames a built-in, unlike matching on title text.

export const BUILTIN_TEMPLATE_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
] as const;

export const BUILTIN_TEMPLATES: Array<{ id: string; title: string; body: string; sort_order: number }> = [
  {
    id: BUILTIN_TEMPLATE_IDS[0],
    sort_order: 0,
    title: "Confirming — I'm available",
    body: `Hey {{name}},

Thanks for reaching out. That date works for me — I'd love to be part of it.

Based on what you've told me, here's what I'd suggest and what it would run. Let me know if that sounds right and I'll get you locked in on the calendar.

Talk soon,
Jonah`,
  },
  {
    id: BUILTIN_TEMPLATE_IDS[1],
    sort_order: 1,
    title: "Declining — not available",
    body: `Hey {{name}},

Thanks so much for thinking of me for this. Unfortunately I'm already booked that date and I can't make it work.

If your plans shift or you have another event coming up, I'd love to hear from you.

All the best,
Jonah`,
  },
  {
    id: BUILTIN_TEMPLATE_IDS[2],
    sort_order: 2,
    title: "Need more info",
    body: `Hey {{name}},

Thanks for reaching out. Before I send you a real quote, I want to make sure I've got the picture right.

A few quick things:
— Roughly how many guests?
— Is there a specific window you want me performing, or is it flexible?
— Anything about the venue I should know?

Once I have that, I'll come back with a clear number.

Jonah`,
  },
  {
    id: BUILTIN_TEMPLATE_IDS[3],
    sort_order: 3,
    title: "Following up — no reply yet",
    body: `Hey {{name}},

Just circling back on this one in case my last note got buried. If the date's still on and you want to move forward, let me know and I'll hold it.

If you've gone in another direction, no worries at all — just wanted to close the loop.

Jonah`,
  },
];

export const BUILTIN_SNIPPET_IDS = [
  "00000000-0000-4000-8000-000000000101",
  "00000000-0000-4000-8000-000000000102",
  "00000000-0000-4000-8000-000000000103",
  "00000000-0000-4000-8000-000000000104",
  "00000000-0000-4000-8000-000000000105",
  "00000000-0000-4000-8000-000000000106",
] as const;

export const BUILTIN_SNIPPETS: Array<{ id: string; label: string; body: string; sort_order: number }> = [
  {
    id: BUILTIN_SNIPPET_IDS[0],
    sort_order: 0,
    label: "Price for the night",
    body: "For an event like this, I'd be at $___ total. That covers the full set, all my materials, and travel.",
  },
  {
    id: BUILTIN_SNIPPET_IDS[1],
    sort_order: 1,
    label: "Deposit request",
    body: "To lock in the date, I ask for a 50% deposit up front, with the rest due the day of. I can send an invoice — what email works best?",
  },
  {
    id: BUILTIN_SNIPPET_IDS[2],
    sort_order: 2,
    label: "Confirming details",
    body: "Quick confirmation: I'm arriving around ___, planning to perform from ___ to ___, and I'll be in ___. Let me know if any of that needs to shift.",
  },
  {
    id: BUILTIN_SNIPPET_IDS[3],
    sort_order: 3,
    label: "How many guests?",
    body: "Roughly how many people are you expecting? It helps me plan out the set.",
  },
  {
    id: BUILTIN_SNIPPET_IDS[4],
    sort_order: 4,
    label: "Venue address",
    body: "Can you send me the full venue address and the name of the point of contact I should ask for when I arrive?",
  },
  {
    id: BUILTIN_SNIPPET_IDS[5],
    sort_order: 5,
    label: "Thanks after event",
    body: "Thank you again for having me last night — genuinely a great room. If you have any photos or clips, I'd love to see them. And if any of your guests are looking for a magician down the line, I'd appreciate the introduction.",
  },
];
