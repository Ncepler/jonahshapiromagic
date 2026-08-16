"use client";

// What Jonah's made. Four numbers, no chart — at this volume a chart would be
// decoration around four values you can read directly, and the definitions
// (which the captions state outright) matter more than the shape of a line.
//
// Entry happens in the calendar above, not here: a payment belongs to a day, and
// the day is already on screen up there. This section only reports.

import { useMemo } from "react";
import type { Booking, Earning } from "@/lib/db-types";
import { Section, SectionHeading } from "./Section";
import {
  averageMonthly,
  averageWeekly,
  bucketCounts,
  formatMoney,
  repeatCustomerCount,
  sumAmounts,
} from "./earnings";
import { ACCENT, BG_ELEVATED, BORDER, DISPLAY, TEXT, TEXT_MUTED } from "./theme";

function Stat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-[4px] p-4" style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
        {label}
      </p>
      <p className="mt-2 text-[26px] leading-[1.1] md:text-[30px]" style={{ color: TEXT, fontFamily: DISPLAY }}>
        {value}
      </p>
      <p className="mt-1.5 text-[12px] leading-[1.4]" style={{ color: TEXT_MUTED }}>
        {caption}
      </p>
    </div>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function EarningsSection({ earnings, bookings }: { earnings: Earning[]; bookings: Booking[] }) {
  const stats = useMemo(() => {
    const { months, weeks } = bucketCounts(earnings);
    return {
      total: sumAmounts(earnings),
      monthly: averageMonthly(earnings),
      weekly: averageWeekly(earnings),
      months,
      weeks,
      repeats: repeatCustomerCount(bookings),
      entries: earnings.length,
    };
  }, [earnings, bookings]);

  return (
    <Section id="earnings">
      <SectionHeading eyebrow="Earnings" heading="What you've made." />

      {stats.entries === 0 ? (
        <p className="text-[14px] leading-[1.6]" style={{ color: TEXT_MUTED }}>
          Nothing logged yet. Click any day on the calendar above and put a number
          on it — the totals and averages here fill in from those.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total earned"
            value={formatMoney(stats.total)}
            caption={`Across ${plural(stats.entries, "entry", "entries")}.`}
          />
          <Stat
            label="Avg. month"
            value={formatMoney(stats.monthly)}
            caption={`Averaged over the ${plural(stats.months, "month", "months")} with something in them — months you didn't work aren't counted as zero.`}
          />
          <Stat
            label="Avg. week"
            value={formatMoney(stats.weekly)}
            caption={`Same rule, by week: ${plural(stats.weeks, "week", "weeks")} with earnings in them.`}
          />
          <Stat
            label="Repeat customers"
            value={String(stats.repeats)}
            caption="People with more than one booking, matched on email (or name, if there isn't one)."
          />
        </div>
      )}
    </Section>
  );
}
